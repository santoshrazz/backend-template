import { NextFunction, Router, Request, Response } from "express";
import { dispatcher } from "../../../middleware";
import { testFunction } from "../../../controllers";

const generalRoute = Router();

generalRoute.get("/test", (req: Request, res: Response, next: NextFunction) => {
    dispatcher(req, res, next, testFunction)
})
export { generalRoute }