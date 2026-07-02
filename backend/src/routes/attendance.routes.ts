import { Router } from "express";
import { markAttendanceController } from "../controllers/attendance.controller";
import {
  closeAttendanceSessionController,
  getAttendanceSessionController,
  listAttendanceSessionsController,
  regenerateOtpController,
  startAttendanceSessionController,
} from "../controllers/attendance-session.controller";

export const attendanceRouter = Router();

attendanceRouter.get("/sessions", listAttendanceSessionsController);
attendanceRouter.get("/sessions/:sessionId", getAttendanceSessionController);
attendanceRouter.post("/sessions", startAttendanceSessionController);
attendanceRouter.post("/sessions/:sessionId/regenerate-otp", regenerateOtpController);
attendanceRouter.post("/sessions/:sessionId/close", closeAttendanceSessionController);
attendanceRouter.post("/mark", markAttendanceController);
