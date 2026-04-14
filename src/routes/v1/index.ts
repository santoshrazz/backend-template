import express, { Express } from "express";
import { generalRoute } from "./general";

const app: Express = express();

app.use("/general",generalRoute)

export default app;