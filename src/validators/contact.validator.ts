import { z } from "zod";

/**
 * Zod schema for POST /identify request body.
 *
 * Rules:
 *  - At least one of email or phoneNumber must be provided (non-null).
 *  - email must be a valid email format if provided.
 *  - phoneNumber can be a string or a number (will be coerced to string).
 */
export const identifySchema = z
  .object({
    email: z
      .string()
      .email("Invalid email format")
      .nullable()
      .optional()
      .transform((v) => v ?? null),
    phoneNumber: z
      .union([z.string(), z.number()])
      .nullable()
      .optional()
      .transform((v) => {
        if (v === null || v === undefined) return null;
        return String(v);
      }),
  })
  .refine((data) => data.email || data.phoneNumber, {
    message: "At least one of email or phoneNumber must be provided",
  });

export type IdentifyInput = z.infer<typeof identifySchema>;
