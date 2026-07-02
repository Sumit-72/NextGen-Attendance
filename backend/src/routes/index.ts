import { Router } from "express";
import { healthController } from "../controllers/health.controller";
import { attendanceRouter } from "./attendance.routes";
import { adminRouter } from "./admin.routes";
import { authRouter } from "./auth.routes";
import { catalogRouter } from "./catalog.routes";
import { classRouter } from "./class.routes";
import { dashboardRouter } from "./dashboard.routes";
import { enrollmentRouter } from "./enrollment.routes";
import { profileRouter } from "./profile.routes";
import { reportRouter } from "./report.routes";
import { requestRouter } from "./request.routes";

export const router = Router();


router.get("/health", healthController);
router.use("/auth", authRouter);
router.use("/catalog", catalogRouter);
router.use("/profile", profileRouter);
router.use("/classes", classRouter);
router.use("/enrollments", enrollmentRouter);
router.use("/attendance", attendanceRouter);
router.use("/admin", adminRouter);
router.use("/requests", requestRouter);
router.use("/reports", reportRouter);
router.use("/dashboard", dashboardRouter);
