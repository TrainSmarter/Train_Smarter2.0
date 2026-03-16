import { NextResponse } from "next/server";
import { z } from "zod";
import { validateEmailPlausibility } from "@/lib/validation/email";

const requestSchema = z.object({
  email: z.string().email(),
});

// ── Rate Limiting ──────────────────────────────────────────────
// Uses a global Map that persists within a single serverless instance.
// On Vercel, each cold-start creates a new Map — this provides best-effort
// protection within a single instance. For strict rate limiting across
// instances, use Vercel KV or Upstash Redis.
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 30; // max 30 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Periodic cleanup to prevent unbounded Map growth in long-running instances
const CLEANUP_INTERVAL_MS = 5 * 60_000; // 5 minutes
let lastCleanup = Date.now();

function cleanupStaleEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}

function isRateLimited(ip: string): boolean {
  cleanupStaleEntries();
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

/**
 * POST /api/validate-email
 *
 * Public endpoint — no auth required, rate-limited per IP.
 * Validates whether an email domain has MX (or A) records.
 *
 * Request:  { email: string }
 * Response: { valid: boolean, reason?: string }
 */
export async function POST(request: Request) {
  // Rate limiting
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 }
    );
  }

  // Content-Type check
  const contentType = request.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    return NextResponse.json(
      { valid: false, reason: "invalid_format" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { valid: false, reason: "invalid_format" },
        { status: 400 }
      );
    }

    const result = await validateEmailPlausibility(parsed.data.email);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { valid: false, reason: "invalid_format" },
      { status: 400 }
    );
  }
}
