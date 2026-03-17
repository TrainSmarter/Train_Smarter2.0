/**
 * email-templates.test.ts
 *
 * Validates email template completeness, variable replacement, language
 * correctness, and subject line branding. All tests are static analysis
 * (reading source files) — no runtime or network calls.
 */
import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Load Edge Function source code
// ---------------------------------------------------------------------------

const EDGE_FUNCTIONS_DIR = path.resolve(__dirname, "../../../../supabase/functions");

const AUTH_EMAIL_PATH = path.join(EDGE_FUNCTIONS_DIR, "send-auth-email", "index.ts");
const INVITATION_EMAIL_PATH = path.join(EDGE_FUNCTIONS_DIR, "send-invitation-email", "index.ts");

let authSource: string;
let invitationSource: string;

beforeAll(() => {
  authSource = fs.readFileSync(AUTH_EMAIL_PATH, "utf-8");
  invitationSource = fs.readFileSync(INVITATION_EMAIL_PATH, "utf-8");
});

// ---------------------------------------------------------------------------
// Template Completeness — send-auth-email
// ---------------------------------------------------------------------------

describe("send-auth-email — Template Completeness", () => {
  const REQUIRED_TEMPLATES = [
    "confirmation_de",
    "confirmation_en",
    "recovery_de",
    "recovery_en",
    "magic_link_de",
    "magic_link_en",
    "email_change_de",
    "email_change_en",
    "invite_de",
    "invite_en",
  ];

  it.each(REQUIRED_TEMPLATES)("template '%s' exists in TEMPLATES object", (templateKey) => {
    // The TEMPLATES object should have a key matching this name
    // e.g. confirmation_de: `<!DOCTYPE html>...`
    const pattern = new RegExp(`${templateKey}\\s*:\\s*\``);
    expect(authSource).toMatch(pattern);
  });

  it.each(REQUIRED_TEMPLATES)("template '%s' contains <!DOCTYPE html>", (templateKey) => {
    // Extract the template content between the key and the next key or closing brace
    const pattern = new RegExp(
      `${templateKey}\\s*:\\s*\`([\\s\\S]*?)\``,
    );
    const match = authSource.match(pattern);
    expect(match).not.toBeNull();
    expect(match![1]).toContain("<!DOCTYPE html>");
  });

  it.each(REQUIRED_TEMPLATES)("template '%s' contains a CTA button (<a href=)", (templateKey) => {
    const pattern = new RegExp(
      `${templateKey}\\s*:\\s*\`([\\s\\S]*?)\``,
    );
    const match = authSource.match(pattern);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/<a\s+href="/);
  });

  it.each(REQUIRED_TEMPLATES)("template '%s' contains footer with address", (templateKey) => {
    const pattern = new RegExp(
      `${templateKey}\\s*:\\s*\`([\\s\\S]*?)\``,
    );
    const match = authSource.match(pattern);
    expect(match).not.toBeNull();
    const content = match![1];
    expect(content).toMatch(/Graz/);
    expect(content).toMatch(/train-smarter\.at/);
  });
});

// ---------------------------------------------------------------------------
// Template Completeness — send-invitation-email
// ---------------------------------------------------------------------------

