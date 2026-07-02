import type { Request, Response } from "express";
import { z } from "zod";
import { ok } from "../api-response";
import { CatalogService } from "../services/catalog.service";

const catalogService = new CatalogService();

export async function getCatalogController(_request: Request, response: Response) {
  const catalog = await catalogService.getCatalog();
  return ok(response, catalog);
}
