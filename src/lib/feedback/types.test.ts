import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Tests for PROJ-6 feedback/types.ts changes since commit 63028c7
 *
 * Verifies the BackfillMode type and MonitoringAthleteSummary migration
 * from backfillDays: number to backfillMode: BackfillMode.
 */

// ── Helpers ─────────────────────────────────────────────────────

function readSrc(relativePath: string): string {
  return fs.readFileSync(
    path.resolve(__dirname, "../..", relativePath),
    "utf-8"
  );
}

// ═══════════════════════════════════════════════════════════════
// 1. BackfillMode type
// ═══════════════════════════════════════════════════════════════

describe("BackfillMode type in types.ts", () => {
  const types = readSrc("lib/feedback/types.ts");

  it("BackfillMode type is defined", () => {
    expect(types).toContain("export type BackfillMode");
  });

  it("BackfillMode has exactly 3 values: current_week, two_weeks, unlimited", () => {
    // Match the type definition line
    const match = types.match(/export type BackfillMode\s*=\s*([^;]+);/);
    expect(match).not.toBeNull();
    const definition = match![1];
    expect(definition).toContain('"current_week"');
    expect(definition).toContain('"two_weeks"');
    expect(definition).toContain('"unlimited"');

    // Ensure no other values by counting the union members
    const members = definition.split("|").map((s) => s.trim());
    expect(members).toHaveLength(3);
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. MonitoringAthleteSummary uses backfillMode (not backfillDays)
// ═══════════════════════════════════════════════════════════════

describe("MonitoringAthleteSummary migration to backfillMode", () => {
  const types = readSrc("lib/feedback/types.ts");

  it("has backfillMode: BackfillMode field", () => {
    expect(types).toMatch(/backfillMode:\s*BackfillMode/);
  });

  it("does NOT have backfillDays: number field (old field removed)", () => {
    expect(types).not.toMatch(/backfillDays:\s*number/);
  });
});
