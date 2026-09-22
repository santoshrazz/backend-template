import express, { Express } from "express";
import helmet from "helmet";
import { globalErrorHandler, loggerMiddleware, validator, apiLimiter } from "./middleware";
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
	.use(express.urlencoded({ extended: true }))
	// Must come after body parsing — it validates req.body.
	.use(validator);

// authLimiter is exported for use on auth-type routes (login/register/etc.)
// once one exists — nothing in this template needs it yet.
app.use("/v1", apiLimiter, v1);

// Not wrapped in the /v1 router or `dispatcher` — it streams the file body
// and sets its own headers instead of returning JSON (see utils/upload.ts).
app.get("/files/:key", serveFile);

// Global Error Handler Middleware
app.use(globalErrorHandler);

export default app;
