import { PrismaClient } from "@prisma/client";
import { env } from "./config/env";

let prisma: PrismaClient | undefined;

export function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: { db: { url: env.DATABASE_URL ?? "" } },
      log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });
  }

  return prisma;
}
