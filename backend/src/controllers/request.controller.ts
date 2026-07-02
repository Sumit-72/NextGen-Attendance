import type { Request, Response } from "express";
import { z } from "zod";
import { created, ok } from "../api-response";
import { CorrectionService } from "../services/correction.service";
import { LeaveService } from "../services/leave.service";
import { getRouteParam } from "../utils/route-params";

const leaveService = new LeaveService();
const correctionService = new CorrectionService();

const createLeaveSchema = z.object({
  fromDate: z.string().min(1),
  toDate: z.string().min(1),
  reason: z.string().trim().min(5).max(500),
  classId: z.string().min(1).optional(),
});

const createCorrectionSchema = z.object({
  attendanceId: z.string().min(1).optional(),
  sessionId: z.string().min(1).optional(),
  reason: z.string().trim().min(5).max(500),
});

const reviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  requestedStatus: z.enum(["PRESENT", "EXCUSED"]).optional(),
});

export async function listLeaveRequestsController(request: Request, response: Response) {
  const requests = await leaveService.listLeaveRequests({
    status: typeof request.query.status === "string" ? request.query.status : undefined,
  });
  return ok(response, { requests });
}

export async function createLeaveRequestController(request: Request, response: Response) {
  const payload = createLeaveSchema.parse(request.body);
  const leaveRequest = await leaveService.createLeaveRequest(payload);
  return created(response, { request: leaveRequest });
}

export async function reviewLeaveRequestController(request: Request, response: Response) {
  const payload = reviewSchema.parse(request.body);
  const leaveRequest = await leaveService.reviewLeaveRequest(
    getRouteParam(request.params.requestId, "requestId"),
    payload.status,
  );
  return ok(response, { request: leaveRequest });
}

export async function listCorrectionRequestsController(request: Request, response: Response) {
  const requests = await correctionService.listCorrectionRequests({
    status: typeof request.query.status === "string" ? request.query.status : undefined,
  });
  return ok(response, { requests });
}

export async function createCorrectionRequestController(request: Request, response: Response) {
  const payload = createCorrectionSchema.parse(request.body);
  const correctionRequest = await correctionService.createCorrectionRequest(payload);
  return created(response, { request: correctionRequest });
}

export async function reviewCorrectionRequestController(request: Request, response: Response) {
  const payload = reviewSchema.parse(request.body);
  const correctionRequest = await correctionService.reviewCorrectionRequest(
    getRouteParam(request.params.requestId, "requestId"),
    payload.status,
    payload.requestedStatus,
  );
  return ok(response, { request: correctionRequest });
}
