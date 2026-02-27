import type { Contact } from "@prisma/client";
import { IdentifyRequest, IdentifyResponse } from "../types";
import { normalizeEmail, normalizePhone } from "../utils/normalize";
import { logger } from "../utils/logger";
import { prisma } from "../config/database";
import {
  findContactsByEmailOrPhone,
  createContact,
  findSecondariesByPrimaryId,
  demotePrimaryToSecondary,
  relinkSecondaries,
  findContactById,
  TxClient,
} from "../repositories/contact.repository";

/* ──────────────────────────────────────────────────────────
 * identifyService — core identity reconciliation algorithm
 *
 * Wrapped in a Prisma interactive transaction with a Postgres
 * advisory lock keyed on a hash of (email, phone) to prevent
 * race conditions on concurrent identical requests.
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

  // Run the entire reconciliation inside an interactive transaction
  return prisma.$transaction(
    async (tx) => {
      // Advisory lock: deterministic 32-bit hash from email+phone
      const lockKey = hashCode(`${email ?? ""}:${phone ?? ""}`);
      await tx.$queryRawUnsafe(`SELECT pg_advisory_xact_lock($1)`, lockKey);

      return reconcile(email, phone, tx as unknown as TxClient);
    },
    {
      isolationLevel: "Serializable",
      timeout: 10_000, // 10 s max
    },
  );
}

/* ──────────────────────────────────────────────────────────
 * reconcile — the actual logic, runs inside a transaction
 * ────────────────────────────────────────────────────────── */

async function reconcile(
  email: string | null,
  phone: string | null,
  tx: TxClient,
): Promise<IdentifyResponse> {
  // ── Step 1: Find all contacts matching email or phone ──
  const matchedContacts = await findContactsByEmailOrPhone(email, phone, tx);

  // ── Case 1: No matches → brand-new customer ──
  if (matchedContacts.length === 0) {
    const newContact = await createContact(
      {
        email,
        phoneNumber: phone,
        linkedId: null,
        linkPrecedence: "primary",
      },
      tx,
    );
    return buildResponse(newContact, []);
  }

  // ── Step 2: Resolve all distinct primary IDs ──
  const primaryIds = resolvePrimaryIds(matchedContacts);

  // ── Case 3: Two or more disjoint primaries → merge ──
  let primaryId: number;
  if (primaryIds.length > 1) {
    primaryId = await mergePrimaries(primaryIds, tx);
  } else {
    primaryId = primaryIds[0];
  }

  // ── Step 3: Determine if we need a new secondary ──
  const allLinked = await gatherAllLinked(primaryId, tx);

  const emailExists = allLinked.some((c) => c.email === email);
  const phoneExists = allLinked.some((c) => c.phoneNumber === phone);

  const hasNewInfo = (email && !emailExists) || (phone && !phoneExists);

  if (hasNewInfo) {
    const secondary = await createContact(
      {
        email,
        phoneNumber: phone,
        linkedId: primaryId,
        linkPrecedence: "secondary",
      },
      tx,
    );
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
function resolvePrimaryIds(contacts: Contact[]): number[] {
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
async function mergePrimaries(primaryIds: number[], tx: TxClient): Promise<number> {
  const [survivorId, ...losers] = primaryIds; // already sorted asc

  for (const loserId of losers) {
    await relinkSecondaries(loserId, survivorId, tx);
    await demotePrimaryToSecondary(loserId, survivorId, tx);
  }

  return survivorId;
}

/**
 * Gather the primary contact + all its secondaries into one list.
 */
async function gatherAllLinked(primaryId: number, tx: TxClient): Promise<Contact[]> {
  const primary = await findContactById(primaryId, tx);
  if (!primary) {
    throw new Error(`Primary contact ${primaryId} not found`);
  }

  const secondaries = await findSecondariesByPrimaryId(primaryId, tx);
  return [primary, ...secondaries];
}

/**
 * Build the API response object from a primary + its secondaries.
 */
function buildResponse(primary: Contact, secondaries: Contact[]): IdentifyResponse {
  const emails: string[] = [];
  if (primary.email) emails.push(primary.email);
  for (const s of secondaries) {
    if (s.email && !emails.includes(s.email)) {
      emails.push(s.email);
    }
  }

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

/**
 * Simple deterministic 32-bit hash (Java-style) used as advisory lock key.
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash;
}
