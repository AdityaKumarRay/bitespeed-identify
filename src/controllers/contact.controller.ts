import { Request, Response, NextFunction } from "express";
import { identifyService } from "../services/contact.service";
import { logger } from "../utils/logger";

/**
 * POST /identify
 * Accepts { email?: string, phoneNumber?: string } and returns consolidated contact.
 */
export async function identifyController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, phoneNumber } = req.body;

    const result = await identifyService({ email, phoneNumber });

    res.status(200).json(result);
  } catch (error) {
    logger.error("identifyController error", error);
    next(error);
  }
}
