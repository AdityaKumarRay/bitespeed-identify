import { PrismaClient } from "@prisma/client";
import { env } from "./env";

/**
 * Singleton PrismaClient instance.
 * In development we attach to `globalThis` to survive hot-reloads
 * without exhausting database connections.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
