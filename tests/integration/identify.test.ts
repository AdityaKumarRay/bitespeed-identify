import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "../../src/config/database";

/**
 * Integration tests for POST /identify
 *
 * These tests require a running PostgreSQL instance.
 * Set DATABASE_URL in your .env or environment before running.
 *
 * Each test cleans the contacts table to ensure isolation.
 */

beforeEach(async () => {
  // Clean the table before each test
  await prisma.contact.deleteMany();
});

afterAll(async () => {
  await prisma.contact.deleteMany();
  await prisma.$disconnect();
});

describe("POST /identify", () => {
  /* ─── Validation ─────────────────────────────────────── */

  it("should return 400 when both email and phoneNumber are missing", async () => {
    const res = await request(app).post("/identify").send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("should return 400 when both are null", async () => {
    const res = await request(app)
      .post("/identify")
      .send({ email: null, phoneNumber: null });
    expect(res.status).toBe(400);
  });

  it("should return 400 for invalid email format", async () => {
    const res = await request(app)
      .post("/identify")
      .send({ email: "not-an-email", phoneNumber: null });
    expect(res.status).toBe(400);
  });

  /* ─── Case 1: No existing contacts → new primary ───── */

  it("should create a new primary contact for a brand-new customer", async () => {
    const res = await request(app)
      .post("/identify")
      .send({ email: "lorraine@hillvalley.edu", phoneNumber: "123456" });

    expect(res.status).toBe(200);
    expect(res.body.contact).toMatchObject({
      emails: ["lorraine@hillvalley.edu"],
      phoneNumbers: ["123456"],
      secondaryContactIds: [],
    });
    expect(res.body.contact.primaryContatctId).toBeDefined();
  });

  /* ─── Case 2: Match with new info → new secondary ──── */

  it("should create a secondary when new email arrives with same phone", async () => {
    // First request → primary
    await request(app)
      .post("/identify")
      .send({ email: "lorraine@hillvalley.edu", phoneNumber: "123456" });

    // Second request → same phone, different email
    const res = await request(app)
      .post("/identify")
      .send({ email: "mcfly@hillvalley.edu", phoneNumber: "123456" });

    expect(res.status).toBe(200);
    const { contact } = res.body;
    expect(contact.emails).toEqual(["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"]);
    expect(contact.phoneNumbers).toEqual(["123456"]);
    expect(contact.secondaryContactIds).toHaveLength(1);
  });

  /* ─── Case 3: Exact duplicate → no new row ─────────── */

  it("should not create a duplicate for an identical request", async () => {
    await request(app)
      .post("/identify")
      .send({ email: "lorraine@hillvalley.edu", phoneNumber: "123456" });

    await request(app)
      .post("/identify")
      .send({ email: "lorraine@hillvalley.edu", phoneNumber: "123456" });

    const count = await prisma.contact.count();
    expect(count).toBe(1);
  });

  /* ─── Case 4: Merge two disjoint primaries ─────────── */

  it("should merge two primaries when request links them", async () => {
    // Create two separate primaries
    await request(app)
      .post("/identify")
      .send({ email: "george@hillvalley.edu", phoneNumber: "919191" });

    await request(app)
      .post("/identify")
      .send({ email: "biffsucks@hillvalley.edu", phoneNumber: "717171" });

    // Now link them
    const res = await request(app)
      .post("/identify")
      .send({ email: "george@hillvalley.edu", phoneNumber: "717171" });

    expect(res.status).toBe(200);
    const { contact } = res.body;

    expect(contact.emails).toContain("george@hillvalley.edu");
    expect(contact.emails).toContain("biffsucks@hillvalley.edu");
    expect(contact.phoneNumbers).toContain("919191");
    expect(contact.phoneNumbers).toContain("717171");

    // The older one should be primary
    const allContacts = await prisma.contact.findMany({
      orderBy: { createdAt: "asc" },
    });
    const primary = allContacts.find((c) => c.linkPrecedence === "primary");
    expect(contact.primaryContatctId).toBe(primary!.id);
    expect(contact.secondaryContactIds.length).toBeGreaterThanOrEqual(1);
  });

  /* ─── Case 5: Only email provided ──────────────────── */

  it("should work with only email (no phone)", async () => {
    await request(app)
      .post("/identify")
      .send({ email: "lorraine@hillvalley.edu", phoneNumber: "123456" });

    const res = await request(app)
      .post("/identify")
      .send({ email: "lorraine@hillvalley.edu", phoneNumber: null });

    expect(res.status).toBe(200);
    expect(res.body.contact.emails).toContain("lorraine@hillvalley.edu");
    expect(res.body.contact.phoneNumbers).toContain("123456");
  });

  /* ─── Case 6: Only phone provided ──────────────────── */

  it("should work with only phone (no email)", async () => {
    await request(app)
      .post("/identify")
      .send({ email: "lorraine@hillvalley.edu", phoneNumber: "123456" });

    const res = await request(app)
      .post("/identify")
      .send({ email: null, phoneNumber: "123456" });

    expect(res.status).toBe(200);
    expect(res.body.contact.phoneNumbers).toContain("123456");
    expect(res.body.contact.emails).toContain("lorraine@hillvalley.edu");
  });

  /* ─── Case 7: Email case-insensitivity ─────────────── */

  it("should treat emails case-insensitively", async () => {
    await request(app)
      .post("/identify")
      .send({ email: "Alice@Example.COM", phoneNumber: "111" });

    const res = await request(app)
      .post("/identify")
      .send({ email: "alice@example.com", phoneNumber: "111" });

    expect(res.status).toBe(200);
    // Should not create a secondary since it's the same normalized email+phone
    const count = await prisma.contact.count();
    expect(count).toBe(1);
  });

  /* ─── Case 8: phoneNumber as number type ───────────── */

  it("should accept phoneNumber as a number", async () => {
    const res = await request(app)
      .post("/identify")
      .send({ email: "test@example.com", phoneNumber: 9876543210 });

    expect(res.status).toBe(200);
    expect(res.body.contact.phoneNumbers).toContain("9876543210");
  });
});

describe("GET /health", () => {
  it("should return 200 with status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
    expect(res.body).toHaveProperty("timestamp");
  });
});
