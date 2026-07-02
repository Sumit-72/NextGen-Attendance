import type { Request, Response } from "express";
import { z } from "zod";
import { created, ok } from "../api-response";
import { ProfileService } from "../services/profile.service";

const profileService = new ProfileService();

const studentProfileSchema = z.object({
  rollNumber: z.string().trim().min(2).max(32),
  semester: z.coerce.number().int().min(1).max(12),
  division: z.string().trim().min(1).max(8),
  courseId: z.string().min(1),
});

export async function getProfileController(_request: Request, response: Response) {
  const profile = await profileService.getCurrentProfile();
  return ok(response, profile);
}

export async function upsertStudentProfileController(request: Request, response: Response) {
  const payload = studentProfileSchema.parse(request.body);
  const student = await profileService.upsertStudentProfile(payload);
  return ok(response, { student, complete: true });
}

export async function ensureTeacherProfileController(_request: Request, response: Response) {
  const teacher = await profileService.ensureTeacherProfile();
  return created(response, { teacher, complete: true });
}
