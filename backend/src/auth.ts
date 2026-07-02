import type { Request } from "express";
import { getRequestUser } from "./context/request-context";
import { AuthError, ForbiddenError } from "./errors";
import { verifySessionToken } from "./security";
import type { SessionUser } from "./types/domain";

export function extractBearerToken(request: Request) {
  const authorization = request.header("authorization");
  if (!authorization) return null;

  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

export async function authenticateRequest(request: Request): Promise<SessionUser | null> {
  const token = extractBearerToken(request);
  if (!token) return null;

  try {
    return await verifySessionToken(token);
  } catch {
    throw new AuthError("Invalid or expired session token");
  }
}

export async function getCurrentUser(): Promise<SessionUser> {
  const user = getRequestUser();
  if (!user) {
    throw new AuthError();
  }

  return user;
}

export async function requireRole(roles: SessionUser["role"][]) {
  const user = await getCurrentUser();
  if (!roles.includes(user.role)) {
    throw new ForbiddenError();
  }
  return user;
}
