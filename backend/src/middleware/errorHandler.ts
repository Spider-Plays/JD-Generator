import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/errors";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof SyntaxError) {
    res.status(400).json({ error: "The request could not be read. Please try again." });
    return;
  }

  const status = err instanceof AppError ? err.statusCode : 500;
  const message =
    err instanceof AppError
      ? err.message
      : "Something went wrong. Please try again.";

  if (!(err instanceof AppError)) {
    console.error("Unhandled error:", err instanceof Error ? err.message : "unknown");
  }

  res.status(status).json({ error: message });
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
