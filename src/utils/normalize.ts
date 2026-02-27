/**
 * Normalization utilities for contact fields.
 * Ensures consistent storage and lookup.
 */

/**
 * Normalize email: lowercase, trim whitespace.
 * Returns null if input is falsy.
 */
export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  return email.trim().toLowerCase();
}

/**
 * Normalize phone number:
 *  - Strip all non-digit characters
 *  - Returns null if input is falsy or results in empty string
 *
 * NOTE: Full E.164 normalization (country code inference) is out of scope
 * for this assignment. We store the digit-only form for consistent matching.
 */
export function normalizePhone(phone: string | number | null | undefined): string | null {
  if (phone === null || phone === undefined) return null;
  const digits = String(phone).replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}
