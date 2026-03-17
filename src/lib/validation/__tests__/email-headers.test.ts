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

// ---------------------------------------------------------------------------
// Spam Prevention — Future-Proofing
// ---------------------------------------------------------------------------

describe.each(EDGE_FUNCTIONS)("$name — Spam Prevention: Header Whitelist", ({ name }) => {
  // Only these headers are allowed in the headers object passed to client.send()
  const ALLOWED_HEADERS = [
    "Message-ID",
    "X-Entity-Ref-ID",
    "Feedback-ID",
    "Reply-To",
    "Auto-Submitted",
    "X-Mailer",
  ];

  it("headers object ONLY contains allowed headers (whitelist check)", () => {
    expect(sources[name]).toBeDefined();
    // Extract the headers object from client.send({ ... headers: { ... } })
    const headersMatch = sources[name].match(
      /headers\s*:\s*\{([^}]+)\}/
    );
    expect(headersMatch).not.toBeNull();

    const headersBlock = headersMatch![1];
    // Extract all quoted header names from the block
    const headerNames = [...headersBlock.matchAll(/"([^"]+)"\s*:/g)].map(
      (m) => m[1]
    );

    expect(headerNames.length).toBeGreaterThan(0);

    for (const headerName of headerNames) {
      expect(ALLOWED_HEADERS).toContain(headerName);
    }
  });
});

describe.each(EDGE_FUNCTIONS)("$name — Spam Prevention: Content-Type / multipart", ({ name }) => {
  it("htmlToPlainText() function exists (required for multipart/alternative)", () => {
    expect(sources[name]).toBeDefined();
    expect(sources[name]).toContain("function htmlToPlainText");
  });

  it("client.send() includes 'content' parameter for plain-text part", () => {
    expect(sources[name]).toBeDefined();
    // The send() call must include content: plainText (or similar)
    const sendMatch = sources[name].match(
      /client\.send\(\s*\{([\s\S]*?)\}\s*\)/
    );
    expect(sendMatch).not.toBeNull();

    const sendBlock = sendMatch![1];
    // Must have both 'content' and 'html' keys (html may use shorthand syntax: html, instead of html: html)
    expect(sendBlock).toMatch(/\bcontent\b\s*:/);
    expect(sendBlock).toMatch(/\bhtml\b\s*[,:]/);
  });

  it("plainText variable is generated from htmlToPlainText() before sending", () => {
    expect(sources[name]).toBeDefined();
    // There should be a call like: const plainText = htmlToPlainText(html)
    expect(sources[name]).toMatch(/plainText\s*=\s*htmlToPlainText\(/);
  });
});

describe.each(EDGE_FUNCTIONS)("$name — Spam Prevention: From Address", ({ name }) => {
  it("from address uses train-smarter.at domain (via smtpUser)", () => {
    expect(sources[name]).toBeDefined();
    // The from field in client.send() should reference smtpUser which is the SMTP_USER env var
    // The config.toml enforces admin_email = noreply@train-smarter.at
    // In code: from: `Train Smarter <${smtpUser}>`
    expect(sources[name]).toMatch(/from\s*:\s*`Train Smarter\s*</);
  });

  it("from display name is 'Train Smarter' (not empty, not 'no-reply')", () => {
    expect(sources[name]).toBeDefined();
    // Must contain the display name "Train Smarter" in the from field
    expect(sources[name]).toContain("Train Smarter <");
    // Must NOT use "no-reply" or "noreply" as display name
    expect(sources[name]).not.toMatch(/from\s*:\s*["`']no-?reply/i);
  });
});

describe.each(EDGE_FUNCTIONS)("$name — Spam Prevention: No Tracking Pixels", ({ name }) => {
  it("source code does NOT contain tracking pixel patterns", () => {
    expect(sources[name]).toBeDefined();
    const code = sources[name];
    // No tracking pixel images
    expect(code).not.toMatch(/<img[^>]*src="[^"]*track/i);
    expect(code).not.toMatch(/<img[^>]*1x1/i);
    expect(code).not.toMatch(/beacon/i);
    expect(code).not.toMatch(/tracking[_-]?pixel/i);
    expect(code).not.toMatch(/open[_-]?track/i);
  });
});

describe.each(EDGE_FUNCTIONS)("$name — Spam Prevention: Footer Compliance", ({ name }) => {
  it("templates contain a physical address (Graz or Austria/Oesterreich)", () => {
    expect(sources[name]).toBeDefined();
    // Must reference physical location — Graz or Österreich/Austria
    expect(sources[name]).toMatch(/Graz/);
    expect(sources[name]).toMatch(/sterreich|Austria/);
  });

  it("templates contain train-smarter.at domain", () => {
    expect(sources[name]).toBeDefined();
    expect(sources[name]).toContain("train-smarter.at");
  });
});
