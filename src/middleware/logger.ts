import { Request, Response, NextFunction } from "express";

interface LoggerOptions {
    logBody?: boolean;
    logHeaders?: boolean;
    logResponseBody?: boolean;
}

export const loggerMiddleware = (options: LoggerOptions = {}) => {
    const {
        logBody = true,
        logHeaders = false,
        logResponseBody = false,
    } = options;

    return (req: Request, res: Response, next: NextFunction) => {
        const startTime = process.hrtime();

        const requestLog: any = {
            type: "request",
            timestamp: new Date().toISOString(),
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
        };

        if (logHeaders) requestLog.headers = req.headers;
        if (logBody) requestLog.body = req.body;

        // Capture response body (optional)
        let responseBody: any;
        const originalSend = res.send;

        if (logResponseBody) {
            res.send = function (body?: any): Response {
                responseBody = body;
                return originalSend.call(this, body);
            };
        }

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

            const log = {
                request: requestLog,
                response: responseLog,
            };

            console.log(JSON.stringify(log, null, 2)); // pretty JSON
        });

        next();
    };
};