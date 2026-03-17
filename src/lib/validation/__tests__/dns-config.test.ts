/**
 * dns-config.test.ts
 *
 * Validates DNS records for train-smarter.at to prevent regressions of:
 * - BUG 5: DMARC p=quarantine on new domain (should be p=none initially)
 * - BUG 6: SPF ~all instead of -all (softfail reduces trust score)
 *
 * These tests perform live DNS lookups and should be skipped in CI.
 * Run manually with: npx vitest run src/lib/validation/__tests__/dns-config.test.ts
 *
 * To skip in CI, set the environment variable SKIP_DNS_TESTS=true.
 */
import { describe, it, expect } from "vitest";
import dns from "dns/promises";

const DOMAIN = "train-smarter.at";
const SKIP = process.env.SKIP_DNS_TESTS === "true" || process.env.CI === "true";

// Helper: resolve TXT records for a domain
async function getTxtRecords(domain: string): Promise<string[]> {
  try {
    const records = await dns.resolveTxt(domain);
    // dns.resolveTxt returns string[][] — flatten
    return records.map((chunks) => chunks.join(""));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// BUG 6: SPF record must use -all (hardfail), not ~all (softfail)
// ---------------------------------------------------------------------------

describe.skipIf(SKIP)("DNS — SPF record (BUG 6)", () => {
  it("SPF record exists for " + DOMAIN, async () => {
    const txtRecords = await getTxtRecords(DOMAIN);
    const spf = txtRecords.find((r) => r.startsWith("v=spf1"));
    expect(spf).toBeDefined();
  });

  it("SPF record uses -all (hardfail), NOT ~all (softfail)", async () => {
    const txtRecords = await getTxtRecords(DOMAIN);
    const spf = txtRecords.find((r) => r.startsWith("v=spf1"));
    expect(spf).toBeDefined();

    // Must end with -all (hardfail)
    expect(spf).toContain("-all");

    // Must NOT use ~all (softfail)
    expect(spf).not.toContain("~all");
  });
});

// ---------------------------------------------------------------------------
// BUG 5: DMARC must NOT use p=quarantine on a new domain
// ---------------------------------------------------------------------------

describe.skipIf(SKIP)("DNS — DMARC record (BUG 5)", () => {
  it("DMARC record exists at _dmarc." + DOMAIN, async () => {
    const txtRecords = await getTxtRecords(`_dmarc.${DOMAIN}`);
    const dmarc = txtRecords.find((r) => r.startsWith("v=DMARC1"));
    expect(dmarc).toBeDefined();
  });

  it("DMARC policy is NOT p=quarantine (too aggressive for new domain)", async () => {
    const txtRecords = await getTxtRecords(`_dmarc.${DOMAIN}`);
    const dmarc = txtRecords.find((r) => r.startsWith("v=DMARC1"));
    expect(dmarc).toBeDefined();

    // Should NOT have quarantine policy on a new/young domain
    expect(dmarc).not.toMatch(/p=quarantine/i);
  });

  it("DMARC policy is either p=none or p=reject (safe choices)", async () => {
    const txtRecords = await getTxtRecords(`_dmarc.${DOMAIN}`);
    const dmarc = txtRecords.find((r) => r.startsWith("v=DMARC1"));
    expect(dmarc).toBeDefined();

    // p=none (monitoring) or p=reject (after DKIM/SPF confirmed) are safe
    const hasNone = /p=none/i.test(dmarc!);
    const hasReject = /p=reject/i.test(dmarc!);
    expect(hasNone || hasReject).toBe(true);
  });

  it("DMARC has reporting address (rua)", async () => {
    const txtRecords = await getTxtRecords(`_dmarc.${DOMAIN}`);
    const dmarc = txtRecords.find((r) => r.startsWith("v=DMARC1"));
    expect(dmarc).toBeDefined();

    // Should have rua= for aggregate reports
    expect(dmarc).toMatch(/rua=/i);
  });
});

// ---------------------------------------------------------------------------
// DKIM record should exist
// ---------------------------------------------------------------------------

describe.skipIf(SKIP)("DNS — DKIM record", () => {
  it("DKIM record exists at dkim._domainkey." + DOMAIN, async () => {
    const txtRecords = await getTxtRecords(`dkim._domainkey.${DOMAIN}`);
    // DKIM records typically start with v=DKIM1 or contain p= (public key)
    const dkim = txtRecords.find(
      (r) => r.includes("v=DKIM1") || r.includes("p=")
    );
    expect(dkim).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// General DNS health checks
// ---------------------------------------------------------------------------

describe.skipIf(SKIP)("DNS — General health", () => {
  it(DOMAIN + " has MX records configured", async () => {
    const mxRecords = await dns.resolveMx(DOMAIN);
    expect(mxRecords.length).toBeGreaterThan(0);
  });

  it(DOMAIN + " has A records (domain resolves)", async () => {
    const aRecords = await dns.resolve4(DOMAIN);
    expect(aRecords.length).toBeGreaterThan(0);
  });
});
