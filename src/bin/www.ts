#!/usr/bin/env node

// CRITICAL: Load env vars BEFORE any other imports
import { loadEnvironment } from "../config/load-env";
loadEnvironment();

import { initializeEnvironment } from "../init/init";
import app from "../app";
import http from "node:http";
import { cpus } from "node:os";
import cluster from "node:cluster";

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

if (cluster.isPrimary) {
	initializeEnvironment()
		.then(() => {
			console.log("Environment initialization completed successfully.");
		})
		.catch(error => {
			console.error("Error during environment initialization:", error);
			process.exit(1);
		});
	console.log(`Process ${process.pid} started`);
	console.log(`Total CPU is ${noOfCpus}`);
	for (let i = 0; i < noOfCpus; i++) {
		cluster.fork();
	}
	cluster.on("exit", worker => {
		console.log(`Worker ${worker.process.pid} died. Restarting`);
		cluster.fork();
	});
} else {
	const server = http.createServer(app);
	server.on("error", onError);
	server.on("listening", () => onListening(server));
	server.listen(port);
}