describe("send-invitation-email — Template Completeness", () => {
  it("DE template (TEMPLATE_DE) exists and contains <!DOCTYPE html>", () => {
    expect(invitationSource).toMatch(/TEMPLATE_DE\s*=\s*`/);
    const match = invitationSource.match(/TEMPLATE_DE\s*=\s*`([\s\S]*?)`/);
    expect(match).not.toBeNull();
    expect(match![1]).toContain("<!DOCTYPE html>");
  });

  it("EN template (TEMPLATE_EN) exists and contains <!DOCTYPE html>", () => {
    expect(invitationSource).toMatch(/TEMPLATE_EN\s*=\s*`/);
    const match = invitationSource.match(/TEMPLATE_EN\s*=\s*`([\s\S]*?)`/);
    expect(match).not.toBeNull();
    expect(match![1]).toContain("<!DOCTYPE html>");
  });

  it("DE template contains a CTA button", () => {
    const match = invitationSource.match(/TEMPLATE_DE\s*=\s*`([\s\S]*?)`/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/<a\s+href="/);
  });

  it("EN template contains a CTA button", () => {
    const match = invitationSource.match(/TEMPLATE_EN\s*=\s*`([\s\S]*?)`/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/<a\s+href="/);
  });

  it("DE template contains footer with address", () => {
    const match = invitationSource.match(/TEMPLATE_DE\s*=\s*`([\s\S]*?)`/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/Graz/);
    expect(match![1]).toMatch(/train-smarter\.at/);
  });

  it("EN template contains footer with address", () => {
    const match = invitationSource.match(/TEMPLATE_EN\s*=\s*`([\s\S]*?)`/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/Graz/);
    expect(match![1]).toMatch(/train-smarter\.at/);
  });
});

// ---------------------------------------------------------------------------
// Template Variable Replacement — send-auth-email
// ---------------------------------------------------------------------------

describe("send-auth-email — Template Variable Replacement", () => {
  it("templates contain {{ .SiteURL }} placeholder", () => {
    expect(authSource).toMatch(/\{\{\s*\.SiteURL\s*\}\}/);
  });

  it("templates contain {{ .TokenHash }} placeholder", () => {
    expect(authSource).toMatch(/\{\{\s*\.TokenHash\s*\}\}/);
  });

  it("renderTemplate replaces all Go template variables (no {{ . remaining)", () => {
    // The renderTemplate function must replace all Go-style placeholders
    // Check that every {{ .Xxx }} is handled in the replace chain
    const renderMatch = authSource.match(
      /function renderTemplate[\s\S]*?return html;\s*\}/
    );
    expect(renderMatch).not.toBeNull();
    const renderFn = renderMatch![0];

    // Must replace .SiteURL, .TokenHash, .Token, .RedirectTo, .Email
    expect(renderFn).toContain(".SiteURL");
    expect(renderFn).toContain(".TokenHash");
    expect(renderFn).toContain(".Token");
    expect(renderFn).toContain(".RedirectTo");
    expect(renderFn).toContain(".Email");
  });

  it("all Go template variables used in templates are handled by renderTemplate", () => {
    // Find all {{ .Xxx }} patterns in templates
    const templateVars = [
      ...authSource.matchAll(/\{\{\s*\.([\w]+)\s*\}\}/g),
    ].map((m) => m[1]);
    const uniqueVars = [...new Set(templateVars)];

    // renderTemplate must handle all of them
    const renderMatch = authSource.match(
      /function renderTemplate[\s\S]*?return html;\s*\}/
    );
    expect(renderMatch).not.toBeNull();
    const renderFn = renderMatch![0];

    for (const varName of uniqueVars) {
      expect(renderFn).toContain(`.${varName}`);
    }
  });
});

// ---------------------------------------------------------------------------
// Template Variable Replacement — send-invitation-email
// ---------------------------------------------------------------------------

describe("send-invitation-email — Template Variable Replacement", () => {
  it("templates contain {{trainerName}} placeholder", () => {
    expect(invitationSource).toContain("{{trainerName}}");
  });

  it("templates contain {{inviteLink}} placeholder", () => {
    expect(invitationSource).toContain("{{inviteLink}}");
  });

  it("templates contain {{expiresAt}} placeholder", () => {
    expect(invitationSource).toContain("{{expiresAt}}");
  });

  it("renderTemplate replaces all template variables", () => {
    const renderMatch = invitationSource.match(
      /function renderTemplate[\s\S]*?return html;\s*\}/
    );
    expect(renderMatch).not.toBeNull();
    const renderFn = renderMatch![0];

    expect(renderFn).toContain("trainerName");
    expect(renderFn).toContain("personalMessageBlock");
    expect(renderFn).toContain("inviteLink");
    expect(renderFn).toContain("expiresAt");
  });
});

// ---------------------------------------------------------------------------
// Template Language Correctness — send-auth-email
// ---------------------------------------------------------------------------

