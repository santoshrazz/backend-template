import express, { Express, Request, Response } from 'express';
import { globalErrorHandler, loggerMiddleware } from './middleware';
import v1 from "./routes";

const app: Express = express();

// Middleware
app.use(express.json({
    limit: "100mb"
})).use(loggerMiddleware({
    logBody: true,
    logHeaders: false,
    logResponseBody: false,
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use("/v1", v1)
// Routes
app.get('/test', (req: Request, res: Response) => {
    res.status(200).send('Welcome to Portfolio Backend');
});

// Global Error Handler Middleware 
app.use(globalErrorHandler);

export default app;
