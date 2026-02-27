import { Request, Response, NextFunction } from "express";
import { identifyService } from "../services/contact.service";
import { identifySchema } from "../validators/contact.validator";
import { BadRequestError } from "../utils/errors";
import { logger } from "../utils/logger";
import { ZodError } from "zod";

/**
 * POST /identify
 * Validates input, delegates to service, returns consolidated contact.
 */
export async function identifyController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Validate & parse request body
    const parseResult = identifySchema.safeParse(req.body);

    if (!parseResult.success) {
      const messages = parseResult.error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");
      throw new BadRequestError(messages);
    }

    const { email, phoneNumber } = parseResult.data;

    const result = await identifyService({ email, phoneNumber });

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");
      next(new BadRequestError(messages));
    } else {
      logger.error({ err: error }, "identifyController error");
      next(error);
    }
  }
}
