import { NextFunction, Request, Response } from "express";
import { AsyncHandler } from "../types";
import camelize from "camelize";
import { statusCodes } from "../utils";
const { SUCCESS } = statusCodes;

const dispatcher = async (req: Request, res: Response, next: NextFunction, func: AsyncHandler) => {
	try {
		const data = await func(req, res, next);
		res.status(SUCCESS).json(camelize(data));
	} catch (error) {
		next(error);
	}
};
export { dispatcher };
