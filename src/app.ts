import express, { Express } from "express";
import helmet from "helmet";
import { globalErrorHandler, loggerMiddleware } from "./middleware";
import { serveFile } from "./utils";
import v1 from "./routes";

console.log(`Running in ${process.env.NODE_ENV} mode`);
const app: Express = express();
app.disable("x-powered-by");

// Middleware
app.use(helmet())
	.use(
		express.json({
			limit: "100mb",
		}),
	)
	.use(loggerMiddleware)
	.use(express.urlencoded({ extended: true }));

app.use("/v1", v1);

// Not wrapped in the /v1 router or `dispatcher` — it streams the file body
// and sets its own headers instead of returning JSON (see utils/upload.ts).
app.get("/files/:key", serveFile);

// Global Error Handler Middleware
app.use(globalErrorHandler);

export default app;
