import { NextFunction, Router, Request, Response } from "express";
import multer from "multer";
import { dispatcher } from "../../../middleware";
import { testFunction, uploadSinglFile, uploadMultipleFile, healthCheck } from "../../../controllers";

const generalRoute: Router = Router();
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
});

generalRoute.get("/health", (req: Request, res: Response, next: NextFunction) => {
	dispatcher(req, res, next, healthCheck);
});

generalRoute.get("/test", (req: Request, res: Response, next: NextFunction) => {
	dispatcher(req, res, next, testFunction);
});

generalRoute.post(
	"/upload/single",
	upload.single("file"),
	(req: Request, res: Response, next: NextFunction) => {
		dispatcher(req, res, next, uploadSinglFile);
	},
);

generalRoute.post(
	"/upload/multiple",
	upload.array("files"),
	(req: Request, res: Response, next: NextFunction) => {
		dispatcher(req, res, next, uploadMultipleFile);
	},
);

export { generalRoute };
