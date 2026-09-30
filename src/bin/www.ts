#!/usr/bin/env node

// CRITICAL: Load env vars BEFORE any other imports
import { loadEnvironment } from "../config/load-env";
loadEnvironment();

import { initializeEnvironment } from "../init/init";
import { sequelize } from "../config";
import app from "../app";
import http from "node:http";
import { cpus } from "node:os";
import cluster from "node:cluster";
import { logger } from "../utils/logger";

const port = process.env.PORT || "3000";
const noOfCpus = process.env.NODE_ENV === "development" ? 1 : cpus().length;

// Handle server listen errors (e.g. port already in use)
const onError = (error: NodeJS.ErrnoException) => {
	if (error.syscall !== "listen") {
		throw error;
	}

	const bind = `Port ${port}`;
	switch (error.code) {
		case "EACCES":
			console.error(`❌ ${bind} requires elevated privileges`);
			process.exit(1);
			break;
		case "EADDRINUSE":
			console.error(`❌ ${bind} is already in use`);
			process.exit(1);
			break;
		default:
			throw error;
	}
};

const onListening = (server: http.Server) => {
	const addr = server.address();
	const bind = typeof addr === "string" ? `pipe ${addr}` : `port ${addr?.port}`;
	console.log(`Worker ${process.pid} listening on ${bind}`);
};

// Stop accepting new connections, let in-flight requests finish, close the
// DB pool, then exit. Forces exit after a grace period in case something
// (a stuck connection, a hung query) never lets `server.close` finish.
const gracefulShutdown = (server: http.Server) => {
	let started = false;
	return (signal: string, exitCode = 0) => {
		if (started) return;
		started = true;
		console.log(`Worker ${process.pid} received ${signal}, shutting down gracefully...`);

		const forceExit = setTimeout(() => {
			console.error(`Worker ${process.pid} did not shut down in time, forcing exit`);
			process.exit(1);
		}, 10_000); // ponytail: fixed 10s grace period, make configurable if slow requests need longer
		forceExit.unref();

		server.close(async closeError => {
			if (closeError)
				console.error(`Worker ${process.pid} error while closing server:`, closeError);

			try {
				await sequelize.close();
			} catch (dbError) {
				console.error(`Worker ${process.pid} error while closing DB connection:`, dbError);
			}

			clearTimeout(forceExit);
			process.exit(closeError ? 1 : exitCode);
		});
	};
};

// A stray rejection/exception leaves the process in an unknown state: log it
// with its stack, then exit (workers drain first; the primary respawns them).
const onFatal =
	(kind: string, shutdown?: (signal: string, exitCode: number) => void) => (err: unknown) => {
		logger.fatal({ err }, `${kind} in process ${process.pid}`);
		if (shutdown) shutdown(kind, 1);
		else process.exit(1);
	};

if (cluster.isPrimary) {
	// Init (DB connect + migrations) must finish before any worker starts
	// accepting traffic; initializeEnvironment exits the process on failure.
	console.log(`Process ${process.pid} started`);
	console.log(`Total CPU is ${noOfCpus}`);
	initializeEnvironment()
		.then(() => {
			console.log("Environment initialization completed successfully.");
			for (let i = 0; i < noOfCpus; i++) {
				cluster.fork();
			}
		})
		.catch(error => {
			console.error("Error during environment initialization:", error);
			process.exit(1);
		});

	let isShuttingDown = false;

	cluster.on("exit", worker => {
		// Don't respawn a worker that died because *we* told it to shut down —
		// only unexpected crashes get restarted.
		if (isShuttingDown) return;
		console.log(`Worker ${worker.process.pid} died. Restarting`);
		cluster.fork();
	});

	// Cluster doesn't forward signals to workers on its own — do it explicitly
	// so each worker runs its own graceful shutdown instead of being orphaned.
	// Registering this listener also disables Node's default "exit on signal"
	// behavior, so the primary must explicitly exit once its workers are gone
	// — otherwise it lingers in the background, still holding the port.
	const shutdownPrimary = (signal: NodeJS.Signals) => {
		if (isShuttingDown) return;
		isShuttingDown = true;
		console.log(`Process ${process.pid} received ${signal}, stopping workers...`);

		const workers = Object.values(cluster.workers ?? {}).filter(
			(worker): worker is NonNullable<typeof worker> => Boolean(worker),
		);

		if (workers.length === 0) {
			process.exit(0);
		}

		let remaining = workers.length;
		for (const worker of workers) {
			worker.once("exit", () => {
				remaining -= 1;
				if (remaining === 0) process.exit(0);
			});
			worker.process.kill(signal);
		}

		// ponytail: fixed 12s fallback in case a worker outlives its own 10s grace period
		setTimeout(() => process.exit(1), 12_000).unref();
	};
	process.on("SIGTERM", shutdownPrimary);
	process.on("SIGINT", shutdownPrimary);
	process.on("unhandledRejection", onFatal("unhandledRejection"));
	process.on("uncaughtException", onFatal("uncaughtException"));
} else {
	const server = http.createServer(app);
	server.on("error", onError);
	server.on("listening", () => onListening(server));
	server.listen(port);

	const shutdown = gracefulShutdown(server);
	process.on("SIGTERM", signal => shutdown(signal));
	process.on("SIGINT", signal => shutdown(signal));
	process.on("unhandledRejection", onFatal("unhandledRejection", shutdown));
	process.on("uncaughtException", onFatal("uncaughtException", shutdown));
}
