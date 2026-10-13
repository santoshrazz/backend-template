import { randomUUID } from "node:crypto";
import pinoHttp from "pino-http";
import type { Request, Response, NextFunction } from "express";
import { logger } from "../utils";

const requestLogger = pinoHttp({
	logger,
	genReqId(req, res) {
		const existingId = (req as Request & { id?: string }).id ?? req.headers["x-request-id"];
		if (existingId) {
			return existingId;
		}
		const id = randomUUID();
		res.setHeader("X-Request-Id", id);
		return id;
	},
	wrapSerializers: true,
	customLogLevel(_req, res, err) {
		if (res.statusCode >= 400 && res.statusCode < 500) {
			return "warn";
		}
		if (res.statusCode >= 500 || err) {
			return "error";
		}
		if (res.statusCode >= 300 && res.statusCode < 400) {
			return "silent";
		}
		return "info";
	},
	customSuccessMessage(req, res) {
		const { method, originalUrl } = req as Request;
		if (res.statusCode === 404) {
			return `${method} ${originalUrl} resource not found`;
		}
		return `${method} ${originalUrl} ${res.statusCode} completed`;
	},
	customReceivedMessage(req) {
		const { method, originalUrl } = req as Request;
		return `request received: ${method} ${originalUrl}`;
	},
	customErrorMessage(req, res) {
		const { method, originalUrl } = req as Request;
		return `${method} ${originalUrl} request errored with status code: ${res.statusCode}`;
	},
	customAttributeKeys: { req: "request", res: "response", err: "error" },
	serializers: {
		res(res) {
			const headers = (res as { headers?: Record<string, string> }).headers ?? {};
			if (headers["content-length"] && Number.parseInt(headers["content-length"]) < 1000) {
				(res as Record<string, unknown>).body = (
					res as { raw?: { body?: unknown } }
				).raw?.body;
			}
			return res;
		},
	},
	customProps(req) {
		const expressReq = req as Request & { id?: string };
		return {
			requestId: expressReq.id,
			userId: expressReq.user?.id,
			requestBody: expressReq.body,
		};
	},
});

const loggerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
	const original = res.json.bind(res);
	res.json = (data: unknown) => {
		(res as Response & { body?: unknown }).body = data;
		res.json = original;
		return res.json(data);
	};
	requestLogger(req, res);
	next();
};

export { loggerMiddleware };
