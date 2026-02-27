/**
 * Minimal structured logger.
 * Replace with winston/pino in production if needed.
 *
 * Silenced in test environment to keep test output clean.
 */

const isTest = process.env.NODE_ENV === "test";
const noop = () => {};

export const logger = {
  info: isTest
    ? noop
    : (message: string, ...args: unknown[]) => {
        console.log(`[INFO]  ${new Date().toISOString()} — ${message}`, ...args);
      },
  warn: isTest
    ? noop
    : (message: string, ...args: unknown[]) => {
        console.warn(`[WARN]  ${new Date().toISOString()} — ${message}`, ...args);
      },
  error: isTest
    ? noop
    : (message: string, ...args: unknown[]) => {
        console.error(`[ERROR] ${new Date().toISOString()} — ${message}`, ...args);
      },
  debug: isTest
    ? noop
    : (message: string, ...args: unknown[]) => {
        if (process.env.NODE_ENV === "development") {
          console.debug(`[DEBUG] ${new Date().toISOString()} — ${message}`, ...args);
        }
      },
};
