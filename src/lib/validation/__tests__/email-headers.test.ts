/**
 * email-headers.test.ts
 *
 * Validates Edge Function source code to prevent regressions of:
 * - BUG 1: Fake Outlook headers (X-Mailer must NOT be "Microsoft Outlook")
 * - BUG 2: List-Unsubscribe on transactional emails (must NOT be present)
 *
 * These tests read the Edge Function source files and check for dangerous
 * patterns that cause spam filter issues.
 */
import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Load Edge Function source code
// ---------------------------------------------------------------------------

const EDGE_FUNCTIONS_DIR = path.resolve(__dirname, "../../../../supabase/functions");

const EDGE_FUNCTIONS = [
  {
    name: "send-auth-email",
    path: path.join(EDGE_FUNCTIONS_DIR, "send-auth-email", "index.ts"),
  },
  {
    name: "send-invitation-email",
    path: path.join(EDGE_FUNCTIONS_DIR, "send-invitation-email", "index.ts"),
  },
];

const sources: Record<string, string> = {};

beforeAll(() => {
  for (const fn of EDGE_FUNCTIONS) {
    if (fs.existsSync(fn.path)) {
      sources[fn.name] = fs.readFileSync(fn.path, "utf-8");
    }
  }
});

// ---------------------------------------------------------------------------
// BUG 1: No fake Outlook headers (phishing detection trigger)
// ---------------------------------------------------------------------------

describe.each(EDGE_FUNCTIONS)("$name — BUG 1: No fake Outlook headers", ({ name }) => {
  it("does NOT contain 'Microsoft Outlook' anywhere", () => {
    expect(sources[name]).toBeDefined();
    expect(sources[name].toLowerCase()).not.toContain("microsoft outlook");
  });

  it("does NOT contain 'X-OlkEid' header", () => {
    expect(sources[name]).toBeDefined();
    expect(sources[name]).not.toContain("X-OlkEid");
  });

  it("does NOT contain 'Thread-Index' header (Outlook-specific)", () => {
    expect(sources[name]).toBeDefined();
    // Only flag if it is set as a header key (not in a comment)
    const lines = sources[name].split("\n").filter(
      (line) => !line.trimStart().startsWith("//") && !line.trimStart().startsWith("*")
    );
    const codeOnly = lines.join("\n");
    expect(codeOnly).not.toMatch(/"Thread-Index"/);
  });

  it("DOES set X-Mailer to 'Train Smarter Mailer' (our override)", () => {
    expect(sources[name]).toBeDefined();
    expect(sources[name]).toContain('"X-Mailer"');
    expect(sources[name]).toContain("Train Smarter Mailer");
  });
});

// ---------------------------------------------------------------------------
// BUG 2: No List-Unsubscribe on transactional emails
// ---------------------------------------------------------------------------

describe.each(EDGE_FUNCTIONS)("$name — BUG 2: No List-Unsubscribe headers", ({ name }) => {
  it("does NOT contain 'List-Unsubscribe' header", () => {
    expect(sources[name]).toBeDefined();
    // Check code lines only (skip comments)
    const lines = sources[name].split("\n").filter(
      (line) => !line.trimStart().startsWith("//") && !line.trimStart().startsWith("*")
    );
    const codeOnly = lines.join("\n");
    expect(codeOnly).not.toMatch(/List-Unsubscribe/i);
  });

  it("does NOT contain 'List-Unsubscribe-Post' header", () => {
    expect(sources[name]).toBeDefined();
    const lines = sources[name].split("\n").filter(
      (line) => !line.trimStart().startsWith("//") && !line.trimStart().startsWith("*")
    );
    const codeOnly = lines.join("\n");
    expect(codeOnly).not.toMatch(/List-Unsubscribe-Post/i);
  });
});

// ---------------------------------------------------------------------------
// Required transactional headers
// ---------------------------------------------------------------------------

describe.each(EDGE_FUNCTIONS)("$name — Required transactional email headers", ({ name }) => {
  it("DOES set 'Auto-Submitted' header (RFC 3834 compliance)", () => {
    expect(sources[name]).toBeDefined();
    expect(sources[name]).toContain('"Auto-Submitted"');
    expect(sources[name]).toContain("auto-generated");
  });

  it("does NOT set 'Precedence: bulk' (signals marketing email)", () => {
    expect(sources[name]).toBeDefined();
    // Check code lines only
    const lines = sources[name].split("\n").filter(
      (line) => !line.trimStart().startsWith("//") && !line.trimStart().startsWith("*")
    );
    const codeOnly = lines.join("\n");
    expect(codeOnly).not.toMatch(/["']Precedence["']\s*:\s*["']bulk["']/i);
    expect(codeOnly).not.toMatch(/Precedence.*bulk/i);
  });

  it("DOES set a unique Message-ID per email", () => {
    expect(sources[name]).toBeDefined();
    expect(sources[name]).toContain('"Message-ID"');
    expect(sources[name]).toContain("generateMessageId");
  });

  it("DOES set Reply-To header", () => {
    expect(sources[name]).toBeDefined();
    expect(sources[name]).toContain('"Reply-To"');
  });

  it("DOES set Feedback-ID header", () => {
    expect(sources[name]).toBeDefined();
    expect(sources[name]).toContain('"Feedback-ID"');
  });

  it("DOES set X-Entity-Ref-ID for deduplication", () => {
    expect(sources[name]).toBeDefined();
    expect(sources[name]).toContain('"X-Entity-Ref-ID"');
  });
});

// ---------------------------------------------------------------------------
// denomailer import check (the library that injects fake headers)
// ---------------------------------------------------------------------------

describe.each(EDGE_FUNCTIONS)("$name — denomailer usage", ({ name }) => {
  it("uses denomailer library (known to inject fake headers — X-Mailer override is critical)", () => {
    expect(sources[name]).toBeDefined();
    // If denomailer is used, we MUST have the X-Mailer override
    if (sources[name].includes("denomailer")) {
      expect(sources[name]).toContain('"X-Mailer": "Train Smarter Mailer');
    }
  });
});

// ---------------------------------------------------------------------------
// Template security checks
// ---------------------------------------------------------------------------

describe.each(EDGE_FUNCTIONS)("$name — Template security", ({ name }) => {
  it("does NOT use Deno.readTextFile (no filesystem access in Edge Functions)", () => {
    expect(sources[name]).toBeDefined();
    const lines = sources[name].split("\n").filter(
      (line) => !line.trimStart().startsWith("//") && !line.trimStart().startsWith("*")
    );
    const codeOnly = lines.join("\n");
    expect(codeOnly).not.toContain("Deno.readTextFile");
  });

  it("uses inline templates (TEMPLATES object or template string)", () => {
    expect(sources[name]).toBeDefined();
    // Should have inline HTML templates
    expect(sources[name]).toContain("<!DOCTYPE html>");
  });
});

// ---------------------------------------------------------------------------
// DSGVO/GDPR compliance in logging
// ---------------------------------------------------------------------------

describe.each(EDGE_FUNCTIONS)("$name — DSGVO-compliant logging", ({ name }) => {
  it("hashes email addresses before logging (no PII in logs)", () => {
    expect(sources[name]).toBeDefined();
    // Should use SHA-256 hashing and log a hash, not raw email
    expect(sources[name]).toContain("SHA-256");
    // Should reference emailHash or to_hash in log output
    expect(sources[name]).toMatch(/emailHash|to_hash|email_hash/i);
  });
});
