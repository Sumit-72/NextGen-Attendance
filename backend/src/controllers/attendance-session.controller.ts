import type { Request, Response } from "express";
import { z } from "zod";
import { created, ok } from "../api-response";
import { AttendanceSessionService } from "../services/attendance-session.service";
import { getRouteParam } from "../utils/route-params";

const attendanceSessionService = new AttendanceSessionService();

const startSessionSchema = z.object({
  classId: z.string().min(1),
  mode: z.enum(["OTP", "QR", "GEO"]),
  durationMinutes: z.coerce.number().int().min(1).max(120).optional(),
  attendanceWindowMinutes: z.coerce.number().int().min(1).max(60).optional(),
  allowedRadiusMeters: z.coerce.number().int().min(10).max(1000).optional(),
  minGpsAccuracyMeters: z.coerce.number().int().min(5).max(500).optional(),
  centerLatitude: z.coerce.number().min(-90).max(90).optional(),
  centerLongitude: z.coerce.number().min(-180).max(180).optional(),
});

export async function listAttendanceSessionsController(request: Request, response: Response) {
  const sessions = await attendanceSessionService.listSessions({
    classId: typeof request.query.classId === "string" ? request.query.classId : undefined,
    activeOnly: request.query.activeOnly === "true",
  });
  return ok(response, { sessions });
}

export async function getAttendanceSessionController(request: Request, response: Response) {
  const session = await attendanceSessionService.getSession(
    getRouteParam(request.params.sessionId, "sessionId"),
  );
  return ok(response, { session });
}

export async function startAttendanceSessionController(request: Request, response: Response) {
  const payload = startSessionSchema.parse(request.body);
  const result = await attendanceSessionService.startSession(payload);
  return created(response, result);
}

export async function regenerateOtpController(request: Request, response: Response) {
  const credentials = await attendanceSessionService.regenerateOtp(
    getRouteParam(request.params.sessionId, "sessionId"),
  );
  return ok(response, credentials);
}

export async function closeAttendanceSessionController(request: Request, response: Response) {
  const result = await attendanceSessionService.closeSession(
    getRouteParam(request.params.sessionId, "sessionId"),
  );
  return ok(response, result);
}
