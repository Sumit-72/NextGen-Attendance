import { Router } from "express";
import {
  adminOverviewController,
  adminUpdateUserStatusController,
  adminUsersController,
} from "../controllers/admin.controller";

export const adminRouter = Router();

adminRouter.get("/overview", adminOverviewController);
adminRouter.get("/users", adminUsersController);
adminRouter.patch("/users/:userId/status", adminUpdateUserStatusController);
