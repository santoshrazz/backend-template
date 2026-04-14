import { Request, Response, NextFunction } from "express";
import { General } from "../../../services";

const testFunction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        return new General().testFunction();
    } catch (error: any) {
        next(error);
    }
}

export { testFunction }