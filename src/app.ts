import path from "path";
// Import the 'express' module
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, NextFunction, Request, Response } from "express";
import globalErrorHandler from "./middlewares/globalErrorHandler";
import notFound from "./middlewares/notFound";

import router from "./routes";
import { logger, logHttpRequests } from "./logger/logger";

import { template } from "./rootTemplate";
import { UserController } from "./modules/user/user.controller";



import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
dns.setDefaultResultOrder('ipv4first');

// Create an Express application
const app: Application = express();
app.use(logHttpRequests);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  cors({
    origin: [
      "http://10.10.11.90:7000",
      "http://localhost:5173",
      "http://localhost:3000",
      "https://dashboard.carerfinderau.com",
      "http://localhost:5174",
      "http://10.10.11.18:5000",
      "http://10.10.11.122:5173",
      "https://carerfinderau.com",
    ],
    credentials: true,
  }),
);

app.use(express.static("public"));

//application router
app.use(router);
app.get("/delete-instructions", UserController.AppInstruction);
app.get("/privacy", UserController.getPrivacyFromDB);
app.get("/terms", UserController.getTermsFromDB);
app.get("/about", UserController.getAboutFromDB);
// Define a route for the root path ('/')
app.get("/", (req: Request, res: Response) => {
  logger.info("Root endpoint hit 🌐 :");
  res.status(200).send(template);
});

app.all("*", notFound);
app.use(globalErrorHandler);

// Log errors
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Error occurred: ${err.message}`, { stack: err.stack });
  next(err);
});

export default app;
