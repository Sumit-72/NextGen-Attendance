import type { Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AppError, BadRequestError, ConflictError, ValidationError } from "./errors";

export type ApiSuccess<T> = { success: true; data: T; meta?: unknown };
export type ApiFailure = { success: false; error: { code: string; message: string; details?: unknown } };

export function ok<T>(response: Response, data: T, status = 200, meta?: unknown) {
  return response.status(status).json({ success: true, data, meta } satisfies ApiSuccess<T>);
}

export function created<T>(response: Response, data: T, meta?: unknown) {
  return ok(response, data, 201, meta);
}

export function fail(response: Response, error: unknown) {
  const prismaError =
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
      ? new ConflictError(
          "A record with this value already exists",
          Array.isArray(error.meta?.target) ? { fields: error.meta.target.join(", ") } : undefined,
        )
      : null;
  const appError =
    prismaError
      ? prismaError
      : error instanceof ZodError
      ? new ValidationError(error.flatten())
      : error instanceof SyntaxError && typeof error === "object" && error !== null && "body" in error
        ? new BadRequestError("Malformed JSON request body")
      : error instanceof AppError
        ? error
        : new AppError("Unexpected server error");

  return response.status(appError.statusCode).json({
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details,
    },
  } satisfies ApiFailure);
}
