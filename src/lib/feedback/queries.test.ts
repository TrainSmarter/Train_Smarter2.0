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

// ═══════════════════════════════════════════════════════════════
// Regression: Direct queries NOT RPC (PostgREST cache issue)
// ═══════════════════════════════════════════════════════════════

describe("Regression: queries.ts uses direct table queries, NOT RPC", () => {
  const queries = readSrc("lib/feedback/queries.ts");

  it("hasBodyWellnessConsent uses .from('user_consents'), NOT supabase.rpc", () => {
    const fnMatch = queries.match(
      /async function hasBodyWellnessConsent[\s\S]*?^}/m
    );
    expect(fnMatch).not.toBeNull();
    const fnBody = fnMatch![0];
    expect(fnBody).toContain('.from("user_consents")');
    expect(fnBody).not.toContain("supabase.rpc");
  });

  it("getMonitoringOverview uses .from('user_consents'), NOT supabase.rpc", () => {
    const fnMatch = queries.match(
      /export async function getMonitoringOverview[\s\S]*?^}/m
    );
    expect(fnMatch).not.toBeNull();
    const fnBody = fnMatch![0];
    expect(fnBody).toContain('.from("user_consents")');
    expect(fnBody).not.toContain("supabase.rpc");
  });
});

// ═══════════════════════════════════════════════════════════════
// Migration: RLS policy for trainer consent read
// ═══════════════════════════════════════════════════════════════

describe("Migration: consent_rls_trainer_read", () => {
  const migration = readSrc(
    "../supabase/migrations/20260319300000_consent_rls_trainer_read.sql"
  );

  it("creates 'Trainers can read connected athlete consents' policy", () => {
    expect(migration).toContain(
      "Trainers can read connected athlete consents"
    );
  });

  it("policy is on user_consents table for SELECT", () => {
    expect(migration).toContain("user_consents");
    expect(migration).toContain("FOR SELECT");
  });

  it("policy checks trainer_athlete_connections with active status", () => {
    expect(migration).toContain("trainer_athlete_connections");
    expect(migration).toContain("trainer_id = auth.uid()");
    expect(migration).toContain("athlete_id = user_consents.user_id");
    expect(migration).toContain("status = 'active'");
  });

  it("uses IF NOT EXISTS guard", () => {
    expect(migration).toContain("IF NOT EXISTS");
  });
});

// ═══════════════════════════════════════════════════════════════
// backfill.ts: computeBackfillMinDate is in separate module
// ═══════════════════════════════════════════════════════════════

describe("backfill.ts module separation", () => {
  const backfill = readSrc("lib/feedback/backfill.ts");
  const actions = readSrc("lib/feedback/actions.ts");

  it("backfill.ts exports computeBackfillMinDate", () => {
    expect(backfill).toContain("export function computeBackfillMinDate");
  });

  it("backfill.ts imports BackfillMode from types", () => {
    expect(backfill).toContain('import type { BackfillMode } from "./types"');
  });

  it("actions.ts imports computeBackfillMinDate from backfill", () => {
    expect(actions).toContain(
      'import { computeBackfillMinDate } from "./backfill"'
    );
  });

  it("actions.ts does NOT define computeBackfillMinDate itself", () => {
    expect(actions).not.toContain("export function computeBackfillMinDate");
    expect(actions).not.toMatch(
      /^function computeBackfillMinDate/m
    );
  });
});
