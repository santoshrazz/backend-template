import { NextFunction, Request, Response } from "express";
import { logger, statusCodes } from "../utils";
import AppError from "../utils/errorHandler";

const { INTERNAL_SERVER_ERROR, BAD_REQUEST } = statusCodes;

export const globalErrorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
	let statusCode = err.statusCode || INTERNAL_SERVER_ERROR;
	let message = err.message || "Internal Server Error";

	// Handle AppError instances
	if (err instanceof AppError) {
		statusCode = err.statusCode;
		message = err.message;
	}

	// Handle other error types
	if (err.name === "CastError") {
		statusCode = BAD_REQUEST;
		message = "Invalid ID format";
	}

	if (err.name === "ValidationError") {
		statusCode = BAD_REQUEST;
		message = err.message;
	}

	const isDevelopment = process.env.NODE_ENV === "development";

	// Always log the full error (with stack) server-side; the client only gets
	// the stack in development.
	logger[statusCode >= 500 ? "error" : "warn"](
		{ err, requestId: (req as Request & { id?: string }).id },
		`${req.method} ${req.originalUrl} failed: ${err.message}`,
	);

	// 5xx messages can carry internals (SQL, hostnames, upstream errors), so
	// they're replaced with a generic one outside development. 4xx are intended
	// for the client and pass through.
	if (statusCode >= 500 && !isDevelopment) {
		message = "Internal Server Error";
	}

	res.status(statusCode).json({
		success: false,
		statusCode,
		message,
		...(isDevelopment && { stack: err.stack }),
	});
};
