/**
 * email-config.test.ts
 *
 * Validates supabase/config.toml email configuration to prevent regressions of:
 * - BUG 7: max_frequency too aggressive (must be between 15s and 60s)
 * - BUG 3: Config push overwrites secrets (env vars must use env() syntax)
 * - Auth hook and SMTP must be enabled
 */
import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";

const CONFIG_PATH = path.resolve(
  __dirname,
  "../../../../supabase/config.toml"
);

let configContent: string;

beforeAll(() => {
  configContent = fs.readFileSync(CONFIG_PATH, "utf-8");
});

// ---------------------------------------------------------------------------
// BUG 7: max_frequency must be between 15s and 60s
// ---------------------------------------------------------------------------

describe("supabase/config.toml — max_frequency (BUG 7)", () => {
  it("has max_frequency set", () => {
    expect(configContent).toMatch(/max_frequency\s*=/);
  });

  it("max_frequency is between 15s and 60s", () => {
    const match = configContent.match(/max_frequency\s*=\s*"(\d+)s"/);
    expect(match).not.toBeNull();

    const seconds = parseInt(match![1], 10);
    expect(seconds).toBeGreaterThanOrEqual(15);
    expect(seconds).toBeLessThanOrEqual(60);
  });

  it("max_frequency is NOT set to 1s (too aggressive, damages IP reputation)", () => {
    expect(configContent).not.toMatch(/max_frequency\s*=\s*"1s"/);
  });
});

// ---------------------------------------------------------------------------
// Auth hook must be enabled for custom email sending
// ---------------------------------------------------------------------------

describe("supabase/config.toml — auth.hook.send_email", () => {
  it("has [auth.hook.send_email] section", () => {
    expect(configContent).toContain("[auth.hook.send_email]");
  });

  it("auth hook is enabled", () => {
    // Extract the send_email section and check enabled = true
    const sectionMatch = configContent.match(
      /\[auth\.hook\.send_email\]([\s\S]*?)(?=\n\[|$)/
    );
    expect(sectionMatch).not.toBeNull();
    const section = sectionMatch![1];
    expect(section).toMatch(/enabled\s*=\s*true/);
  });

  it("hook URI points to the send-auth-email Edge Function", () => {
    const sectionMatch = configContent.match(
      /\[auth\.hook\.send_email\]([\s\S]*?)(?=\n\[|$)/
    );
    expect(sectionMatch).not.toBeNull();
    const section = sectionMatch![1];
    expect(section).toContain("send-auth-email");
  });

  it("hook secrets use env() syntax, not hardcoded values (BUG 3 prevention)", () => {
    const sectionMatch = configContent.match(
      /\[auth\.hook\.send_email\]([\s\S]*?)(?=\n\[|$)/
    );
    expect(sectionMatch).not.toBeNull();
    const section = sectionMatch![1];

    // Must use env(SEND_EMAIL_HOOK_SECRET) pattern
    expect(section).toMatch(/secrets\s*=\s*"env\(SEND_EMAIL_HOOK_SECRET\)"/);
  });
});

// ---------------------------------------------------------------------------
// SMTP must be enabled and use env() for password (BUG 3)
// ---------------------------------------------------------------------------

describe("supabase/config.toml — auth.email.smtp", () => {
  it("has [auth.email.smtp] section", () => {
    expect(configContent).toContain("[auth.email.smtp]");
  });

  it("SMTP is enabled", () => {
    const sectionMatch = configContent.match(
      /\[auth\.email\.smtp\]([\s\S]*?)(?=\n\[|$)/
    );
    expect(sectionMatch).not.toBeNull();
    const section = sectionMatch![1];
    expect(section).toMatch(/enabled\s*=\s*true/);
  });

  it("SMTP password uses env() syntax, not hardcoded (BUG 3 prevention)", () => {
    const sectionMatch = configContent.match(
      /\[auth\.email\.smtp\]([\s\S]*?)(?=\n\[|$)/
    );
    expect(sectionMatch).not.toBeNull();
    const section = sectionMatch![1];

    // Must use env(SMTP_PASS) pattern
    expect(section).toMatch(/pass\s*=\s*"env\(SMTP_PASS\)"/);

    // Must NOT have a literal password
    expect(section).not.toMatch(
      /pass\s*=\s*"(?!env\()[^"]+"/
    );
  });

  it("sender email is from train-smarter.at domain", () => {
    const sectionMatch = configContent.match(
      /\[auth\.email\.smtp\]([\s\S]*?)(?=\n\[|$)/
    );
    expect(sectionMatch).not.toBeNull();
    const section = sectionMatch![1];
    expect(section).toMatch(/admin_email\s*=\s*"[^"]*@train-smarter\.at"/);
  });
});

// ---------------------------------------------------------------------------
// Auth email settings
// ---------------------------------------------------------------------------

describe("supabase/config.toml — auth.email", () => {
  it("has email confirmations enabled", () => {
    const sectionMatch = configContent.match(
      /\[auth\.email\]\r?\n([\s\S]*?)(?=\r?\n\[|$)/
    );
    expect(sectionMatch).not.toBeNull();
    const section = sectionMatch![1];
    expect(section).toMatch(/enable_confirmations\s*=\s*true/);
  });

  it("has email signup enabled", () => {
    const sectionMatch = configContent.match(
      /\[auth\.email\]\r?\n([\s\S]*?)(?=\r?\n\[|$)/
    );
    expect(sectionMatch).not.toBeNull();
    const section = sectionMatch![1];
    expect(section).toMatch(/enable_signup\s*=\s*true/);
  });
});
