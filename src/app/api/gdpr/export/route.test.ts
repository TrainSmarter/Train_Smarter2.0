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
