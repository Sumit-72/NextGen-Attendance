import { Router } from "express";
import {
  listEnrollmentsController,
  requestEnrollmentController,
  reviewEnrollmentController,
} from "../controllers/enrollment.controller";

export const enrollmentRouter = Router();

enrollmentRouter.get("/", listEnrollmentsController);
enrollmentRouter.post("/classes/:classId/request", requestEnrollmentController);
enrollmentRouter.patch("/:enrollmentId/review", reviewEnrollmentController);
