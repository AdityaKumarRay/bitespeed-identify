import { PrismaClient, LinkPrecedence } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data
  await prisma.contact.deleteMany();

  // Seed example data from the assignment
  const lorraine = await prisma.contact.create({
    data: {
      phoneNumber: "123456",
      email: "lorraine@hillvalley.edu",
      linkPrecedence: LinkPrecedence.primary,
    },
  });

  await prisma.contact.create({
    data: {
      phoneNumber: "123456",
      email: "mcfly@hillvalley.edu",
      linkedId: lorraine.id,
      linkPrecedence: LinkPrecedence.secondary,
    },
  });

  console.log(`✅ Seeded ${await prisma.contact.count()} contacts`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
