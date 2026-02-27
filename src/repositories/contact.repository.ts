import { Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import type { Contact, LinkPrecedence } from "@prisma/client";

/* ─────────────────────────────────────────────────────────
 * Repository layer — thin data-access wrapper around Prisma.
 * Keeps SQL / ORM concerns out of the service layer.
 * ───────────────────────────────────────────────────────── */

/**
 * Find all non-deleted contacts that match the given email OR phoneNumber.
 * Both params are already normalized by the caller.
 */
export async function findContactsByEmailOrPhone(
  email: string | null,
  phone: string | null,
): Promise<Contact[]> {
  const conditions: Prisma.ContactWhereInput[] = [];

  if (email) conditions.push({ email, deletedAt: null });
  if (phone) conditions.push({ phoneNumber: phone, deletedAt: null });

  if (conditions.length === 0) return [];

  return prisma.contact.findMany({
    where: { OR: conditions },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Create a new contact row.
 */
export async function createContact(data: {
  email: string | null;
  phoneNumber: string | null;
  linkedId: number | null;
  linkPrecedence: LinkPrecedence;
}): Promise<Contact> {
  return prisma.contact.create({ data });
}

/**
 * Fetch all secondary contacts linked to a given primary ID.
 */
export async function findSecondariesByPrimaryId(primaryId: number): Promise<Contact[]> {
  return prisma.contact.findMany({
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
): Promise<Contact> {
  return prisma.contact.update({
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
): Promise<void> {
  await prisma.contact.updateMany({
    where: { linkedId: oldPrimaryId, deletedAt: null },
    data: { linkedId: newPrimaryId },
  });
}

/**
 * Fetch a contact by ID.
 */
export async function findContactById(id: number): Promise<Contact | null> {
  return prisma.contact.findUnique({ where: { id } });
}
