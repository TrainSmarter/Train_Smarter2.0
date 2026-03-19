import { describe, it, expect } from "vitest";
import { z } from "zod";

/**
 * Tests for the profileSchema Zod validation used in updateProfile server action.
 *
 * We replicate the schema here because importing the server action file would
 * pull in "use server" directives and createClient() which require a full
 * Next.js server environment. Testing the schema in isolation is sufficient
 * to verify input validation.
 */

// ── Replicated from actions.ts ───────────────────────────────────
const profileSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

describe("profileSchema validation", () => {
  describe("valid inputs", () => {
    it("should accept valid first and last name", () => {
      const result = profileSchema.safeParse({
        firstName: "Max",
        lastName: "Mustermann",
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid name with birthDate in ISO format", () => {
      const result = profileSchema.safeParse({
        firstName: "Max",
        lastName: "Mustermann",
        birthDate: "1990-01-15",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.birthDate).toBe("1990-01-15");
      }
    });

    it("should accept birthDate as null", () => {
      const result = profileSchema.safeParse({
        firstName: "Anna",
        lastName: "Schmidt",
        birthDate: null,
      });
      expect(result.success).toBe(true);
    });

    it("should accept birthDate as undefined (omitted)", () => {
      const result = profileSchema.safeParse({
        firstName: "Anna",
        lastName: "Schmidt",
        birthDate: undefined,
      });
      expect(result.success).toBe(true);
    });

    it("should accept birthDate when field is missing entirely", () => {
      const result = profileSchema.safeParse({
        firstName: "Anna",
        lastName: "Schmidt",
      });
      expect(result.success).toBe(true);
    });

    it("should accept names with German umlauts", () => {
      const result = profileSchema.safeParse({
        firstName: "Jürgen",
        lastName: "Müller",
      });
      expect(result.success).toBe(true);
    });

    it("should accept single-character names (min=1)", () => {
      const result = profileSchema.safeParse({
        firstName: "A",
        lastName: "B",
      });
      expect(result.success).toBe(true);
    });

    it("should accept 100-character names (max boundary)", () => {
      const result = profileSchema.safeParse({
        firstName: "A".repeat(100),
        lastName: "B".repeat(100),
      });
      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("should reject empty firstName", () => {
      const result = profileSchema.safeParse({
        firstName: "",
        lastName: "Mustermann",
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty lastName", () => {
      const result = profileSchema.safeParse({
        firstName: "Max",
        lastName: "",
      });
      expect(result.success).toBe(false);
    });

    it("should reject firstName exceeding 100 characters", () => {
      const result = profileSchema.safeParse({
        firstName: "A".repeat(101),
        lastName: "Mustermann",
      });
      expect(result.success).toBe(false);
    });

    it("should reject lastName exceeding 100 characters", () => {
      const result = profileSchema.safeParse({
        firstName: "Max",
        lastName: "B".repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it("should reject birthDate in German format (DD.MM.YYYY)", () => {
      const result = profileSchema.safeParse({
        firstName: "Max",
        lastName: "Mustermann",
        birthDate: "15.01.1990",
      });
      expect(result.success).toBe(false);
    });

    it("should reject birthDate in US format (MM/DD/YYYY)", () => {
      const result = profileSchema.safeParse({
        firstName: "Max",
        lastName: "Mustermann",
        birthDate: "01/15/1990",
      });
      expect(result.success).toBe(false);
    });

    it("should reject birthDate with no dashes", () => {
      const result = profileSchema.safeParse({
        firstName: "Max",
        lastName: "Mustermann",
        birthDate: "19900115",
      });
      expect(result.success).toBe(false);
    });

    it("should reject birthDate as a random string", () => {
      const result = profileSchema.safeParse({
        firstName: "Max",
        lastName: "Mustermann",
        birthDate: "not-a-date",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing firstName entirely", () => {
      const result = profileSchema.safeParse({
        lastName: "Mustermann",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing lastName entirely", () => {
      const result = profileSchema.safeParse({
        firstName: "Max",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("profileSchema source code invariant", () => {
  /**
   * Verify the actual actions.ts contains the schema to guard against
   * accidental removal or modification.
   */
  let actionsSource: string;

  it("should contain profileSchema with same constraints", async () => {
    const fs = await import("fs");
    const path = await import("path");
    actionsSource = fs.readFileSync(
      path.resolve(__dirname, "actions.ts"),
      "utf-8"
    );

    expect(actionsSource).toContain("profileSchema");
    expect(actionsSource).toContain("z.string().min(1).max(100)");
    expect(actionsSource).toContain(String.raw`/^\d{4}-\d{2}-\d{2}$/`);
    expect(actionsSource).toContain(".nullable()");
    expect(actionsSource).toContain(".optional()");
  });
});
