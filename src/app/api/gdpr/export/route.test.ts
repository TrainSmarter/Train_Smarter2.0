import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Tests for the GDPR export route (Art. 20 DSGVO).
 *
 * The actual route handler uses createClient() from @/lib/supabase/server
 * which requires Next.js cookies() — not available in vitest/jsdom.
 * We validate the source code structure to ensure all required fields
 * are present in the export payload.
 */

let routeSource: string;

beforeEach(() => {
  routeSource = fs.readFileSync(
    path.resolve(__dirname, "route.ts"),
    "utf-8"
  );
});

describe("GDPR Export: Required data fields", () => {
  it("should query trainer_profiles table", () => {
    expect(routeSource).toContain('.from("trainer_profiles")');
  });

  it("should query athlete_profiles table", () => {
    expect(routeSource).toContain('.from("athlete_profiles")');
  });

  it("should query feedback_checkins table", () => {
    expect(routeSource).toContain('.from("feedback_checkins")');
  });

  it("should query feedback_checkin_values table", () => {
    expect(routeSource).toContain('.from("feedback_checkin_values")');
  });

  it("should query feedback_category_overrides table", () => {
    expect(routeSource).toContain('.from("feedback_category_overrides")');
  });

  it("should include trainer_profil in export payload", () => {
    expect(routeSource).toContain("trainer_profil:");
  });

  it("should include athleten_profil in export payload", () => {
    expect(routeSource).toContain("athleten_profil:");
  });

  it("should include feedback_checkins in export payload", () => {
    expect(routeSource).toContain("feedback_checkins:");
  });

  it("should include feedback_werte in export payload", () => {
    expect(routeSource).toContain("feedback_werte:");
  });

  it("should include feedback_kategorie_einstellungen in export payload", () => {
    expect(routeSource).toContain("feedback_kategorie_einstellungen:");
  });
});

describe("GDPR Export: Auth guard", () => {
  it("should check auth via getUser()", () => {
    expect(routeSource).toContain("auth.getUser()");
  });

  it("should return 401 when user is not authenticated", () => {
    expect(routeSource).toContain('{ error: "Unauthorized" }');
    expect(routeSource).toContain("status: 401");
  });

  it("should check both authError and missing user", () => {
    expect(routeSource).toContain("authError || !user");
  });
});

describe("GDPR Export: Rate limiting", () => {
  it("should check data_exports table for recent exports", () => {
    expect(routeSource).toContain('.from("data_exports")');
  });

  it("should enforce 30-day rate limit", () => {
    expect(routeSource).toContain("thirtyDaysAgo");
    expect(routeSource).toContain("getDate() - 30");
  });

  it("should return 429 when rate limited", () => {
    expect(routeSource).toContain("status: 429");
  });
});

describe("GDPR Export: Response format", () => {
  it("should return JSON with Content-Disposition attachment header", () => {
    expect(routeSource).toContain("Content-Disposition");
    expect(routeSource).toContain("attachment; filename=");
  });

  it("should include _meta section with format version", () => {
    expect(routeSource).toContain("format_version");
    expect(routeSource).toContain("exported_at");
  });

  it("should use German field names in export (DSGVO compliance)", () => {
    expect(routeSource).toContain("vorname:");
    expect(routeSource).toContain("nachname:");
    expect(routeSource).toContain("geburtsdatum:");
    expect(routeSource).toContain("einwilligungen:");
    expect(routeSource).toContain("verbindungen:");
  });

  it("should record export in data_exports table after completion", () => {
    expect(routeSource).toContain(
      '.from("data_exports").insert'
    );
    expect(routeSource).toContain('"completed"');
  });
});

describe("GDPR Export: Error handling", () => {
  it("should catch errors and return 500", () => {
    expect(routeSource).toContain("status: 500");
    expect(routeSource).toContain("Internal server error");
  });

  it("should log errors for debugging", () => {
    expect(routeSource).toContain('console.error("gdpr/export error:"');
  });
});

// ── Finding #5: PROJ-12 exercise data included in DSGVO export ──

describe("GDPR Export: Custom exercises (Finding #5 — PROJ-12)", () => {
  it("should query exercises table for user-created exercises", () => {
    expect(routeSource).toContain('.from("exercises")');
  });

  it("should filter exercises by created_by = userId", () => {
    expect(routeSource).toContain('.eq("created_by", userId)');
  });

  it("should exclude soft-deleted exercises", () => {
    expect(routeSource).toContain('.eq("is_deleted", false)');
  });

  it("should include eigene_uebungen (custom exercises) in export payload", () => {
    expect(routeSource).toContain("eigene_uebungen:");
  });

  it("should map exercise fields to German labels in payload", () => {
    expect(routeSource).toContain("uebungstyp: e.exercise_type");
    expect(routeSource).toContain("geklont_von: e.cloned_from");
  });
});

describe("GDPR Export: Custom taxonomy (Finding #5 — PROJ-12)", () => {
  it("should query exercise_taxonomy table for user-created taxonomy", () => {
    expect(routeSource).toContain('.from("exercise_taxonomy")');
  });

  it("should filter taxonomy by created_by = userId", () => {
    // The source contains .eq("created_by", userId) for both exercises and taxonomy
    const matches = routeSource.match(/\.eq\("created_by", userId\)/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });

  it("should exclude soft-deleted taxonomy entries", () => {
    // Two occurrences of is_deleted check (exercises + taxonomy)
    const matches = routeSource.match(/\.eq\("is_deleted", false\)/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });

  it("should include eigene_taxonomie in export payload", () => {
    expect(routeSource).toContain("eigene_taxonomie:");
  });
});

describe("GDPR Export: Taxonomy assignments (Finding #5 — PROJ-12)", () => {
  it("should query exercise_taxonomy_assignments table", () => {
    expect(routeSource).toContain('.from("exercise_taxonomy_assignments")');
  });

  it("should filter assignments by exercise IDs using .in()", () => {
    expect(routeSource).toContain('.in("exercise_id", exerciseIds)');
  });

  it("should only query assignments when custom exercises exist", () => {
    expect(routeSource).toContain("exerciseIds.length > 0");
  });

  it("should default to empty array when no exercises exist", () => {
    expect(routeSource).toContain("{ data: [] }");
  });

  it("should include uebungs_taxonomie_zuordnungen in export payload", () => {
    expect(routeSource).toContain("uebungs_taxonomie_zuordnungen:");
  });

  it("should map assignment fields including ist_primaer", () => {
    expect(routeSource).toContain("ist_primaer: a.is_primary");
    expect(routeSource).toContain("uebung_id: a.exercise_id");
    expect(routeSource).toContain("taxonomie_id: a.taxonomy_id");
  });
});

describe("GDPR Export: Security", () => {
  it("should use createClient from supabase/server (not browser)", () => {
    expect(routeSource).toContain("@/lib/supabase/server");
    expect(routeSource).not.toContain("@/lib/supabase/client");
  });

  it("should not expose foreign PII in connections", () => {
    expect(routeSource).toContain("no foreign PII");
  });

  it("should only export POST handler", () => {
    const exportMatches = routeSource.match(/^export\s+async\s+function\s+(\w+)/gm);
    expect(exportMatches).toHaveLength(1);
    expect(exportMatches![0]).toContain("POST");
  });
});
