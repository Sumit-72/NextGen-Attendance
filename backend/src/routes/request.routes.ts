import { Router } from "express";
import {
  createCorrectionRequestController,
  createLeaveRequestController,
  listCorrectionRequestsController,
  listLeaveRequestsController,
  reviewCorrectionRequestController,
  reviewLeaveRequestController,
} from "../controllers/request.controller";

export const requestRouter = Router();

requestRouter.get("/leave", listLeaveRequestsController);
requestRouter.post("/leave", createLeaveRequestController);
requestRouter.patch("/leave/:requestId/review", reviewLeaveRequestController);
requestRouter.get("/corrections", listCorrectionRequestsController);
requestRouter.post("/corrections", createCorrectionRequestController);
requestRouter.patch("/corrections/:requestId/review", reviewCorrectionRequestController);