describe("send-auth-email — Template Language: DE templates", () => {
  const DE_TEMPLATES = [
    "confirmation_de",
    "recovery_de",
    "magic_link_de",
    "email_change_de",
    "invite_de",
  ];

  it.each(DE_TEMPLATES)("'%s' contains German text", (key) => {
    const match = authSource.match(new RegExp(`${key}\\s*:\\s*\`([\\s\\S]*?)\``));
    expect(match).not.toBeNull();
    const content = match![1];
    // Must contain common German words
    const hasGerman =
      /\b(dein|bitte|klicke|dich|kannst|diese|ignorieren|bestätigen)\b/i.test(content);
    expect(hasGerman).toBe(true);
  });

  it.each(DE_TEMPLATES)("'%s' does NOT contain English CTA text", (key) => {
    const match = authSource.match(new RegExp(`${key}\\s*:\\s*\`([\\s\\S]*?)\``));
    expect(match).not.toBeNull();
    const content = match![1];
    // Extract CTA button text: text between >...</a>
    const ctaMatches = [...content.matchAll(/<a[^>]*>([^<]+)<\/a>/g)].map(
      (m) => m[1].trim()
    );
    for (const ctaText of ctaMatches) {
      // English CTA phrases that should NOT be in DE templates
      expect(ctaText).not.toMatch(/^(Confirm Email|Reset|Set New|Sign In|Accept Invitation|Confirm Email Change)$/i);
    }
  });
});

