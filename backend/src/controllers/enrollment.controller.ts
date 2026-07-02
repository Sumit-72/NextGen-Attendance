import type { Request, Response } from "express";
import { z } from "zod";
import { created, ok } from "../api-response";
import { EnrollmentService } from "../services/enrollment.service";
import { getRouteParam } from "../utils/route-params";

const enrollmentService = new EnrollmentService();

const reviewEnrollmentSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export async function listEnrollmentsController(request: Request, response: Response) {
  const enrollments = await enrollmentService.listEnrollments({
    classId: typeof request.query.classId === "string" ? request.query.classId : undefined,
    status: typeof request.query.status === "string" ? request.query.status : undefined,
  });
  return ok(response, { enrollments });
}

export async function requestEnrollmentController(request: Request, response: Response) {
  const enrollment = await enrollmentService.requestEnrollment(
    getRouteParam(request.params.classId, "classId"),
  );
  return created(response, { enrollment });
}

export async function reviewEnrollmentController(request: Request, response: Response) {
  const payload = reviewEnrollmentSchema.parse(request.body);
  const enrollment = await enrollmentService.reviewEnrollment(
    getRouteParam(request.params.enrollmentId, "enrollmentId"),
    payload.status,
  );
  return ok(response, { enrollment });
}
