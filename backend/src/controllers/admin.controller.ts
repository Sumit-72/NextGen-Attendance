import type { Request, Response } from "express";
import { z } from "zod";
import { ok } from "../api-response";
import { AdminService } from "../services/admin.service";
import { getRouteParam } from "../utils/route-params";

const adminService = new AdminService();

const updateStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "ARCHIVED"]),
});

export async function adminOverviewController(_request: Request, response: Response) {
  const overview = await adminService.getOverview();
  return ok(response, overview);
}

export async function adminUsersController(_request: Request, response: Response) {
  const users = await adminService.listUsers();
  return ok(response, { users });
}

export async function adminUpdateUserStatusController(request: Request, response: Response) {
  const payload = updateStatusSchema.parse(request.body);
  const user = await adminService.updateUserStatus(
    getRouteParam(request.params.userId, "userId"),
    payload.status,
  );
  return ok(response, { user });
}