describe("send-auth-email — Template Language: EN templates", () => {
  const EN_TEMPLATES = [
    "confirmation_en",
    "recovery_en",
    "magic_link_en",
    "email_change_en",
    "invite_en",
  ];

  it.each(EN_TEMPLATES)("'%s' contains English text", (key) => {
    const match = authSource.match(new RegExp(`${key}\\s*:\\s*\`([\\s\\S]*?)\``));
    expect(match).not.toBeNull();
    const content = match![1];
    // Must contain common English words
    const hasEnglish =
      /\b(your|please|click|you|can|safely|ignore|confirm)\b/i.test(content);
    expect(hasEnglish).toBe(true);
  });

  it.each(EN_TEMPLATES)("'%s' does NOT contain German CTA text", (key) => {
    const match = authSource.match(new RegExp(`${key}\\s*:\\s*\`([\\s\\S]*?)\``));
    expect(match).not.toBeNull();
    const content = match![1];
    // Extract CTA button text
    const ctaMatches = [...content.matchAll(/<a[^>]*>([^<]+)<\/a>/g)].map(
      (m) => m[1].trim()
    );
    for (const ctaText of ctaMatches) {
      // German CTA phrases that should NOT be in EN templates
      expect(ctaText).not.toMatch(
        /^(E-Mail bestätigen|Neues Passwort|Jetzt anmelden|Einladung annehmen|E-Mail-Änderung bestätigen)$/i
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Template Language Correctness — send-invitation-email
// ---------------------------------------------------------------------------

describe("send-invitation-email — Template Language", () => {
  it("DE template contains German text", () => {
    const match = invitationSource.match(/TEMPLATE_DE\s*=\s*`([\s\S]*?)`/);
    expect(match).not.toBeNull();
    const hasGerman =
      /\b(dein|dich|bitte|klicke|eingeladen|Konto|annehmen)\b/i.test(match![1]);
    expect(hasGerman).toBe(true);
  });

  it("EN template contains English text", () => {
    const match = invitationSource.match(/TEMPLATE_EN\s*=\s*`([\s\S]*?)`/);
    expect(match).not.toBeNull();
    const hasEnglish =
      /\b(your|you|please|click|invited|account|accept)\b/i.test(match![1]);
    expect(hasEnglish).toBe(true);
  });

  it("DE template CTA is in German", () => {
    const match = invitationSource.match(/TEMPLATE_DE\s*=\s*`([\s\S]*?)`/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/Einladung annehmen/);
  });

  it("EN template CTA is in English", () => {
    const match = invitationSource.match(/TEMPLATE_EN\s*=\s*`([\s\S]*?)`/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/Accept Invitation/);
  });
});

// ---------------------------------------------------------------------------
// Subject Line Tests — send-auth-email
// ---------------------------------------------------------------------------

describe("send-auth-email — Subject Lines", () => {
  const EMAIL_TYPES = ["signup", "recovery", "invite", "magiclink", "email_change"];

  it.each(EMAIL_TYPES)("subject for '%s' is defined for both DE and EN", (type) => {
    // The SUBJECTS object must have both locales for each type
    const subjectsMatch = authSource.match(
      /const SUBJECTS[\s\S]*?\n\};/
    );
    expect(subjectsMatch).not.toBeNull();
    const subjectsBlock = subjectsMatch![0];

    // Must have this type as a key
    expect(subjectsBlock).toContain(`${type}:`);

    // Extract the block for this specific type
    const typePattern = new RegExp(
      `${type}\\s*:\\s*\\{([\\s\\S]*?)\\}`,
    );
    const typeMatch = subjectsBlock.match(typePattern);
    expect(typeMatch).not.toBeNull();

    const typeBlock = typeMatch![1];
    expect(typeBlock).toContain("de:");
    expect(typeBlock).toContain("en:");
  });

  it("all DE subjects contain German text", () => {
    const subjectsMatch = authSource.match(
      /const SUBJECTS[\s\S]*?\n\};/
    );
    expect(subjectsMatch).not.toBeNull();

    // Extract all DE subject strings
    const deSubjects = [...subjectsMatch![0].matchAll(/de:\s*"([^"]+)"/g)].map(
      (m) => m[1]
    );
    expect(deSubjects.length).toBeGreaterThanOrEqual(5);

    for (const subject of deSubjects) {
      // German subjects should contain German characters or words
      const hasGerman = /[äöüß]|bestätig|zurücksetzen|eingeladen|ändern|Login-Link/i.test(subject);
      expect(hasGerman).toBe(true);
    }
  });

  it("all EN subjects contain English text", () => {
    const subjectsMatch = authSource.match(
      /const SUBJECTS[\s\S]*?\n\};/
    );
    expect(subjectsMatch).not.toBeNull();

    const enSubjects = [...subjectsMatch![0].matchAll(/en:\s*"([^"]+)"/g)].map(
      (m) => m[1]
    );
    expect(enSubjects.length).toBeGreaterThanOrEqual(5);

    for (const subject of enSubjects) {
      const hasEnglish = /confirm|reset|invited|login|change|your|please/i.test(subject);
      expect(hasEnglish).toBe(true);
    }
  });

  it("all subjects contain 'Train Smarter' branding", () => {
    const subjectsMatch = authSource.match(
      /const SUBJECTS[\s\S]*?\n\};/
    );
    expect(subjectsMatch).not.toBeNull();

    const allSubjects = [
      ...subjectsMatch![0].matchAll(/(?:de|en):\s*"([^"]+)"/g),
    ].map((m) => m[1]);

    expect(allSubjects.length).toBeGreaterThanOrEqual(10);

    for (const subject of allSubjects) {
      expect(subject).toContain("Train Smarter");
    }
  });
});

// ---------------------------------------------------------------------------
// Subject Line Tests — send-invitation-email
// ---------------------------------------------------------------------------

describe("send-invitation-email — Subject Lines", () => {
  it("DE subject function exists and returns German text", () => {
    // The SUBJECTS object should have a de key that is a function
    expect(invitationSource).toMatch(/de:\s*\(.*?\)\s*=>/);
    // The DE subject should contain "eingeladen" or "Train Smarter"
    const deMatch = invitationSource.match(/de:\s*\(.*?\)\s*=>\s*`([^`]+)`/);
    expect(deMatch).not.toBeNull();
    expect(deMatch![1]).toMatch(/eingeladen|Train Smarter/);
  });

  it("EN subject function exists and returns English text", () => {
    expect(invitationSource).toMatch(/en:\s*\(.*?\)\s*=>/);
    const enMatch = invitationSource.match(/en:\s*\(.*?\)\s*=>\s*`([^`]+)`/);
    expect(enMatch).not.toBeNull();
    expect(enMatch![1]).toMatch(/invited|Train Smarter/);
  });
});
