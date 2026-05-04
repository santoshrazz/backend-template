#!/usr/bin/env node

// CRITICAL: Load env vars BEFORE any other imports
import { loadEnvironment } from "../config/load-env";
loadEnvironment();

import { initializeEnvironment } from "../init/init";
import app from "../app";
import { cpus } from "node:os";
import cluster from "node:cluster";

const port = process.env.PORT;
const noOfCpus = process.env.NODE_ENV === "development" ? 1 : cpus().length;

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
	cluster.on("exit", () => {
		console.log(`Worker ${process.pid} died. Restarting`);
		cluster.fork();
	});
} else {
	app.listen(port, () => {
		console.log(`Worker ${process.pid} running on port ${port}`);
	});
}
