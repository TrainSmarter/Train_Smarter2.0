/**
 * In-memory sliding window rate limiter.
 *
 * Acceptable for single-instance deployments (e.g. long-running Node server).
 * On Vercel serverless each cold start gets a fresh Map, so this provides
 * best-effort protection within a single instance lifetime. For stricter
 * guarantees, use Vercel KV or Supabase in a future iteration.
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });
 *   const { limited } = limiter.check(key);
 *   if (limited) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
 */

interface RateLimiterOptions {
  /** Sliding window duration in milliseconds */
  windowMs: number;
  /** Maximum requests allowed within the window */
  maxRequests: number;
}

interface RateLimitResult {
  limited: boolean;
  remaining: number;
  retryAfterMs: number;
}

interface RateLimiter {
  check: (key: string) => RateLimitResult;
  /** Remove expired entries — called automatically on check, but exposed for testing */
  cleanup: () => void;
}

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const { windowMs, maxRequests } = options;
  const store = new Map<string, number[]>();

  // Periodic cleanup to prevent memory leaks from abandoned keys.
  // Runs every 5 minutes.
  const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
  let lastCleanup = Date.now();

  function cleanup() {
    const now = Date.now();
    for (const [key, timestamps] of store.entries()) {
      const recent = timestamps.filter((ts) => now - ts < windowMs);
      if (recent.length === 0) {
        store.delete(key);
      } else {
        store.set(key, recent);
      }
    }
    lastCleanup = now;
  }

  function check(key: string): RateLimitResult {
    const now = Date.now();

    // Periodic cleanup
    if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
      cleanup();
    }

    const timestamps = store.get(key) ?? [];
    const recent = timestamps.filter((ts) => now - ts < windowMs);

    if (recent.length >= maxRequests) {
      // Find when the oldest entry in the window expires
      const oldestInWindow = recent[0];
      const retryAfterMs = oldestInWindow + windowMs - now;

      store.set(key, recent);
      return {
        limited: true,
        remaining: 0,
        retryAfterMs: Math.max(retryAfterMs, 0),
      };
    }

    recent.push(now);
    store.set(key, recent);

    return {
      limited: false,
      remaining: maxRequests - recent.length,
      retryAfterMs: 0,
    };
  }

  return { check, cleanup };
}

// ── Pre-configured limiters for common use cases ─────────────────

/** Auth mutation routes: 10 requests per minute */
export const authRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
});

/** GDPR consent routes: 10 requests per minute */
export const gdprConsentRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
});

/** GDPR delete account: 3 requests per minute (destructive action) */
export const gdprDeleteRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 3,
});

/** Account settings routes: 10 requests per minute */
export const accountRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
});

/**
 * Extract a rate limit key from a request.
 * Uses the user ID if available, otherwise falls back to IP address.
 */
export function getRateLimitKey(
  request: Request,
  userId?: string
): string {
  if (userId) return `user:${userId}`;

  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return `ip:${ip}`;
}
