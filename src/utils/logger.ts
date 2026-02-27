import pino from "pino";

const isTest = process.env.NODE_ENV === "test";
const isDev = process.env.NODE_ENV === "development";

/**
 * Structured logger powered by pino.
 *
 * • Development: pretty-printed, colorised via pino-pretty
 * • Production:  JSON lines (machine-parseable, ideal for log aggregators)
 * • Test:        silent to keep test output clean
 */
export const logger = pino({
  level: isTest ? "silent" : isDev ? "debug" : "info",
  ...(isDev && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    },
  }),
});
