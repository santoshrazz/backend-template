import express, { Express } from "express";
import { generalRoute } from "./general";

const app: Express = express();
app.disable("x-powered-by");

app.use("/",generalRoute)

export default app;