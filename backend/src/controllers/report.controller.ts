import type { Request, Response } from "express";
import { ok } from "../api-response";
import { ReportService } from "../services/report.service";
import { getRouteParam } from "../utils/route-params";

const reportService = new ReportService();

export async function studentReportController(_request: Request, response: Response) {
  const report = await reportService.getStudentReport();
  return ok(response, report);
}

export async function teacherReportController(request: Request, response: Response) {
  const report = await reportService.getTeacherReport(
    typeof request.query.classId === "string" ? request.query.classId : undefined,
  );
  return ok(response, { classes: report });
}

export async function exportTeacherReportController(request: Request, response: Response) {
  const exported = await reportService.exportTeacherCsv(
    getRouteParam(request.params.classId, "classId"),
  );

  response.setHeader("Content-Type", "text/csv; charset=utf-8");
  response.setHeader("Content-Disposition", `attachment; filename="${exported.filename}"`);
  return response.status(200).send(exported.content);
}
