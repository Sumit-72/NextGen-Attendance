import type { Request, Response } from "express";
import { ok } from "../api-response";
import { DashboardService } from "../services/dashboard.service";

const dashboardService = new DashboardService();

export async function currentDashboardController(_request: Request, response: Response) {
  const dashboard = await dashboardService.getCurrentDashboard();
  return ok(response, dashboard);
}

export async function studentDashboardController(_request: Request, response: Response) {
  const dashboard = await dashboardService.getStudentDashboard();
  return ok(response, dashboard);
}

export async function teacherDashboardController(_request: Request, response: Response) {
  const dashboard = await dashboardService.getTeacherDashboard();
  return ok(response, dashboard);
}