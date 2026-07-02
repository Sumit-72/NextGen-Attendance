import { Router } from "express";
import { exchangeSessionController, logoutController, meController } from "../controllers/auth.controller";

export const authRouter = Router();

authRouter.post("/session", exchangeSessionController);
authRouter.get("/me", meController);
authRouter.post("/logout", logoutController);