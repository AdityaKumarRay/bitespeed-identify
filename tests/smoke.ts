#!/usr/bin/env node

/**
 * Smoke test script for the /identify endpoint.
 *
 * Usage:
 *   npx tsx tests/smoke.ts                              # defaults to http://localhost:3000
 *   npx tsx tests/smoke.ts https://bitespeed-api-ikhq.onrender.com
 *
 * Runs a sequence of HTTP requests against a live (or local) server
 * and validates every response. Uses unique random data per run so
 * it's safe to run against production without polluting existing data.
 *
 * Exit code: 0 = all pass, 1 = at least one failure.
 */

const BASE = process.argv[2] || "http://localhost:3000";

/* ── helpers ──────────────────────────────────────────── */

const uid = Math.random().toString(36).slice(2, 8); // unique per run
const email = (name: string) => `${name}-${uid}@smoketest.dev`;
const phone = (n: number) => `${uid}${n}`;

let passed = 0;
let failed = 0;

async function post(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`);
  return { status: res.status, body: await res.json() };
}

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

/* ── tests ────────────────────────────────────────────── */

async function run() {
  console.log(`\n🔍 Smoke testing: ${BASE}\n`);

  // ── 1. Health ──────────────────────────────────────────
  console.log("1. GET /health");
  const health = await get("/health");
  assert("status 200", health.status === 200);
  assert("has status=ok", health.body.status === "ok");
  assert("has timestamp", typeof health.body.timestamp === "string");

  // ── 2. Validation (400) ────────────────────────────────
  console.log("\n2. Validation");
  const v1 = await post("/identify", {});
  assert("empty body → 400", v1.status === 400);

  const v2 = await post("/identify", { email: null, phoneNumber: null });
  assert("both null → 400", v2.status === 400);

  const v3 = await post("/identify", { email: "not-an-email" });
  assert("bad email → 400", v3.status === 400);

  // ── 3. New primary ────────────────────────────────────
  console.log("\n3. New primary contact");
  const r1 = await post("/identify", {
    email: email("alice"),
    phoneNumber: phone(1),
  });
  assert("status 200", r1.status === 200);
  assert("has primaryContatctId", typeof r1.body.contact?.primaryContatctId === "number");
  assert("one email", r1.body.contact.emails.length === 1);
  assert("one phone", r1.body.contact.phoneNumbers.length === 1);
  assert("no secondaries", r1.body.contact.secondaryContactIds.length === 0);
  const primaryId = r1.body.contact.primaryContatctId;

  // ── 4. Secondary creation ─────────────────────────────
  console.log("\n4. Secondary (new email, same phone)");
  const r2 = await post("/identify", {
    email: email("bob"),
    phoneNumber: phone(1),
  });
  assert("status 200", r2.status === 200);
  assert("same primaryId", r2.body.contact.primaryContatctId === primaryId);
  assert("two emails", r2.body.contact.emails.length === 2);
  assert("one secondary", r2.body.contact.secondaryContactIds.length === 1);

  // ── 5. Exact duplicate (idempotent) ───────────────────
  console.log("\n5. Exact duplicate (no new row)");
  const r3 = await post("/identify", {
    email: email("alice"),
    phoneNumber: phone(1),
  });
  assert("status 200", r3.status === 200);
  assert("same primaryId", r3.body.contact.primaryContatctId === primaryId);
  assert("still one secondary", r3.body.contact.secondaryContactIds.length === 1);

  // ── 6. Email-only lookup ──────────────────────────────
  console.log("\n6. Email-only lookup");
  const r4 = await post("/identify", {
    email: email("alice"),
    phoneNumber: null,
  });
  assert("status 200", r4.status === 200);
  assert("returns full group", r4.body.contact.emails.length === 2);

  // ── 7. Phone-only lookup ──────────────────────────────
  console.log("\n7. Phone-only lookup");
  const r5 = await post("/identify", {
    email: null,
    phoneNumber: phone(1),
  });
  assert("status 200", r5.status === 200);
  assert("returns full group", r5.body.contact.phoneNumbers.length === 1);
  assert("has both emails", r5.body.contact.emails.length === 2);

  // ── 8. Merge two primaries ────────────────────────────
  console.log("\n8. Merge two primaries");
  const rA = await post("/identify", {
    email: email("george"),
    phoneNumber: phone(2),
  });
  const idA = rA.body.contact.primaryContatctId;

  const rB = await post("/identify", {
    email: email("biff"),
    phoneNumber: phone(3),
  });
  const idB = rB.body.contact.primaryContatctId;

  assert("two separate primaries", idA !== idB);

  // Link them
  const rMerge = await post("/identify", {
    email: email("george"),
    phoneNumber: phone(3),
  });
  assert("status 200", rMerge.status === 200);
  assert(
    "oldest is primary",
    rMerge.body.contact.primaryContatctId === Math.min(idA, idB),
  );
  assert("has both emails", rMerge.body.contact.emails.length >= 2);
  assert("has both phones", rMerge.body.contact.phoneNumbers.length >= 2);
  assert("has secondaries", rMerge.body.contact.secondaryContactIds.length >= 1);

  // ── 9. Case insensitive email ─────────────────────────
  console.log("\n9. Case-insensitive email");
  const rCase = await post("/identify", {
    email: email("alice").toUpperCase(),
    phoneNumber: phone(1),
  });
  assert("status 200", rCase.status === 200);
  assert(
    "same primaryId as original",
    rCase.body.contact.primaryContatctId === primaryId,
  );

  // ── 10. phoneNumber as number ─────────────────────────
  console.log("\n10. phoneNumber as number type");
  const rNum = await post("/identify", {
    email: email("numtest"),
    phoneNumber: 9876543210,
  });
  assert("status 200", rNum.status === 200);
  assert("phone stored as string", rNum.body.contact.phoneNumbers.includes("9876543210"));

  // ── Summary ────────────────────────────────────────────
  console.log(`\n${"─".repeat(45)}`);
  console.log(`  ✅ ${passed} passed   ❌ ${failed} failed`);
  console.log(`${"─".repeat(45)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
