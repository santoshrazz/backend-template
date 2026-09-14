import pino from "pino";

/**
 * Console-only logger. No file/Loki/log-server transports — everything
 * goes to stdout, pretty-printed (single-line) in every environment.
 */
const logger = pino(
	{
		level: process.env.LOG_LEVEL || "info",
		timestamp: pino.stdTimeFunctions.isoTime,
		redact: {
			paths: ["*.password", "*.headers.token", "*.headers.authorization"],
			censor: "[REDACTED]",
		},
	},
	pino.transport({
		target: "pino-pretty",
		options: {
			singleLine: true,
			ignore: "pid,hostname,request.id,request.headers,response.headers",
		},
	}),
);

export { logger };
