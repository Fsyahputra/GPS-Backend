import { HttpError } from "@/utils/HttpError";
import type { Response, Request, NextFunction } from "express";

export const errorHandler = (err: Error | HttpError, req: Request, res: Response, next: NextFunction) => {
  console.error("Error occurred:", err);
  const status = err instanceof HttpError ? err.status : 500;
  const message = err instanceof HttpError ? err.message : "Internal Server Error";
  res.status(status).json({ error: message });
};
