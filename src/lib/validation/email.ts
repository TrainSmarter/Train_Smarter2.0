import { z } from "zod";
import dns from "dns/promises";

/**
 * In-memory cache for DNS lookup results.
 * Key: domain, Value: { valid, expiresAt }
 * TTL: 1 hour
 */
const domainCache = new Map<
  string,
  { valid: boolean; expiresAt: number }
>();

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const DNS_TIMEOUT_MS = 3_000; // 3 seconds

const emailSchema = z.string().email();

/**
 * Validates an email address for plausibility:
 * 1. Zod format check (RFC 5322 basic)
 * 2. DNS MX record lookup on the domain
 * 3. Fallback to A record if no MX found
 *
 * Runs server-side only (uses Node.js dns module).
 * Fails open on DNS timeout — returns valid: true.
 */
export async function validateEmailPlausibility(
  email: string
): Promise<{ valid: boolean; reason?: string }> {
  // Step 1: Format check
  const formatResult = emailSchema.safeParse(email);
  if (!formatResult.success) {
    return { valid: false, reason: "invalid_format" };
  }

  // Step 2: Extract domain
  const domain = email.split("@").pop()!.toLowerCase();

  // Step 3: Check cache
  const cached = domainCache.get(domain);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.valid
      ? { valid: true }
      : { valid: false, reason: "no_mx_record" };
  }

  // Step 4: DNS lookup with timeout
  try {
    const mxRecords = await withTimeout(
      dns.resolveMx(domain),
      DNS_TIMEOUT_MS
    );

    if (mxRecords && mxRecords.length > 0) {
      cacheResult(domain, true);
      return { valid: true };
    }
  } catch (err: unknown) {
    // Timeout → fail-open
    if (err instanceof Error && err.message === "DNS_TIMEOUT") {
      cacheResult(domain, true);
      return { valid: true };
    }

    // ENODATA / ENOTFOUND → try A record fallback
    if (isDnsError(err)) {
      try {
        const aRecords = await withTimeout(
          dns.resolve4(domain),
          DNS_TIMEOUT_MS
        );

        if (aRecords && aRecords.length > 0) {
          cacheResult(domain, true);
          return { valid: true };
        }
      } catch (fallbackErr: unknown) {
        if (
          fallbackErr instanceof Error &&
          fallbackErr.message === "DNS_TIMEOUT"
        ) {
          cacheResult(domain, true);
          return { valid: true };
        }
        // A record also failed → domain invalid
      }
    }
  }

  // No MX and no A record found
  cacheResult(domain, false);
  return { valid: false, reason: "no_mx_record" };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cacheResult(domain: string, valid: boolean): void {
  domainCache.set(domain, {
    valid,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

function isDnsError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const code = (err as NodeJS.ErrnoException).code;
  return code === "ENODATA" || code === "ENOTFOUND" || code === "ESERVFAIL";
}

/**
 * Wraps a promise with a timeout. Rejects with "DNS_TIMEOUT" on expiry.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("DNS_TIMEOUT"));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}
