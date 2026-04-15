import express, { Express } from 'express';
import { globalErrorHandler, loggerMiddleware } from './middleware';
import v1 from "./routes";
import dotenv from "dotenv";

dotenv.config({
    path: `.env.${process.env.NODE_ENV}`
});
console.log(`Running in ${process.env.NODE_ENV} mode`)
const app: Express = express();

// Middleware
app.use(express.json({
    limit: "100mb"
})).use(loggerMiddleware({
    logBody: true,
    logHeaders: false,
    logResponseBody: false,
})).use(express.urlencoded({ extended: true }));

app.use("/v1", v1)


// Global Error Handler Middleware 
app.use(globalErrorHandler);

export default app;
