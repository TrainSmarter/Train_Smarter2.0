import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Tests for PROJ-6 feedback/queries.ts
 *
 * Source-code invariant tests verifying:
 * - Consent checks use direct table queries (RLS allows trainer access)
 * - Correct consent check pattern in all functions
 */

function readSrc(relativePath: string): string {
  return fs.readFileSync(
    path.resolve(__dirname, "../..", relativePath),
    "utf-8"
  );
}

describe("Consent check in queries.ts", () => {
  const queries = readSrc("lib/feedback/queries.ts");

  it("hasBodyWellnessConsent function exists", () => {
    expect(queries).toContain("async function hasBodyWellnessConsent");
  });

  it("hasBodyWellnessConsent queries user_consents with body_wellness_data", () => {
    const fnMatch = queries.match(
      /async function hasBodyWellnessConsent[\s\S]*?^}/m
    );
    expect(fnMatch).not.toBeNull();
    const fnBody = fnMatch![0];
    expect(fnBody).toContain('"body_wellness_data"');
    expect(fnBody).toContain("granted");
  });

  it("getMonitoringOverview fetches consent for all athletes in batch", () => {
    const fnMatch = queries.match(
      /export async function getMonitoringOverview[\s\S]*?^}/m
    );
    expect(fnMatch).not.toBeNull();
    const fnBody = fnMatch![0];
    expect(fnBody).toContain('.in("user_id", athleteIds)');
    expect(fnBody).toContain("consentMap");
  });
});

describe("getMonitoringOverview uses backfillMode", () => {
  const queries = readSrc("lib/feedback/queries.ts");

  it("selects feedback_backfill_mode from connections", () => {
    expect(queries).toContain("feedback_backfill_mode");
  });

  it("maps backfillMode in athlete summary (not backfillDays)", () => {
    expect(queries).toContain("backfillMode:");
    expect(queries).not.toMatch(/backfillDays\s*:/);
  });

  it("imports BackfillMode type", () => {
    expect(queries).toContain("BackfillMode");
  });
});

describe("getAthleteDetail consent flag", () => {
  const queries = readSrc("lib/feedback/queries.ts");

  it("return type includes hasBodyWellnessConsent: boolean", () => {
    expect(queries).toContain("hasBodyWellnessConsent: boolean");
  });

  it("returns athleteConsent value", () => {
    expect(queries).toContain("hasBodyWellnessConsent: athleteConsent");
  });
});
