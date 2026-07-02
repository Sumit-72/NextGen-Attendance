import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError, ValidationError } from "../errors";

export function errorMiddleware(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
) {
  const appError =
    error instanceof ZodError
      ? new ValidationError(error.flatten())
      : error instanceof AppError
        ? error
        : new AppError(error instanceof Error ? error.message : "Unexpected server error");

  response.status(appError.statusCode).json({
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details,
    },
  });
}
