import { Router } from "express";
import {
  exportTeacherReportController,
  studentReportController,
  teacherReportController,
} from "../controllers/report.controller";

export const reportRouter = Router();

reportRouter.get("/student", studentReportController);
reportRouter.get("/teacher", teacherReportController);
reportRouter.get("/teacher/:classId/export", exportTeacherReportController);
