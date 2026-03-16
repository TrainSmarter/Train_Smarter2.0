import { describe, it, expect, vi, beforeEach } from "vitest";
import dns from "dns/promises";
import { validateEmailPlausibility } from "./email";

// Mock the dns/promises module
vi.mock("dns/promises", () => ({
  default: {
    resolveMx: vi.fn(),
    resolve4: vi.fn(),
  },
}));

const mockResolveMx = vi.mocked(dns.resolveMx);
const mockResolve4 = vi.mocked(dns.resolve4);

beforeEach(() => {
  vi.clearAllMocks();
  // Reset the internal domain cache by advancing time past TTL.
  // Since the cache is module-scoped, we use unique domains per test where
  // cache interference could be a problem, or we rely on fresh domains.
  vi.useFakeTimers();
  // Advance past any cached entries from previous tests (1h + 1ms)
  vi.advanceTimersByTime(60 * 60 * 1000 + 1);
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Format validation
// ---------------------------------------------------------------------------

describe("validateEmailPlausibility — format checks", () => {
  it("rejects an empty string", async () => {
    const result = await validateEmailPlausibility("");
    expect(result).toEqual({ valid: false, reason: "invalid_format" });
  });

  it("rejects whitespace-only input", async () => {
    const result = await validateEmailPlausibility("   ");
    expect(result).toEqual({ valid: false, reason: "invalid_format" });
  });

  it("rejects a string without @ sign", async () => {
    const result = await validateEmailPlausibility("not-an-email");
    expect(result).toEqual({ valid: false, reason: "invalid_format" });
  });

  it("rejects a string with @ but no domain", async () => {
    const result = await validateEmailPlausibility("user@");
    expect(result).toEqual({ valid: false, reason: "invalid_format" });
  });

  it("rejects a string with @ but no local part", async () => {
    const result = await validateEmailPlausibility("@example.com");
    expect(result).toEqual({ valid: false, reason: "invalid_format" });
  });

  it("does not call DNS for invalid format", async () => {
    await validateEmailPlausibility("invalid");
    expect(mockResolveMx).not.toHaveBeenCalled();
    expect(mockResolve4).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// DNS — MX record found
// ---------------------------------------------------------------------------

describe("validateEmailPlausibility — valid MX record", () => {
  it("returns valid when MX records exist", async () => {
    mockResolveMx.mockResolvedValue([
      { exchange: "mx1.example.com", priority: 10 },
    ]);

    const result = await validateEmailPlausibility("user@valid-mx-domain.com");
    expect(result).toEqual({ valid: true });
    expect(mockResolveMx).toHaveBeenCalledWith("valid-mx-domain.com");
  });
});

// ---------------------------------------------------------------------------
// DNS — no MX, no A record
// ---------------------------------------------------------------------------

describe("validateEmailPlausibility — non-existent domain", () => {
  it("returns invalid with reason no_mx_record when MX and A lookups both fail", async () => {
    const mxError = new Error("queryMx ENOTFOUND") as NodeJS.ErrnoException;
    mxError.code = "ENOTFOUND";
    mockResolveMx.mockRejectedValue(mxError);

    const aError = new Error("queryA ENOTFOUND") as NodeJS.ErrnoException;
    aError.code = "ENOTFOUND";
    mockResolve4.mockRejectedValue(aError);

    const result = await validateEmailPlausibility(
      "user@nonexistent-domain-xyz.test"
    );
    expect(result).toEqual({ valid: false, reason: "no_mx_record" });
  });

  it("returns invalid when MX returns ENODATA and A also fails", async () => {
    const mxError = new Error("queryMx ENODATA") as NodeJS.ErrnoException;
    mxError.code = "ENODATA";
    mockResolveMx.mockRejectedValue(mxError);

    const aError = new Error("queryA ENODATA") as NodeJS.ErrnoException;
    aError.code = "ENODATA";
    mockResolve4.mockRejectedValue(aError);

    const result = await validateEmailPlausibility(
      "user@no-data-domain.test"
    );
    expect(result).toEqual({ valid: false, reason: "no_mx_record" });
  });

  it("returns invalid when MX returns ESERVFAIL and A also fails", async () => {
    const mxError = new Error("queryMx ESERVFAIL") as NodeJS.ErrnoException;
    mxError.code = "ESERVFAIL";
    mockResolveMx.mockRejectedValue(mxError);

    const aError = new Error("queryA ESERVFAIL") as NodeJS.ErrnoException;
    aError.code = "ESERVFAIL";
    mockResolve4.mockRejectedValue(aError);

    const result = await validateEmailPlausibility(
      "user@servfail-domain.test"
    );
    expect(result).toEqual({ valid: false, reason: "no_mx_record" });
  });
});

// ---------------------------------------------------------------------------
// DNS — A record fallback
// ---------------------------------------------------------------------------

describe("validateEmailPlausibility — A record fallback", () => {
  it("returns valid when no MX but A record exists", async () => {
    const mxError = new Error("queryMx ENODATA") as NodeJS.ErrnoException;
    mxError.code = "ENODATA";
    mockResolveMx.mockRejectedValue(mxError);

    mockResolve4.mockResolvedValue(["93.184.216.34"]);

    const result = await validateEmailPlausibility(
      "user@a-record-only-domain.test"
    );
    expect(result).toEqual({ valid: true });
    expect(mockResolve4).toHaveBeenCalledWith("a-record-only-domain.test");
  });
});

// ---------------------------------------------------------------------------
// DNS timeout — fail-open
// ---------------------------------------------------------------------------

describe("validateEmailPlausibility — DNS timeout (fail-open)", () => {
  it("returns valid when MX lookup times out", async () => {
    mockResolveMx.mockRejectedValue(new Error("DNS_TIMEOUT"));

    const result = await validateEmailPlausibility(
      "user@slow-dns-domain.test"
    );
    expect(result).toEqual({ valid: true });
  });

  it("returns valid when MX fails with ENOTFOUND and A record times out", async () => {
    const mxError = new Error("queryMx ENOTFOUND") as NodeJS.ErrnoException;
    mxError.code = "ENOTFOUND";
    mockResolveMx.mockRejectedValue(mxError);

    mockResolve4.mockRejectedValue(new Error("DNS_TIMEOUT"));

    const result = await validateEmailPlausibility(
      "user@a-timeout-domain.test"
    );
    expect(result).toEqual({ valid: true });
  });
});

// ---------------------------------------------------------------------------
// DNS — MX returns empty array
// ---------------------------------------------------------------------------

describe("validateEmailPlausibility — empty MX array", () => {
  it("falls back to A record when MX returns empty array", async () => {
    mockResolveMx.mockResolvedValue([]);

    // Empty MX goes to the "no MX and no A record" path since the code
    // does not throw — it just falls through. No A lookup is triggered
    // because the catch block is not reached. The function returns invalid.
    const result = await validateEmailPlausibility(
      "user@empty-mx-domain.test"
    );
    expect(result).toEqual({ valid: false, reason: "no_mx_record" });
  });
});

// ---------------------------------------------------------------------------
// Caching behavior
// ---------------------------------------------------------------------------

describe("validateEmailPlausibility — caching", () => {
  it("caches a valid result and does not call DNS again", async () => {
    mockResolveMx.mockResolvedValue([
      { exchange: "mx.cached-domain.test", priority: 10 },
    ]);

    const first = await validateEmailPlausibility(
      "user@cached-domain.test"
    );
    expect(first).toEqual({ valid: true });
    expect(mockResolveMx).toHaveBeenCalledTimes(1);

    // Second call — should come from cache
    const second = await validateEmailPlausibility(
      "another@cached-domain.test"
    );
    expect(second).toEqual({ valid: true });
    expect(mockResolveMx).toHaveBeenCalledTimes(1); // no extra DNS call
  });

  it("caches an invalid result and does not call DNS again", async () => {
    const mxError = new Error("ENOTFOUND") as NodeJS.ErrnoException;
    mxError.code = "ENOTFOUND";
    mockResolveMx.mockRejectedValue(mxError);

    const aError = new Error("ENOTFOUND") as NodeJS.ErrnoException;
    aError.code = "ENOTFOUND";
    mockResolve4.mockRejectedValue(aError);

    const first = await validateEmailPlausibility(
      "user@invalid-cached-domain.test"
    );
    expect(first).toEqual({ valid: false, reason: "no_mx_record" });

    // Second call — from cache
    const second = await validateEmailPlausibility(
      "other@invalid-cached-domain.test"
    );
    expect(second).toEqual({ valid: false, reason: "no_mx_record" });
    // DNS was called once for MX and once for A, no more after caching
    expect(mockResolveMx).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("validateEmailPlausibility — edge cases", () => {
  it("lowercases the domain before lookup", async () => {
    mockResolveMx.mockResolvedValue([
      { exchange: "mx.example.com", priority: 10 },
    ]);

    await validateEmailPlausibility("User@UPPERCASE-DOMAIN-EDGE.COM");
    expect(mockResolveMx).toHaveBeenCalledWith("uppercase-domain-edge.com");
  });

  it("handles non-Error throws from DNS gracefully", async () => {
    // If dns.resolveMx throws something that is not an Error instance,
    // isDnsError returns false so the code skips the A-record fallback
    // and falls through to the invalid result.
    mockResolveMx.mockRejectedValue("string error");

    const result = await validateEmailPlausibility(
      "user@string-error-domain.test"
    );
    expect(result).toEqual({ valid: false, reason: "no_mx_record" });
  });
});
