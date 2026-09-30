import { Request, Response, NextFunction } from "express";
import { General } from "../../../services";
import type { UploadFile } from "../../../utils";

// No try/catch here — `dispatcher` already awaits this and forwards any
// rejection to `next(error)`. Catching here too caused a double response
// (error sent by this catch, then a second "success" response from
// dispatcher on the already-sent res).
const testFunction = async (req: Request, res: Response, next: NextFunction) => {
	return new General().testFunction();
};

// Response is wrapped in an object ({ url }, not a bare string) because
// dispatcher runs the return value through `camelize`, which camelCases
// object keys but mangles a bare top-level string (strips "-"/"." and
// capitalizes the next letter) — that corrupted the S3 key in the URL.
const uploadSinglFile = async (req: Request, res: Response, next: NextFunction) => {
	const url = await new General().uploadSinglFile(req.file as UploadFile);
	return { url };
};

const uploadMultipleFile = async (req: Request, res: Response, next: NextFunction) => {
	const urls = await new General().uploadMultipleFile(req.files as UploadFile[]);
	return { urls };
};

// No service — nothing here is business logic, just process introspection.
const healthCheck = async (req: Request, res: Response, next: NextFunction) => {
	return { status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() };
};

// Responds 503 if a dependency is down; the cause is logged, not returned.
const readinessCheck = async (req: Request, res: Response, next: NextFunction) => {
	await new General().checkReadiness();
	return { status: "ready" };
};

export { testFunction, uploadSinglFile, uploadMultipleFile, healthCheck, readinessCheck };
