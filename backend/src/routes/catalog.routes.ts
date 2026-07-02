import { Router } from "express";
import { getCatalogController } from "../controllers/catalog.controller";

export const catalogRouter = Router();

catalogRouter.get("/", getCatalogController);
