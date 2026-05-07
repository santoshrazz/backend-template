import { Request, Response, NextFunction } from "express";

interface LoggerOptions {
	logBody?: boolean;
	logHeaders?: boolean;
	logResponseBody?: boolean;
}

type LogLevel = "INFO" | "WARN" | "ERROR";

const log = (level: LogLevel, message: any) => {
	console.log(
		JSON.stringify(
			{
				level,
				...message,
			},
			null,
			2,
		),
	);
};

export const loggerMiddleware = (options: LoggerOptions = {}) => {
	const { logBody = true, logHeaders = false, logResponseBody = false } = options;

	return (req: Request, res: Response, next: NextFunction) => {
		const startTime = process.hrtime();

		// =========================
		// REQUEST LOG (Immediately)
		// =========================
		const requestLog: any = {
			type: "request",
			timestamp: new Date().toISOString(),
			method: req.method,
			url: req.originalUrl,
			ip: req.ip,
		};

		if (logHeaders) requestLog.headers = req.headers;
		if (logBody) requestLog.body = req.body;

		log("INFO", requestLog);

		// =========================
		// Capture Response Body
		// =========================
		let responseBody: any;
		const originalSend = res.send;

		if (logResponseBody) {
			res.send = function (body?: any): Response {
				responseBody = body;
				return originalSend.call(this, body);
			};
		}

		// =========================
		// RESPONSE LOG
		// =========================
		res.on("finish", () => {
			const diff = process.hrtime(startTime);
			const durationMs = (diff[0] * 1e9 + diff[1]) / 1e6;
			const responseLog: any = {
				type: "response",
				timestamp: new Date().toISOString(),
				method: req.method,
				url: req.originalUrl,
				statusCode: res.statusCode,
				durationMs: Number(durationMs.toFixed(2)),
			};

			if (logHeaders) responseLog.headers = res.getHeaders();
			if (logResponseBody) responseLog.body = responseBody;

			// Decide log level based on status code
			let level: LogLevel = "INFO";

			if (res.statusCode >= 500) {
				level = "ERROR";
			} else if (res.statusCode >= 400) {
				level = "WARN";
			}

			log(level, responseLog);
		});

		next();
	};
};
