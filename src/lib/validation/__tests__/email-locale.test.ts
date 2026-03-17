/**
 * email-locale.test.ts
 *
 * Validates locale detection logic in send-auth-email Edge Function.
 * Ensures correct locale is determined per email type, URL extraction
 * works for all patterns, and fallback is always "de".
 *
 * All tests are static analysis (reading source files) — no runtime calls.
 */
import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Load Edge Function source code
// ---------------------------------------------------------------------------

const AUTH_EMAIL_PATH = path.resolve(
  __dirname,
  "../../../../supabase/functions/send-auth-email/index.ts"
);

let source: string;

beforeAll(() => {
  source = fs.readFileSync(AUTH_EMAIL_PATH, "utf-8");
});

// ---------------------------------------------------------------------------
// Locale Function Exists
// ---------------------------------------------------------------------------

describe("send-auth-email — Locale Functions Exist", () => {
  it("determineLocale function is defined", () => {
    expect(source).toMatch(/async\s+function\s+determineLocale\s*\(/);
  });

  it("extractLocaleFromUrl function is defined", () => {
    expect(source).toMatch(/function\s+extractLocaleFromUrl\s*\(/);
  });
});

// ---------------------------------------------------------------------------
// Locale Logic (source code analysis)
// ---------------------------------------------------------------------------

describe("send-auth-email — Locale Logic per Email Type", () => {
  let determineLocaleFn: string;

  beforeAll(() => {
    // Extract the determineLocale function body
    const match = source.match(
      /async\s+function\s+determineLocale[\s\S]*?\nfunction\s/
    );
    // If the above doesn't work, try a broader match
    const altMatch = source.match(
      /async\s+function\s+determineLocale[\s\S]*?return "de";\s*\}/
    );
    determineLocaleFn = match ? match[0] : altMatch ? altMatch[0] : "";
  });

  it("for signup: extracts locale from redirect_to URL", () => {
    expect(determineLocaleFn).toContain("signup");
    expect(determineLocaleFn).toContain("extractLocaleFromUrl");
    expect(determineLocaleFn).toContain("redirect_to");
  });

  it("for recovery: extracts locale from redirect_to URL", () => {
    expect(determineLocaleFn).toContain("recovery");
    // Both signup and recovery should use the URL extraction path
    // They are in the same if-block
    const signupRecoveryBlock = determineLocaleFn.match(
      /email_action_type\s*===\s*"signup"[\s\S]*?email_action_type\s*===\s*"recovery"/
    );
    expect(signupRecoveryBlock).not.toBeNull();
  });

  it("for email_change: reads profiles.locale from DB", () => {
    // email_change should NOT be in the signup/recovery block
    // It should fall through to the profiles.locale lookup
    expect(determineLocaleFn).toContain("profiles");
    expect(determineLocaleFn).toContain("locale");
    // The profiles query uses .eq("id", user.id)
    expect(determineLocaleFn).toMatch(/\.from\s*\(\s*"profiles"\s*\)/);
  });

  it("for magiclink: reads profiles.locale from DB", () => {
    // magiclink is NOT in the signup/recovery if-block, so it falls through
    // to the profiles.locale section
    const signupRecoveryBlock = determineLocaleFn.match(
      /if\s*\(\s*[\s\S]*?signup[\s\S]*?recovery[\s\S]*?\)\s*\{([\s\S]*?)\}/
    );
    expect(signupRecoveryBlock).not.toBeNull();
    // magiclink should NOT be in this block
    expect(signupRecoveryBlock![1]).not.toContain("magiclink");
  });

  it("default fallback is 'de' (not 'en' or anything else)", () => {
    // The very last return before the closing brace should be "de"
    expect(determineLocaleFn).toMatch(/return\s*"de"\s*;/);
    // Should NOT have a final return "en"
    const lastReturn = determineLocaleFn.match(/return\s*"(\w+)"\s*;\s*$/m);
    // The function should end with return "de"
    // Check the last return statement in the function
    const allReturns = [...determineLocaleFn.matchAll(/return\s*"(\w+)"\s*;/g)];
    const lastReturnValue = allReturns[allReturns.length - 1]?.[1];
    expect(lastReturnValue).toBe("de");
  });

  it("only 'de' and 'en' are accepted as valid locales", () => {
    // The function should validate locales against "de" and "en"
    // Look for patterns like: === "de" || === "en"
    const deEnChecks = determineLocaleFn.match(
      /===\s*"de"\s*\|\|\s*\w+\s*===\s*"en"/g
    );
    expect(deEnChecks).not.toBeNull();
    expect(deEnChecks!.length).toBeGreaterThanOrEqual(1);

    // Should NOT accept other locales like "fr", "es", etc.
    expect(determineLocaleFn).not.toMatch(/===\s*"(fr|es|it|pt|nl|pl|ru)"/);
  });
});

// ---------------------------------------------------------------------------
// URL Locale Extraction
// ---------------------------------------------------------------------------

describe("send-auth-email — extractLocaleFromUrl", () => {
  let extractFn: string;

  beforeAll(() => {
    const match = source.match(
      /function\s+extractLocaleFromUrl[\s\S]*?\n\}/
    );
    extractFn = match ? match[0] : "";
  });

  it("handles full URLs like https://www.train-smarter.at/de/dashboard", () => {
    // Must use new URL() to parse the URL
    expect(extractFn).toContain("new URL");
    // Must extract from pathname
    expect(extractFn).toContain("pathname");
  });

  it("uses regex to match /(de|en) at start of path", () => {
    // Should have a regex matching /de or /en at the start of the path
    expect(extractFn).toMatch(/\/\(de\|en\)/);
  });

  it("handles invalid URLs gracefully (try-catch)", () => {
    // Must have try-catch for URL parsing errors
    expect(extractFn).toContain("try");
    expect(extractFn).toContain("catch");
  });

  it("returns null for empty/missing URL", () => {
    // Should handle null/empty URL input
    expect(extractFn).toMatch(/if\s*\(\s*!url\s*\)/);
    expect(extractFn).toContain("return null");
  });

  it("handles path-only strings as fallback", () => {
    // In the catch block, it should try matching as a path
    // This handles cases where redirect_to is just a path like "/de/dashboard"
    const catchBlock = extractFn.match(/catch[\s\S]*?\}/);
    expect(catchBlock).not.toBeNull();
    expect(catchBlock![0]).toMatch(/match/);
  });

  it("return type is Locale | null", () => {
    // Function signature should return Locale | null
    expect(extractFn).toMatch(/:\s*Locale\s*\|\s*null/);
  });
});

// ---------------------------------------------------------------------------
// Locale type definition
// ---------------------------------------------------------------------------

describe("send-auth-email — Locale Type", () => {
  it("Locale type is defined as 'de' | 'en'", () => {
    expect(source).toMatch(/type\s+Locale\s*=\s*"de"\s*\|\s*"en"/);
  });

  it("Locale type does NOT include other languages", () => {
    // The type should be exactly "de" | "en", not include others
    const localeTypeMatch = source.match(/type\s+Locale\s*=\s*([^;]+)/);
    expect(localeTypeMatch).not.toBeNull();
    const typeDefinition = localeTypeMatch![1];
    expect(typeDefinition).not.toMatch(/"(fr|es|it|pt|nl|pl|ru)"/);
  });
});
