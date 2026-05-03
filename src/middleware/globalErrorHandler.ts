import { Request, Response } from "express";
import { statusCodes } from "../utils";
import AppError from "../utils/errorHandler";

const { INTERNAL_SERVER_ERROR, BAD_REQUEST } = statusCodes;

export const globalErrorHandler = (err: any, req: Request, res: Response) => {
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

	res.status(statusCode).json({
		success: false,
		statusCode,
		message,
		...(process.env.NODE_ENV === "development" && { stack: err.stack }),
	});
};
