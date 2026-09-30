import pino from "pino";

/**
 * Console-only logger. No file/Loki/log-server transports — everything
 * goes to stdout, pretty-printed (single-line) in every environment.
 */
// Bodies are logged (requestBody / response.body), so credentials in them must
// never reach the logs. pino wildcards match one level, hence the explicit depths.
const SENSITIVE_KEYS = [
	"password",
	"currentPassword",
	"newPassword",
	"confirmPassword",
	"token",
	"accessToken",
	"refreshToken",
	"idToken",
	"secret",
	"apiKey",
];
const BODY_ROOTS = ["requestBody", "response.body"];
const redactPaths = [
	"*.password",
	"*.headers.token",
	"*.headers.authorization",
	"request.headers.cookie",
	'response.headers["set-cookie"]',
	...BODY_ROOTS.flatMap(root =>
		SENSITIVE_KEYS.flatMap(key => [`${root}.${key}`, `${root}.*.${key}`, `${root}.*.*.${key}`]),
	),
];

const logger = pino(
	{
		level: process.env.LOG_LEVEL || "info",
		timestamp: pino.stdTimeFunctions.isoTime,
		redact: {
			paths: redactPaths,
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
