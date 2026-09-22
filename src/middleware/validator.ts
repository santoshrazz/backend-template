import type { Schema } from "joi";
import type { Request, Response, NextFunction } from "express";
import AppError from "../utils/errorHandler";
import { statusCodes } from "../utils/status-codes";

const { BAD_REQUEST } = statusCodes;

/**
 * Schemas are registered per route (e.g. from the route file that owns it)
 * under `${path segments after /v1, joined with "_", "-" -> "_"}_${method}`,
 * e.g. `POST /v1/upload/single` -> "upload_single_post". A route with no
 * registered schema just passes through untouched.
 */
const schemas: Record<string, Schema> = {};

const validator = (req: Request, _res: Response, next: NextFunction): void => {
	try {
		const key = `${req.path
			.split("/")
			.splice(2)
			.join("_")
			.split("-")
			.join("_")}_${req.method.toLowerCase()}`;

		const schema = schemas[key];
		if (schema === undefined) {
			return next();
		}

		const { error } = schema.validate(req.body);
		if (error) {
			throw new AppError(BAD_REQUEST, error.message);
		}
		return next();
	} catch (error) {
		return next(error);
	}
};

export { validator, schemas };
