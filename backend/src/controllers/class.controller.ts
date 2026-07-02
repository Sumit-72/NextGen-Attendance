import type { Request, Response } from "express";
import { z } from "zod";
import { created, ok } from "../api-response";
import { ClassService } from "../services/class.service";
import { getRouteParam } from "../utils/route-params";

const classService = new ClassService();

const createClassSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().min(2).max(32).optional(),
  departmentId: z.string().min(1),
  courseId: z.string().min(1),
  subjectId: z.string().min(1),
  semester: z.coerce.number().int().min(1).max(12),
  division: z.string().trim().min(1).max(8),
  capacity: z.coerce.number().int().min(1).max(500).optional(),
});

const updateClassSchema = createClassSchema.partial();

export async function listClassesController(_request: Request, response: Response) {
  const classes = await classService.listClasses();
  return ok(response, { classes });
}

export async function getClassController(request: Request, response: Response) {
  const klass = await classService.getClass(getRouteParam(request.params.classId, "classId"));
  return ok(response, { class: klass });
}

export async function createClassController(request: Request, response: Response) {
  const payload = createClassSchema.parse(request.body);
  const klass = await classService.createClass(payload);
  return created(response, { class: klass });
}

export async function updateClassController(request: Request, response: Response) {
  const payload = updateClassSchema.parse(request.body);
  const klass = await classService.updateClass(getRouteParam(request.params.classId, "classId"), payload);
  return ok(response, { class: klass });
}
