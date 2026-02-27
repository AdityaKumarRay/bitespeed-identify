import "dotenv/config";
import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/database";
import { logger } from "./utils/logger";

const server = app.listen(env.PORT, () => {
  logger.info({ mode: env.NODE_ENV, port: env.PORT }, "Server running");
});

/* ── Graceful shutdown ─────────────────────────────────── */
const shutdown = async (signal: string) => {
  logger.info({ signal }, "Shutting down gracefully…");
  server.close(async () => {
    await prisma.$disconnect();
    logger.info("Database disconnected. Bye!");
    process.exit(0);
  });

  // Force exit after 10 s
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
