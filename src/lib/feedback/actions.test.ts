import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { z } from "zod";

/**
 * Tests for PROJ-6 feedback/actions.ts changes since commit 63028c7
 *
 * 1. computeBackfillMinDate — direct unit tests
 * 2. updateBackfillSchema — schema-level validation tests
 */

// ── Helpers ─────────────────────────────────────────────────────

function readSrc(relativePath: string): string {
  return fs.readFileSync(
    path.resolve(__dirname, "../..", relativePath),
    "utf-8"
  );
}

// ═══════════════════════════════════════════════════════════════
// 1. computeBackfillMinDate — direct unit tests
// ═══════════════════════════════════════════════════════════════

describe("computeBackfillMinDate", () => {
  let computeBackfillMinDate: (
    mode: "current_week" | "two_weeks" | "unlimited"
  ) => string;

  beforeEach(async () => {
    // Dynamic import to get the exported function
    const mod = await import("./actions");
    computeBackfillMinDate = mod.computeBackfillMinDate;
  });

  it("exists and is exported", () => {
    expect(computeBackfillMinDate).toBeDefined();
    expect(typeof computeBackfillMinDate).toBe("function");
  });

  describe("unlimited mode", () => {
    it('returns "1970-01-01"', () => {
      expect(computeBackfillMinDate("unlimited")).toBe("1970-01-01");
    });
  });

  describe("format is always YYYY-MM-DD", () => {
    it("current_week returns YYYY-MM-DD format", () => {
      const result = computeBackfillMinDate("current_week");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("two_weeks returns YYYY-MM-DD format", () => {
      const result = computeBackfillMinDate("two_weeks");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("unlimited returns YYYY-MM-DD format", () => {
      const result = computeBackfillMinDate("unlimited");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("current_week returns Monday of this week", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("on a Monday returns today's date", () => {
      // 2026-03-16 is a Monday
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-16T12:00:00Z"));

      const result = computeBackfillMinDate("current_week");
      expect(result).toBe("2026-03-16");
    });

    it("on a Wednesday returns the Monday of that week", () => {
      // 2026-03-18 is a Wednesday
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-18T12:00:00Z"));

      const result = computeBackfillMinDate("current_week");
      expect(result).toBe("2026-03-16");
    });

    it("on a Sunday returns the Monday of that week (6 days back)", () => {
      // 2026-03-22 is a Sunday
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-22T12:00:00Z"));

      const result = computeBackfillMinDate("current_week");
      expect(result).toBe("2026-03-16");
    });

    it("on a Saturday returns the Monday of that week", () => {
      // 2026-03-21 is a Saturday
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-21T12:00:00Z"));

      const result = computeBackfillMinDate("current_week");
      expect(result).toBe("2026-03-16");
    });
  });

  describe("two_weeks returns Monday of last week", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("on a Monday returns Monday of the previous week", () => {
      // 2026-03-16 is a Monday -> last Monday = 2026-03-09
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-16T12:00:00Z"));

      const result = computeBackfillMinDate("two_weeks");
      expect(result).toBe("2026-03-09");
    });

    it("on a Wednesday returns Monday of last week", () => {
      // 2026-03-18 is a Wednesday -> this Monday = 03-16, last Monday = 03-09
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-18T12:00:00Z"));

      const result = computeBackfillMinDate("two_weeks");
      expect(result).toBe("2026-03-09");
    });

    it("on a Sunday returns Monday of last week", () => {
      // 2026-03-22 is a Sunday -> this Monday = 03-16, last Monday = 03-09
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-22T12:00:00Z"));

      const result = computeBackfillMinDate("two_weeks");
      expect(result).toBe("2026-03-09");
    });
  });

  describe("current_week result is always <= today", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("result is not in the future", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-19T12:00:00Z"));
      const result = computeBackfillMinDate("current_week");
      expect(result <= "2026-03-19").toBe(true);
    });
  });

  describe("two_weeks result is always before current_week result", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("two_weeks min date is earlier than current_week min date", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-19T12:00:00Z"));
      const twoWeeks = computeBackfillMinDate("two_weeks");
      const currentWeek = computeBackfillMinDate("current_week");
      expect(twoWeeks < currentWeek).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. updateBackfillSchema — Zod schema validation tests
// ═══════════════════════════════════════════════════════════════

// Replicate the schema from actions.ts for direct testing
const updateBackfillSchema = z.object({
  athleteId: z.string().uuid(),
  mode: z.enum(["current_week", "two_weeks", "unlimited"]),
});

describe("updateBackfillSchema", () => {
  const validUUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

  describe("valid inputs", () => {
    it('parses mode "current_week"', () => {
      const result = updateBackfillSchema.safeParse({
        athleteId: validUUID,
        mode: "current_week",
      });
      expect(result.success).toBe(true);
    });

    it('parses mode "two_weeks"', () => {
      const result = updateBackfillSchema.safeParse({
        athleteId: validUUID,
        mode: "two_weeks",
      });
      expect(result.success).toBe(true);
    });

    it('parses mode "unlimited"', () => {
      const result = updateBackfillSchema.safeParse({
        athleteId: validUUID,
        mode: "unlimited",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it('rejects invalid mode "3_days"', () => {
      const result = updateBackfillSchema.safeParse({
        athleteId: validUUID,
        mode: "3_days",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing athleteId", () => {
      const result = updateBackfillSchema.safeParse({
        mode: "current_week",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid UUID format", () => {
      const result = updateBackfillSchema.safeParse({
        athleteId: "not-a-uuid",
        mode: "current_week",
      });
      expect(result.success).toBe(false);
    });

    it("rejects numeric mode value", () => {
      const result = updateBackfillSchema.safeParse({
        athleteId: validUUID,
        mode: 7,
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty mode string", () => {
      const result = updateBackfillSchema.safeParse({
        athleteId: validUUID,
        mode: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects null mode", () => {
      const result = updateBackfillSchema.safeParse({
        athleteId: validUUID,
        mode: null,
      });
      expect(result.success).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. Source-code invariants: updateBackfillMode replaced updateBackfillDays
// ═══════════════════════════════════════════════════════════════

describe("actions.ts source-code invariants", () => {
  const actionsSource = readSrc("lib/feedback/actions.ts");

  it("exports updateBackfillMode (not updateBackfillDays)", () => {
    expect(actionsSource).toContain("export async function updateBackfillMode");
  });

  it("does NOT export updateBackfillDays (old function removed)", () => {
    expect(actionsSource).not.toContain(
      "export async function updateBackfillDays"
    );
  });

  it("uses feedback_backfill_mode column (not feedback_backfill_days)", () => {
    expect(actionsSource).toContain("feedback_backfill_mode");
  });

  it("updateBackfillSchema uses z.enum with exactly 3 modes", () => {
    expect(actionsSource).toMatch(
      /mode:\s*z\.enum\(\["current_week",\s*"two_weeks",\s*"unlimited"\]\)/
    );
  });

  it("computeBackfillMinDate is exported for testability", () => {
    expect(actionsSource).toContain("export function computeBackfillMinDate");
  });
});
