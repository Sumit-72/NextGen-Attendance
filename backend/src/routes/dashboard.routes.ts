import { Router } from "express";
import {
  currentDashboardController,
  studentDashboardController,
  teacherDashboardController,
} from "../controllers/dashboard.controller";

export const dashboardRouter = Router();

dashboardRouter.get("/", currentDashboardController);
dashboardRouter.get("/student", studentDashboardController);
dashboardRouter.get("/teacher", teacherDashboardController);