import { Router } from "express";
import {
  ensureTeacherProfileController,
  getProfileController,
  upsertStudentProfileController,
} from "../controllers/profile.controller";

export const profileRouter = Router();

profileRouter.get("/", getProfileController);
profileRouter.post("/student", upsertStudentProfileController);
profileRouter.put("/student", upsertStudentProfileController);
profileRouter.post("/teacher", ensureTeacherProfileController);
