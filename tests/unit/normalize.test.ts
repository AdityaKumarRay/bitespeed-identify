import { normalizeEmail, normalizePhone } from "../../src/utils/normalize";

describe("normalizeEmail", () => {
  it("should lowercase and trim email", () => {
    expect(normalizeEmail("  Alice@Example.COM  ")).toBe("alice@example.com");
  });

  it("should return null for null/undefined/empty", () => {
    expect(normalizeEmail(null)).toBeNull();
    expect(normalizeEmail(undefined)).toBeNull();
    expect(normalizeEmail("")).toBeNull();
  });
});

describe("normalizePhone", () => {
  it("should strip non-digit characters", () => {
    expect(normalizePhone("+1 (555) 123-4567")).toBe("15551234567");
  });

  it("should handle numeric input", () => {
    expect(normalizePhone(123456)).toBe("123456");
  });

  it("should return null for null/undefined", () => {
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
  });

  it("should return null for empty string", () => {
    expect(normalizePhone("")).toBeNull();
  });

  it("should return null for string with no digits", () => {
    expect(normalizePhone("abc")).toBeNull();
  });
});
