import type { Request, Response } from "express";

export function healthController(_request: Request, response: Response) {
  response.json({
    success: true,
    data: {
      status: "ok",
      service: "attendance-backend",
      timestamp: new Date().toISOString(),
    },
  });
}
