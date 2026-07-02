import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { authenticateRequest } from "../auth";
import { runWithRequestContext, setRequestUser } from "../context/request-context";

export function requestContextMiddleware(request: Request, _response: Response, next: NextFunction) {
  runWithRequestContext(
    {
      requestId: request.header("x-request-id") ?? randomUUID(),
      ipAddress: request.ip,
      userAgent: request.get("user-agent") ?? undefined,
      user: null,
    },
    () => {
      authenticateRequest(request)
        .then((user) => {
          setRequestUser(user);
          next();
        })
        .catch(next);
    },
  );
}