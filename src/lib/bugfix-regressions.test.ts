import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Regression tests for bug fixes applied 2026-03-17
 *
 * These tests prevent previously fixed bugs from being reintroduced.
 * Each section references the specific bug ID and feature.
 */

// ── Helpers ─────────────────────────────────────────────────────────

function readSrc(relativePath: string): string {
  return fs.readFileSync(
    path.resolve(__dirname, "..", relativePath),
    "utf-8"
  );
}

function readRoot(relativePath: string): string {
  return fs.readFileSync(
    path.resolve(__dirname, "../..", relativePath),
    "utf-8"
  );
}

function readMessages(locale: "de" | "en"): Record<string, unknown> {
  const content = fs.readFileSync(
    path.resolve(__dirname, "..", "messages", `${locale}.json`),
    "utf-8"
  );
  return JSON.parse(content);
}

// ═══════════════════════════════════════════════════════════════════
// PROJ-16 BUG-5: env.ts must NOT be dead code
// All Supabase clients and API routes must import from @/lib/env
// instead of using process.env with non-null assertions
// ═══════════════════════════════════════════════════════════════════

describe("PROJ-16 BUG-5: env.ts is wired into all Supabase usages", () => {
  describe("Supabase client files import env.ts", () => {
    it("client.ts imports from @/lib/env", () => {
      const content = readSrc("lib/supabase/client.ts");
      expect(content).toContain('import { env } from "@/lib/env"');
    });

    it("server.ts imports from @/lib/env", () => {
      const content = readSrc("lib/supabase/server.ts");
      expect(content).toContain('import { env } from "@/lib/env"');
    });

    it("middleware.ts imports from @/lib/env", () => {
      const content = readSrc("lib/supabase/middleware.ts");
      expect(content).toContain('import { env } from "@/lib/env"');
    });
  });

  describe("Supabase client files use env.X (not process.env.X!)", () => {
    it("client.ts uses env.NEXT_PUBLIC_SUPABASE_URL", () => {
      const content = readSrc("lib/supabase/client.ts");
      expect(content).toContain("env.NEXT_PUBLIC_SUPABASE_URL");
      expect(content).not.toContain("process.env.NEXT_PUBLIC_SUPABASE_URL!");
    });

    it("server.ts uses env.NEXT_PUBLIC_SUPABASE_URL", () => {
      const content = readSrc("lib/supabase/server.ts");
      expect(content).toContain("env.NEXT_PUBLIC_SUPABASE_URL");
      expect(content).not.toContain("process.env.NEXT_PUBLIC_SUPABASE_URL!");
    });

    it("middleware.ts uses env.NEXT_PUBLIC_SUPABASE_URL", () => {
      const content = readSrc("lib/supabase/middleware.ts");
      expect(content).toContain("env.NEXT_PUBLIC_SUPABASE_URL");
      expect(content).not.toContain("process.env.NEXT_PUBLIC_SUPABASE_URL!");
    });
  });

  describe("API routes use env.ts (not process.env with assertions)", () => {
    const apiRoutes = [
      "app/api/health/route.ts",
      "app/api/auth/set-role/route.ts",
      "app/api/auth/complete-onboarding/route.ts",
      "app/api/gdpr/delete-account/route.ts",
    ];

    for (const route of apiRoutes) {
      it(`${route} imports from @/lib/env`, () => {
        const content = readSrc(route);
        expect(content).toContain('from "@/lib/env"');
      });

      it(`${route} does not use process.env.SUPABASE_SERVICE_ROLE_KEY with !`, () => {
        const content = readSrc(route);
        expect(content).not.toContain("process.env.SUPABASE_SERVICE_ROLE_KEY!");
      });
    }
  });

  describe("No remaining process.env non-null assertions for Supabase vars", () => {
    // Files that legitimately contain process.env references (env.ts, commented-out code)
    const skipFiles = ["env.ts", "supabase.ts"];

    it("no process.env.NEXT_PUBLIC_SUPABASE_URL! anywhere in src/ (active code)", () => {
      const srcDir = path.resolve(__dirname, "..");
      const files = getAllTsFiles(srcDir);
      for (const file of files) {
        if (skipFiles.some((s) => file.endsWith(s))) continue;
        const content = fs.readFileSync(file, "utf-8");
        expect(content, `Found in ${file}`).not.toContain(
          "process.env.NEXT_PUBLIC_SUPABASE_URL!"
        );
      }
    });

    it("no process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! anywhere in src/ (active code)", () => {
      const srcDir = path.resolve(__dirname, "..");
      const files = getAllTsFiles(srcDir);
      for (const file of files) {
        if (skipFiles.some((s) => file.endsWith(s))) continue;
        const content = fs.readFileSync(file, "utf-8");
        expect(content, `Found in ${file}`).not.toContain(
          "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!"
        );
      }
    });

    it("no process.env.SUPABASE_SERVICE_ROLE_KEY! anywhere in src/ (active code)", () => {
      const srcDir = path.resolve(__dirname, "..");
      const files = getAllTsFiles(srcDir);
      for (const file of files) {
        if (skipFiles.some((s) => file.endsWith(s))) continue;
        const content = fs.readFileSync(file, "utf-8");
        expect(content, `Found in ${file}`).not.toContain(
          "process.env.SUPABASE_SERVICE_ROLE_KEY!"
        );
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// PROJ-16 BUG-9: No hardcoded test credentials in source code
// ═══════════════════════════════════════════════════════════════════

describe("PROJ-16 BUG-9: No hardcoded test credentials", () => {
  const authSetup = readRoot("tests/e2e/fixtures/auth.setup.ts");

  it("does not contain hardcoded trainer password", () => {
    expect(authSetup).not.toContain("TestTrainer123!");
    expect(authSetup).not.toContain("TestTrainer123");
  });

  it("does not contain hardcoded athlete password", () => {
    expect(authSetup).not.toContain("TestAthlete123!");
    expect(authSetup).not.toContain("TestAthlete123");
  });

  it("does not contain hardcoded test email fallbacks", () => {
    // Should not have || "fallback@..." patterns
    expect(authSetup).not.toMatch(/\|\|\s*["'].*@train-smarter\.at["']/);
  });

  it("requires E2E_TRAINER_EMAIL env var (throws if missing)", () => {
    expect(authSetup).toContain("E2E_TRAINER_EMAIL");
    expect(authSetup).toContain("E2E_TRAINER_PASSWORD");
    expect(authSetup).toMatch(/throw new Error/);
  });

  it("requires E2E_ATHLETE_EMAIL env var (throws if missing)", () => {
    expect(authSetup).toContain("E2E_ATHLETE_EMAIL");
    expect(authSetup).toContain("E2E_ATHLETE_PASSWORD");
  });

  it("reads credentials from process.env only", () => {
    expect(authSetup).toContain("process.env.E2E_TRAINER_EMAIL");
    expect(authSetup).toContain("process.env.E2E_TRAINER_PASSWORD");
    expect(authSetup).toContain("process.env.E2E_ATHLETE_EMAIL");
    expect(authSetup).toContain("process.env.E2E_ATHLETE_PASSWORD");
  });
});

// ═══════════════════════════════════════════════════════════════════
// PROJ-6 SECURITY-3: DSGVO consent check for trainer viewing data
// Server-side queries must check body_wellness_data consent
// ═══════════════════════════════════════════════════════════════════

describe("PROJ-6 SECURITY-3: Server-side DSGVO consent checks in queries.ts", () => {
  const queries = readSrc("lib/feedback/queries.ts");

  it("has hasBodyWellnessConsent helper function", () => {
    expect(queries).toContain("async function hasBodyWellnessConsent");
  });

  it("helper queries user_consents table for body_wellness_data", () => {
    expect(queries).toContain('.eq("consent_type", "body_wellness_data")');
  });

  describe("getAthleteTrendData checks consent", () => {
    it("calls hasBodyWellnessConsent before returning data", () => {
      // Extract the function body
      const fnMatch = queries.match(
        /export async function getAthleteTrendData[\s\S]*?^}/m
      );
      expect(fnMatch).not.toBeNull();
      const fnBody = fnMatch![0];
      expect(fnBody).toContain("hasBodyWellnessConsent");
    });

    it("returns empty array when consent is revoked", () => {
      const fnMatch = queries.match(
        /export async function getAthleteTrendData[\s\S]*?^}/m
      );
      const fnBody = fnMatch![0];
      expect(fnBody).toContain("if (!hasConsent) return []");
    });
  });

  describe("getMonitoringOverview checks consent per athlete", () => {
    it("fetches consent status for all athletes in batch", () => {
      const fnMatch = queries.match(
        /export async function getMonitoringOverview[\s\S]*?^}/m
      );
      expect(fnMatch).not.toBeNull();
      const fnBody = fnMatch![0];
      expect(fnBody).toContain('.in("user_id", athleteIds)');
    });

    it("nulls out weightTrend when athlete revokes consent", () => {
      expect(queries).toContain("athleteHasConsent");
      // weightTrend should be conditionally set based on consent
      expect(queries).toMatch(/athleteHasConsent && summary\?\.weight_trend/);
    });

    it("nulls out latestWeight when athlete revokes consent", () => {
      expect(queries).toMatch(/athleteHasConsent && summary\?\.latest_weight/);
    });
  });

  describe("getAthleteDetail checks consent", () => {
    it("checks consent and returns hasBodyWellnessConsent flag", () => {
      // Check the full queries file for getAthleteDetail patterns
      expect(queries).toContain("export async function getAthleteDetail");
      expect(queries).toContain("hasBodyWellnessConsent: boolean");
      expect(queries).toContain("hasBodyWellnessConsent: athleteConsent");
    });
  });

  describe("getCheckinHistory checks consent", () => {
    it("returns empty when consent is revoked", () => {
      const fnMatch = queries.match(
        /export async function getCheckinHistory[\s\S]*?^}/m
      );
      expect(fnMatch).not.toBeNull();
      const fnBody = fnMatch![0];
      expect(fnBody).toContain("hasBodyWellnessConsent");
      expect(fnBody).toContain(
        'if (!hasConsent) return { entries: [], hasMore: false }'
      );
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// PROJ-6 SECURITY-3: Trainer UI shows consent warning
// ═══════════════════════════════════════════════════════════════════

describe("PROJ-6 SECURITY-3: Trainer detail view shows consent warning", () => {
  it("athlete-detail-view accepts hasBodyWellnessConsent prop", () => {
    const content = readSrc("components/feedback/athlete-detail-view.tsx");
    expect(content).toContain("hasBodyWellnessConsent");
  });

  it("i18n key consentRevokedTrainer exists in de.json", () => {
    const de = readMessages("de") as Record<string, Record<string, unknown>>;
    const feedback = de.feedback as Record<string, string>;
    expect(feedback.consentRevokedTrainer).toBeDefined();
    expect(feedback.consentRevokedTrainer.length).toBeGreaterThan(0);
  });

  it("i18n key consentRevokedTrainer exists in en.json", () => {
    const en = readMessages("en") as Record<string, Record<string, unknown>>;
    const feedback = en.feedback as Record<string, string>;
    expect(feedback.consentRevokedTrainer).toBeDefined();
    expect(feedback.consentRevokedTrainer.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// PROJ-11 BUG-1: Legal links in sidebar for logged-in users
// ═══════════════════════════════════════════════════════════════════

describe("PROJ-11 BUG-1: Legal links in app sidebar", () => {
  const sidebar = readSrc("components/app-sidebar.tsx");

  it("imports Link from @/i18n/navigation (not next/link)", () => {
    expect(sidebar).toContain('import { Link } from "@/i18n/navigation"');
    // Should NOT import from next/link
    expect(sidebar).not.toContain('from "next/link"');
  });

  it("renders link to /datenschutz", () => {
    expect(sidebar).toContain('href="/datenschutz"');
  });

  it("renders link to /impressum", () => {
    expect(sidebar).toContain('href="/impressum"');
  });

  it("renders link to /agb", () => {
    expect(sidebar).toContain('href="/agb"');
  });

  it("uses footer translations for link text", () => {
    expect(sidebar).toContain('tFooter("privacy")');
    expect(sidebar).toContain('tFooter("imprint")');
    expect(sidebar).toContain('tFooter("terms")');
  });

  it("has accessible aria-label for legal links nav", () => {
    expect(sidebar).toMatch(/aria-label=\{.*legalLinks/);
  });

  it("i18n key sidebar.legalLinks exists in de.json", () => {
    const de = readMessages("de") as Record<string, Record<string, unknown>>;
    const sidebarNs = de.sidebar as Record<string, string>;
    expect(sidebarNs.legalLinks).toBeDefined();
  });

  it("i18n key sidebar.legalLinks exists in en.json", () => {
    const en = readMessages("en") as Record<string, Record<string, unknown>>;
    const sidebarNs = en.sidebar as Record<string, string>;
    expect(sidebarNs.legalLinks).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════
// Helper: Recursively get all .ts/.tsx files in a directory
// ═══════════════════════════════════════════════════════════════════

function getAllTsFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules, .next, test directories
      if (
        entry.name === "node_modules" ||
        entry.name === ".next" ||
        entry.name === "test"
      ) {
        continue;
      }
      results.push(...getAllTsFiles(fullPath));
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      // Skip test files themselves
      if (entry.name.endsWith(".test.ts") || entry.name.endsWith(".test.tsx")) {
        continue;
      }
      results.push(fullPath);
    }
  }
  return results;
}
