import type { Request, Response } from "express";
import { z } from "zod";
import { ok, created } from "../api-response";
import { ROLE_PERMISSIONS } from "../constants/permissions";
import { getCurrentUser } from "../auth";
import { AuthService } from "../services/auth.service";

const sessionExchangeSchema = z.object({
  idToken: z.string().min(10),
  roleHint: z.enum(["STUDENT", "TEACHER", "ADMIN"]).optional(),
});

const authService = new AuthService();

export async function exchangeSessionController(request: Request, response: Response) {
  const payload = sessionExchangeSchema.parse(request.body);
  const session = await authService.exchangeSession(payload);

  return created(response, {
    user: session.user,
    sessionToken: session.sessionToken,
    expiresIn: session.expiresIn,
    permissions: ROLE_PERMISSIONS[session.user.role],
  });
}

export async function meController(_request: Request, response: Response) {
  const user = await getCurrentUser();

  return ok(response, {
    user,
    permissions: ROLE_PERMISSIONS[user.role],
  });
}

export async function logoutController(_request: Request, response: Response) {
  return ok(response, {
    signedOut: true,
  });
}