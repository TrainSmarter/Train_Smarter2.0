import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createRateLimiter,
  getRateLimitKey,
  authRateLimiter,
  gdprConsentRateLimiter,
  gdprDeleteRateLimiter,
  accountRateLimiter,
} from "./rate-limit";

// ── createRateLimiter ───────────────────────────────────────────

describe("createRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a limiter with check and cleanup methods", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 5 });
    expect(limiter).toHaveProperty("check");
    expect(limiter).toHaveProperty("cleanup");
    expect(typeof limiter.check).toBe("function");
    expect(typeof limiter.cleanup).toBe("function");
  });

  it("allows requests within the limit", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 3 });

    const r1 = limiter.check("user:1");
    expect(r1.limited).toBe(false);
    expect(r1.remaining).toBe(2);
    expect(r1.retryAfterMs).toBe(0);

    const r2 = limiter.check("user:1");
    expect(r2.limited).toBe(false);
    expect(r2.remaining).toBe(1);

    const r3 = limiter.check("user:1");
    expect(r3.limited).toBe(false);
    expect(r3.remaining).toBe(0);
  });

  it("blocks requests over the limit", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 2 });

    limiter.check("user:1");
    limiter.check("user:1");

    const r3 = limiter.check("user:1");
    expect(r3.limited).toBe(true);
    expect(r3.remaining).toBe(0);
    expect(r3.retryAfterMs).toBeGreaterThan(0);
  });

  it("returns correct retryAfterMs when limited", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 1 });

    vi.setSystemTime(new Date(1000));
    limiter.check("k");

    vi.setSystemTime(new Date(20_000));
    const result = limiter.check("k");

    expect(result.limited).toBe(true);
    // oldest timestamp = 1000, windowMs = 60000 => expires at 61000
    // now = 20000 => retryAfterMs = 61000 - 20000 = 41000
    expect(result.retryAfterMs).toBe(41_000);
  });

  it("sliding window: requests expire after windowMs", () => {
    const limiter = createRateLimiter({ windowMs: 10_000, maxRequests: 1 });

    vi.setSystemTime(new Date(0));
    limiter.check("k");

    // Still blocked at 9999ms
    vi.setSystemTime(new Date(9_999));
    expect(limiter.check("k").limited).toBe(true);

    // Allowed at 10_000ms (old request expired)
    vi.setSystemTime(new Date(10_000));
    const result = limiter.check("k");
    expect(result.limited).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("different keys are tracked independently", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 1 });

    limiter.check("a");
    expect(limiter.check("a").limited).toBe(true);

    // "b" is a separate key, should not be limited
    const rb = limiter.check("b");
    expect(rb.limited).toBe(false);
    expect(rb.remaining).toBe(0);
  });

  it("same key resets after window expires", () => {
    const limiter = createRateLimiter({ windowMs: 5_000, maxRequests: 2 });

    vi.setSystemTime(new Date(0));
    limiter.check("k");
    limiter.check("k");
    expect(limiter.check("k").limited).toBe(true);

    // Advance past the window
    vi.setSystemTime(new Date(5_000));
    const result = limiter.check("k");
    expect(result.limited).toBe(false);
    expect(result.remaining).toBe(1);
  });

  it("cleanup removes expired entries", () => {
    const limiter = createRateLimiter({ windowMs: 5_000, maxRequests: 5 });

    vi.setSystemTime(new Date(0));
    limiter.check("a");
    limiter.check("b");

    // Move past the window so all timestamps are expired
    vi.setSystemTime(new Date(10_000));
    limiter.cleanup();

    // After cleanup, keys are gone so we get fresh state
    const result = limiter.check("a");
    expect(result.limited).toBe(false);
    expect(result.remaining).toBe(4);
  });

  it("cleanup retains entries still within the window", () => {
    const limiter = createRateLimiter({ windowMs: 10_000, maxRequests: 3 });

    vi.setSystemTime(new Date(0));
    limiter.check("a"); // ts=0

    vi.setSystemTime(new Date(6_000));
    limiter.check("a"); // ts=6000

    // At 8000, cleanup: ts=0 is expired (8000-0=8000 >= 10000? no, 8000 < 10000)
    // Actually at 11000: ts=0 expired, ts=6000 still valid
    vi.setSystemTime(new Date(11_000));
    limiter.cleanup();

    // One entry remains (ts=6000), so next check allows and remaining=1
    const result = limiter.check("a");
    expect(result.limited).toBe(false);
    expect(result.remaining).toBe(1); // 3 max - 2 (1 retained + 1 new)
  });
});

// ── Pre-configured limiters ────────────────────────────────────

describe("pre-configured limiters", () => {
  it("authRateLimiter exists and has check method", () => {
    expect(authRateLimiter).toBeDefined();
    expect(typeof authRateLimiter.check).toBe("function");
  });

  it("gdprConsentRateLimiter exists and has check method", () => {
    expect(gdprConsentRateLimiter).toBeDefined();
    expect(typeof gdprConsentRateLimiter.check).toBe("function");
  });

  it("gdprDeleteRateLimiter exists and has check method", () => {
    expect(gdprDeleteRateLimiter).toBeDefined();
    expect(typeof gdprDeleteRateLimiter.check).toBe("function");
  });

  it("accountRateLimiter exists and has check method", () => {
    expect(accountRateLimiter).toBeDefined();
    expect(typeof accountRateLimiter.check).toBe("function");
  });
});

// ── getRateLimitKey ────────────────────────────────────────────

describe("getRateLimitKey", () => {
  it("returns user-prefixed key when userId is provided", () => {
    const req = new Request("http://localhost/api/test", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    expect(getRateLimitKey(req, "abc-123")).toBe("user:abc-123");
  });

  it("extracts IP from x-forwarded-for header", () => {
    const req = new Request("http://localhost/api/test", {
      headers: { "x-forwarded-for": "203.0.113.50" },
    });
    expect(getRateLimitKey(req)).toBe("ip:203.0.113.50");
  });

  it("takes the first IP from a comma-separated x-forwarded-for", () => {
    const req = new Request("http://localhost/api/test", {
      headers: { "x-forwarded-for": "10.0.0.1, 10.0.0.2, 10.0.0.3" },
    });
    expect(getRateLimitKey(req)).toBe("ip:10.0.0.1");
  });

  it("trims whitespace from the forwarded IP", () => {
    const req = new Request("http://localhost/api/test", {
      headers: { "x-forwarded-for": "  192.168.1.1  , 10.0.0.1" },
    });
    expect(getRateLimitKey(req)).toBe("ip:192.168.1.1");
  });

  it("returns ip:unknown when no forwarding headers are present", () => {
    const req = new Request("http://localhost/api/test");
    expect(getRateLimitKey(req)).toBe("ip:unknown");
  });

  it("prefers userId over IP when both are available", () => {
    const req = new Request("http://localhost/api/test", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    expect(getRateLimitKey(req, "user-id")).toBe("user:user-id");
  });
});
