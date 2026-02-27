import express, { Request, Response, NextFunction } from "express";
import { contactRouter } from "./routes/contact.routes";
import { AppError } from "./utils/errors";
import { logger } from "./utils/logger";

const app = express();

/* ── Middleware ────────────────────────────────────────── */
app.use(express.json());

// Simple request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info({ method: req.method, path: req.path }, "incoming request");
  next();
});

/* ── Routes ───────────────────────────────────────────── */
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/", contactRouter);

/* ── Global error handler ─────────────────────────────── */
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    logger.warn({ statusCode: err.statusCode }, err.message);
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal Server Error" });
});

export { app };
