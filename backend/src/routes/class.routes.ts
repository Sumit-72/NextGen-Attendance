import { Router } from "express";
import {
  createClassController,
  getClassController,
  listClassesController,
  updateClassController,
} from "../controllers/class.controller";

export const classRouter = Router();

classRouter.get("/", listClassesController);
classRouter.get("/:classId", getClassController);
classRouter.post("/", createClassController);
classRouter.patch("/:classId", updateClassController);
