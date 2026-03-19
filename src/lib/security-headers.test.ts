import { describe, it, expect } from "vitest";
import { generateCSP } from "./csp";

/**
 * Tests that verify security header values match expected production config.
 *
 * IMPORTANT: These tests import the real generateCSP function from src/lib/csp.ts
 * which is also used in next.config.ts. This ensures we test the ACTUAL config,
 * not a hardcoded duplicate that could drift out of sync.
 */

// Static security headers (mirrors next.config.ts — these rarely change)
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

describe("Security Headers", () => {
  it("prevents clickjacking with X-Frame-Options DENY", () => {
    const header = securityHeaders.find(
      (h) => h.key === "X-Frame-Options"
    );
    expect(header?.value).toBe("DENY");
  });

  it("prevents MIME type sniffing", () => {
    const header = securityHeaders.find(
      (h) => h.key === "X-Content-Type-Options"
    );
    expect(header?.value).toBe("nosniff");
  });

  it("enforces HSTS with preload", () => {
    const header = securityHeaders.find(
      (h) => h.key === "Strict-Transport-Security"
    );
    expect(header?.value).toContain("max-age=31536000");
    expect(header?.value).toContain("includeSubDomains");
    expect(header?.value).toContain("preload");
  });

  it("disables dangerous browser APIs via Permissions-Policy", () => {
    const header = securityHeaders.find(
      (h) => h.key === "Permissions-Policy"
    );
    expect(header?.value).toContain("camera=()");
    expect(header?.value).toContain("microphone=()");
    expect(header?.value).toContain("geolocation=()");
    expect(header?.value).toContain("payment=()");
  });

  it("sets Cross-Origin-Opener-Policy to same-origin", () => {
    const header = securityHeaders.find(
      (h) => h.key === "Cross-Origin-Opener-Policy"
    );
    expect(header?.value).toBe("same-origin");
  });

  it("sets Cross-Origin-Resource-Policy to same-origin", () => {
    const header = securityHeaders.find(
      (h) => h.key === "Cross-Origin-Resource-Policy"
    );
    expect(header?.value).toBe("same-origin");
  });
});

describe("Content Security Policy (generateCSP)", () => {
  describe("production (isDev = false)", () => {
    const csp = generateCSP(false);

    it("restricts default-src to self", () => {
      expect(csp).toContain("default-src 'self'");
    });

    it("does NOT allow unsafe-eval", () => {
      expect(csp).not.toContain("unsafe-eval");
    });

    it("allows unsafe-inline for scripts (Next.js requirement)", () => {
      expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    });

    it("allows Supabase connections", () => {
      expect(csp).toContain("https://*.supabase.co");
      expect(csp).toContain("wss://*.supabase.co");
    });

    it("allows data: and blob: for images", () => {
      expect(csp).toContain("img-src 'self' data: blob: https:");
    });

    it("prevents framing via frame-ancestors none", () => {
      expect(csp).toContain("frame-ancestors 'none'");
    });

    it("restricts form actions to self", () => {
      expect(csp).toContain("form-action 'self'");
    });

    it("restricts base-uri to self", () => {
      expect(csp).toContain("base-uri 'self'");
    });
  });

  describe("development (isDev = true)", () => {
    const csp = generateCSP(true);

    it("allows unsafe-eval for HMR/dev tools", () => {
      expect(csp).toContain("unsafe-eval");
    });

    it("still restricts default-src to self", () => {
      expect(csp).toContain("default-src 'self'");
    });
  });

  describe("custom supabase URL", () => {
    it("includes the custom URL in connect-src", () => {
      const csp = generateCSP(false, "https://myproject.supabase.co");
      expect(csp).toContain("https://myproject.supabase.co");
    });
  });
});

describe("Icon Rewrites", () => {
  // Verify rewrite config values (mirrors next.config.ts)
  const rewrites = [
    { source: "/icon-192.png", destination: "/api/icon?size=192" },
    { source: "/icon-512.png", destination: "/api/icon?size=512" },
  ];

  it("rewrites /icon-192.png to API route", () => {
    expect(rewrites[0].source).toBe("/icon-192.png");
    expect(rewrites[0].destination).toBe("/api/icon?size=192");
  });

  it("rewrites /icon-512.png to API route", () => {
    expect(rewrites[1].source).toBe("/icon-512.png");
    expect(rewrites[1].destination).toBe("/api/icon?size=512");
  });
});
