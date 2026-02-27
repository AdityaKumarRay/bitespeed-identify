import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../config/database";
import type { Contact, LinkPrecedence } from "@prisma/client";

/**
 * Transaction client type — can be the base PrismaClient or a
 * transaction client obtained from prisma.$transaction().
 */
type TxClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/* ─────────────────────────────────────────────────────────
 * Repository layer — thin data-access wrapper around Prisma.
 * Every function accepts an optional `tx` param so it can
 * participate in a transaction. Defaults to the global client.
 * ───────────────────────────────────────────────────────── */

/**
 * Find all non-deleted contacts that match the given email OR phoneNumber.
 * Both params are already normalized by the caller.
 */
export async function findContactsByEmailOrPhone(
  email: string | null,
  phone: string | null,
  tx: TxClient = prisma,
): Promise<Contact[]> {
  const conditions: Prisma.ContactWhereInput[] = [];

  if (email) conditions.push({ email, deletedAt: null });
  if (phone) conditions.push({ phoneNumber: phone, deletedAt: null });

  if (conditions.length === 0) return [];

  return tx.contact.findMany({
    where: { OR: conditions },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Create a new contact row.
 */
export async function createContact(
  data: {
    email: string | null;
    phoneNumber: string | null;
    linkedId: number | null;
    linkPrecedence: LinkPrecedence;
  },
  tx: TxClient = prisma,
): Promise<Contact> {
  return tx.contact.create({ data });
}

/**
 * Fetch all secondary contacts linked to a given primary ID.
 */
export async function findSecondariesByPrimaryId(
  primaryId: number,
  tx: TxClient = prisma,
): Promise<Contact[]> {
  return tx.contact.findMany({
    where: { linkedId: primaryId, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Turn an existing primary into a secondary (link it to another primary).
 */
export async function demotePrimaryToSecondary(
  contactId: number,
  newPrimaryId: number,
  tx: TxClient = prisma,
): Promise<Contact> {
  return tx.contact.update({
    where: { id: contactId },
    data: {
      linkedId: newPrimaryId,
      linkPrecedence: "secondary",
    },
  });
}

/**
 * Re-link all secondaries that currently point to `oldPrimaryId`
 * so they point to `newPrimaryId` instead.
 */
export async function relinkSecondaries(
  oldPrimaryId: number,
  newPrimaryId: number,
  tx: TxClient = prisma,
): Promise<void> {
  await tx.contact.updateMany({
    where: { linkedId: oldPrimaryId, deletedAt: null },
    data: { linkedId: newPrimaryId },
  });
}

/**
 * Fetch a contact by ID.
 */
export async function findContactById(
  id: number,
  tx: TxClient = prisma,
): Promise<Contact | null> {
  return tx.contact.findUnique({ where: { id } });
}

export type { TxClient };
