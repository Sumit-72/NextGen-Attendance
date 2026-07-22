import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AppError, BadRequestError, ConflictError, ValidationError } from "../errors";

function isJsonParseError(error: unknown) {
  return error instanceof SyntaxError && typeof error === "object" && error !== null && "body" in error;
}

function getPrismaError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return null;
  }

  if (error.code === "P2002") {
    const target = Array.isArray(error.meta?.target) ? error.meta.target.join(", ") : undefined;
    return new ConflictError("A record with this value already exists", target ? { fields: target } : undefined);
  }

  return null;
}

export function errorMiddleware(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
) {
  const prismaError = getPrismaError(error);
  const appError =
    prismaError
      ? prismaError
      : error instanceof ZodError
      ? new ValidationError(error.flatten())
      : isJsonParseError(error)
        ? new BadRequestError("Malformed JSON request body")
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
