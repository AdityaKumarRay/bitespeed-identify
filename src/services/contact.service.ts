import type { Contact } from "@prisma/client";
import { IdentifyRequest, IdentifyResponse } from "../types";
import { normalizeEmail, normalizePhone } from "../utils/normalize";
import { logger } from "../utils/logger";
import {
  findContactsByEmailOrPhone,
  createContact,
  findSecondariesByPrimaryId,
  demotePrimaryToSecondary,
  relinkSecondaries,
  findContactById,
} from "../repositories/contact.repository";

/* ──────────────────────────────────────────────────────────
 * identifyService — core identity reconciliation algorithm
 *
 * Cases handled:
 *  1. No existing contacts → create new primary
 *  2. Matches found, request has new info → create secondary
 *  3. Two disjoint primaries linked by request → merge (demote newer)
 *  4. Exact duplicate request → return consolidated as-is
 * ────────────────────────────────────────────────────────── */

export async function identifyService(input: IdentifyRequest): Promise<IdentifyResponse> {
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phoneNumber);

  logger.debug("identifyService", { email, phone });

  // ── Step 1: Find all contacts matching email or phone ──
  const matchedContacts = await findContactsByEmailOrPhone(email, phone);

  // ── Case 1: No matches → brand-new customer ──
  if (matchedContacts.length === 0) {
    const newContact = await createContact({
      email,
      phoneNumber: phone,
      linkedId: null,
      linkPrecedence: "primary",
    });
    return buildResponse(newContact, []);
  }

  // ── Step 2: Resolve all distinct primary IDs ──
  const primaryIds = await resolvePrimaryIds(matchedContacts);

  // ── Case 3: Two or more disjoint primaries → merge ──
  let primaryId: number;
  if (primaryIds.length > 1) {
    primaryId = await mergePrimaries(primaryIds);
  } else {
    primaryId = primaryIds[0];
  }

  // ── Step 3: Determine if we need a new secondary ──
  const allLinked = await gatherAllLinked(primaryId);

  const emailExists = allLinked.some((c) => c.email === email);
  const phoneExists = allLinked.some((c) => c.phoneNumber === phone);

  const hasNewInfo = (email && !emailExists) || (phone && !phoneExists);

  if (hasNewInfo) {
    const secondary = await createContact({
      email,
      phoneNumber: phone,
      linkedId: primaryId,
      linkPrecedence: "secondary",
    });
    allLinked.push(secondary);
  }

  // ── Step 4: Build & return consolidated response ──
  const primary = allLinked.find((c) => c.id === primaryId)!;
  const secondaries = allLinked.filter((c) => c.id !== primaryId);

  return buildResponse(primary, secondaries);
}

/* ──────────────────────────────────────────────────────────
 * Helper functions
 * ────────────────────────────────────────────────────────── */

/**
 * Given matched contacts, resolve each one to its ultimate primary ID.
 * Returns a sorted, de-duplicated list of primary IDs.
 */
async function resolvePrimaryIds(contacts: Contact[]): Promise<number[]> {
  const ids = new Set<number>();

  for (const c of contacts) {
    if (c.linkPrecedence === "primary") {
      ids.add(c.id);
    } else if (c.linkedId !== null) {
      ids.add(c.linkedId);
    }
  }

  // Sort ascending — the oldest primary has the lowest ID (autoincrement)
  return Array.from(ids).sort((a, b) => a - b);
}

/**
 * Merge multiple primaries into one.
 * The oldest (smallest ID) stays primary; the rest become secondary.
 * All their previous secondaries are re-linked to the surviving primary.
 */
async function mergePrimaries(primaryIds: number[]): Promise<number> {
  const [survivorId, ...losers] = primaryIds; // already sorted asc

  for (const loserId of losers) {
    // Re-link all secondaries of the loser to the survivor
    await relinkSecondaries(loserId, survivorId);
    // Demote the loser itself
    await demotePrimaryToSecondary(loserId, survivorId);
  }

  return survivorId;
}

/**
 * Gather the primary contact + all its secondaries into one list.
 */
async function gatherAllLinked(primaryId: number): Promise<Contact[]> {
  const primary = await findContactById(primaryId);
  if (!primary) {
    throw new Error(`Primary contact ${primaryId} not found`);
  }

  const secondaries = await findSecondariesByPrimaryId(primaryId);
  return [primary, ...secondaries];
}

/**
 * Build the API response object from a primary + its secondaries.
 */
function buildResponse(primary: Contact, secondaries: Contact[]): IdentifyResponse {
  // Collect unique emails: primary first, then secondaries in order
  const emails: string[] = [];
  if (primary.email) emails.push(primary.email);
  for (const s of secondaries) {
    if (s.email && !emails.includes(s.email)) {
      emails.push(s.email);
    }
  }

  // Collect unique phone numbers: primary first, then secondaries in order
  const phoneNumbers: string[] = [];
  if (primary.phoneNumber) phoneNumbers.push(primary.phoneNumber);
  for (const s of secondaries) {
    if (s.phoneNumber && !phoneNumbers.includes(s.phoneNumber)) {
      phoneNumbers.push(s.phoneNumber);
    }
  }

  return {
    contact: {
      primaryContatctId: primary.id,
      emails,
      phoneNumbers,
      secondaryContactIds: secondaries.map((s) => s.id),
    },
  };
}
