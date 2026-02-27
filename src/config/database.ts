import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { env } from "./env";

/**
 * Singleton PrismaClient instance.
 * In development we attach to `globalThis` to survive hot-reloads
 * without exhausting database connections.
 *
 * Prisma v7 requires a driver adapter for direct DB connections
 * (the `url` property was removed from schema.prisma datasource blocks).
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  // Render (and most cloud providers) require SSL for external connections.
  // Detect remote hosts and enable SSL automatically.
  const isRemote =
    env.DATABASE_URL.includes("render.com") ||
    env.DATABASE_URL.includes("neon.tech") ||
    env.DATABASE_URL.includes("supabase.co") ||
    env.DATABASE_URL.includes("sslmode=require");

  const pool = new pg.Pool({
    connectionString: env.DATABASE_URL,
    ...(isRemote && { ssl: { rejectUnauthorized: false } }),
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
