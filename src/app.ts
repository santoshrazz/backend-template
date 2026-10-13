import express, { Express } from "express";
import helmet from "helmet";
import {
	globalErrorHandler,
	loggerMiddleware,
	validator,
	apiLimiter,
	dispatcher,
} from "./middleware";
import { serveFile } from "./utils";
import { healthCheck, readinessCheck } from "./controllers";
import v1 from "./routes";

console.log(`Running in ${process.env.NODE_ENV} mode`);
const BODY_LIMIT = process.env.BODY_LIMIT || "100kb";
const app: Express = express();
app.disable("x-powered-by");

// Behind a load balancer/ingress, req.ip (and so the rate limiter) only sees the
// proxy unless this is set. TRUST_PROXY: "true", a hop count ("1"), or a
// subnet/IP list ("10.0.0.0/8"). Unset = don't trust X-Forwarded-For.
const parseTrustProxy = (value?: string): boolean | number | string => {
	if (!value || value === "false") return false;
	if (value === "true") return true;
	return Number.isInteger(Number(value)) ? Number(value) : value;
};
app.set("trust proxy", parseTrustProxy(process.env.TRUST_PROXY));

// Middleware
app.use(helmet())
	.use(
		// Uploads go through multer, so JSON/urlencoded bodies stay small. Raise per
		// route if one needs more, or globally via BODY_LIMIT.
		express.json({ limit: BODY_LIMIT }),
	)
	.use(loggerMiddleware)
	.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }))
	// Must come after body parsing — it validates req.body.
	.use(validator);

// Probes live outside /v1 so the API rate limiter never throttles them.
// /health = liveness (process is up); /ready = readiness (dependencies reachable).
app.get("/health", (req, res, next) => dispatcher(req, res, next, healthCheck));
app.get("/ready", (req, res, next) => dispatcher(req, res, next, readinessCheck));

// authLimiter is exported for use on auth-type routes (login/register/etc.)
// once one exists — nothing in this template needs it yet.
app.use("/v1", apiLimiter, v1);

// Not wrapped in the /v1 router or `dispatcher` — it streams the file body
// and sets its own headers instead of returning JSON (see utils/upload.ts).
app.get("/files/:key", serveFile);

// Global Error Handler Middleware
app.use(globalErrorHandler);

export default app;
