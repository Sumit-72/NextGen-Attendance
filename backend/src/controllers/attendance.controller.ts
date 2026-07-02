import type { Request, Response } from "express";
import { z } from "zod";
import { created } from "../api-response";
import { AttendanceService } from "../services/attendance.service";

const attendanceService = new AttendanceService();

const markAttendanceSchema = z.object({
  sessionId: z.string().min(1),
  otp: z.string().trim().min(4).max(12).optional(),
  qrToken: z.string().trim().min(8).max(200).optional(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accuracy: z.coerce.number().min(0).max(1000).optional(),
  deviceFingerprint: z.string().trim().min(8).max(200),
});

export async function markAttendanceController(request: Request, response: Response) {
  const payload = markAttendanceSchema.parse(request.body);
  const result = await attendanceService.markAttendance(payload);
  return created(response, result);
}
