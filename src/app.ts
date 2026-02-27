import express, { Request, Response, NextFunction } from "express";
import { contactRouter } from "./routes/contact.routes";
import { logger } from "./utils/logger";

const app = express();

/* ── Middleware ────────────────────────────────────────── */
app.use(express.json());

// Simple request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

/* ── Routes ───────────────────────────────────────────── */
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/", contactRouter);

/* ── Global error handler ─────────────────────────────── */
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(`Unhandled error: ${err.message}`, err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

export { app };
