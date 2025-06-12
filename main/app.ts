import express from "express";
import type { Express, Request, Response } from "express";
import cors from "cors";
import { errorHandler } from "./errorHandler";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import accountRoutes from "@/routes/account";
import deviceRoutes from "@/routes/device";

const app: Express = express();
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000000, // Limit each IP to 100 requests per windowMs
  message: "Too many requests, please try again later.",
});

app.use(morgan("dev"));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(globalLimiter);
app.use(helmet());
app.use(cors());

app.use("/api/account/", accountRoutes);
app.use("/api/devices/", deviceRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Not Found" });
});

app.use(errorHandler);
export default app;
