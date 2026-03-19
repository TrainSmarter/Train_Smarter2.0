import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Tests for PROJ-6 feedback/queries.ts changes since commit 63028c7
 *
 * Source-code invariant tests verifying:
 * - Consent checks use RPC functions (not direct table queries)
 * - No direct .from("user_consents") in trainer-facing functions
 */

// ── Helpers ─────────────────────────────────────────────────────

function readSrc(relativePath: string): string {
  return fs.readFileSync(
    path.resolve(__dirname, "../..", relativePath),
    "utf-8"
  );
}

// ═══════════════════════════════════════════════════════════════
// 1. Consent RPC migration: hasBodyWellnessConsent uses RPC
// ═══════════════════════════════════════════════════════════════

describe("Consent RPC migration in queries.ts", () => {
  const queries = readSrc("lib/feedback/queries.ts");

  it("hasBodyWellnessConsent function exists", () => {
    expect(queries).toContain("async function hasBodyWellnessConsent");
  });

  it("hasBodyWellnessConsent calls check_athlete_consent RPC", () => {
    // Extract the function body
    const fnMatch = queries.match(
      /async function hasBodyWellnessConsent[\s\S]*?^}/m
    );
    expect(fnMatch).not.toBeNull();
    const fnBody = fnMatch![0];
    expect(fnBody).toContain('supabase.rpc("check_athlete_consent"');
  });

  it("hasBodyWellnessConsent does NOT use direct .from('user_consents') query", () => {
    const fnMatch = queries.match(
      /async function hasBodyWellnessConsent[\s\S]*?^}/m
    );
    expect(fnMatch).not.toBeNull();
    const fnBody = fnMatch![0];
    expect(fnBody).not.toContain('.from("user_consents")');
  });

  it("hasBodyWellnessConsent passes p_athlete_id and p_consent_type", () => {
    const fnMatch = queries.match(
      /async function hasBodyWellnessConsent[\s\S]*?^}/m
    );
    const fnBody = fnMatch![0];
    expect(fnBody).toContain("p_athlete_id");
    expect(fnBody).toContain("p_consent_type");
    expect(fnBody).toContain('"body_wellness_data"');
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. getMonitoringOverview uses batch RPC for consent
// ═══════════════════════════════════════════════════════════════

describe("getMonitoringOverview batch consent check", () => {
  const queries = readSrc("lib/feedback/queries.ts");

  it("calls check_athletes_consent RPC (batch function)", () => {
    const fnMatch = queries.match(
      /export async function getMonitoringOverview[\s\S]*?^}/m
    );
    expect(fnMatch).not.toBeNull();
    const fnBody = fnMatch![0];
    expect(fnBody).toContain('supabase.rpc("check_athletes_consent"');
  });

  it("passes p_athlete_ids and p_consent_type to batch RPC", () => {
    const fnMatch = queries.match(
      /export async function getMonitoringOverview[\s\S]*?^}/m
    );
    const fnBody = fnMatch![0];
    expect(fnBody).toContain("p_athlete_ids");
    expect(fnBody).toContain("p_consent_type");
  });

  it("builds a consentMap from RPC results", () => {
    expect(queries).toContain("consentMap");
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. Regression: No direct user_consents queries in trainer-facing functions
// ═══════════════════════════════════════════════════════════════

describe("No direct .from('user_consents') in trainer-facing queries", () => {
  const queries = readSrc("lib/feedback/queries.ts");

  it("queries.ts does NOT contain .from('user_consents') anywhere", () => {
    // All consent checks should go through RPC
    expect(queries).not.toContain('.from("user_consents")');
    expect(queries).not.toContain(".from('user_consents')");
  });

  it("queries.ts uses RPC for ALL consent checks", () => {
    // Ensure there are references to the RPC functions
    expect(queries).toContain("check_athlete_consent");
    expect(queries).toContain("check_athletes_consent");
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. getMonitoringOverview uses backfillMode (not backfillDays)
// ═══════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════
// 5. getAthleteDetail returns hasBodyWellnessConsent flag
// ═══════════════════════════════════════════════════════════════

describe("getAthleteDetail consent flag", () => {
  const queries = readSrc("lib/feedback/queries.ts");

  it("return type includes hasBodyWellnessConsent: boolean", () => {
    expect(queries).toContain("hasBodyWellnessConsent: boolean");
  });

  it("returns athleteConsent value", () => {
    expect(queries).toContain("hasBodyWellnessConsent: athleteConsent");
  });
});
