"use server";

/**
 * AI Usage & Rate Limiting Server Actions — PROJ-19
 *
 * Tracks AI calls per user and enforces configurable rate limits.
 * Rate limit settings are stored in admin_settings (key-value).
 * Usage is query-based: COUNT(*) WHERE created_at > period_start.
 *
 * All exports MUST be async functions (server actions).
 */

import { createClient } from "@/lib/supabase/server";
import type { RateLimitPeriod, RateLimitConfig, AiUsageData } from "./usage-types";

// ── Defaults ─────────────────────────────────────────────────────

const DEFAULT_RATE_LIMIT_PERIOD: RateLimitPeriod = "month";
const DEFAULT_RATE_LIMIT_COUNT = 50;

// ── Period Calculation ───────────────────────────────────────────

function getPeriodBounds(period: RateLimitPeriod): {
  start: Date;
  end: Date;
} {
  const now = new Date();

  switch (period) {
    case "day": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return { start, end };
    }
    case "week": {
      // Week starts on Monday
      const start = new Date(now);
      const dayOfWeek = start.getDay(); // 0=Sun, 1=Mon, ...
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      start.setDate(start.getDate() - daysFromMonday);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return { start, end };
    }
    case "month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return { start, end };
    }
    default: {
      // Fallback to month
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return { start, end };
    }
  }
}

// ── Read Rate Limit Config from admin_settings ───────────────────

export async function getRateLimitConfig(): Promise<RateLimitConfig> {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("admin_settings")
    .select("key, value")
    .in("key", ["ai_rate_limit_period", "ai_rate_limit_count"]);

  let period: RateLimitPeriod = DEFAULT_RATE_LIMIT_PERIOD;
  let maxCount: number = DEFAULT_RATE_LIMIT_COUNT;

  if (rows) {
    for (const row of rows) {
      if (row.key === "ai_rate_limit_period") {
        const val = typeof row.value === "string" ? row.value : String(row.value);
        if (val === "day" || val === "week" || val === "month") {
          period = val;
        }
      }
      if (row.key === "ai_rate_limit_count") {
        const val = typeof row.value === "number" ? row.value : Number(row.value);
        if (!isNaN(val) && val >= 0) {
          maxCount = val;
        }
      }
    }
  }

  return { period, maxCount };
}

// ── Get AI Usage Data for a User ─────────────────────────────────

/**
 * Returns the current AI usage data for the authenticated user.
 * For admins, returns isUnlimited=true with used count still tracked.
 */
export async function getAiUsageData(): Promise<AiUsageData | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const isAdmin = user.app_metadata?.is_platform_admin === true;
  const config = await getRateLimitConfig();
  const { start, end } = getPeriodBounds(config.period);

  // Count usage in current period
  const { count, error: countError } = await supabase
    .from("ai_usage_log")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", start.toISOString());

  if (countError) {
    console.error("Failed to count AI usage:", countError);
  }

  return {
    used: count ?? 0,
    limit: config.maxCount,
    period: config.period,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    isUnlimited: isAdmin,
  };
}

// ── Check Rate Limit (Server-side, before AI call) ───────────────

/**
 * Checks if the user has remaining AI calls in the current period.
 * Returns true if allowed, false if rate limited.
 * Admins always return true (unlimited).
 */
export async function checkRateLimit(userId: string, isAdmin: boolean): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
}> {
  if (isAdmin) {
    return { allowed: true, used: 0, limit: Infinity };
  }

  const config = await getRateLimitConfig();
  const { start } = getPeriodBounds(config.period);

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("ai_usage_log")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", start.toISOString());

  if (error) {
    console.error("Failed to check rate limit:", error);
    // Fail closed — deny the call when we can't verify the limit
    return { allowed: false, used: 0, limit: config.maxCount };
  }

  const used = count ?? 0;
  return {
    allowed: used < config.maxCount,
    used,
    limit: config.maxCount,
  };
}

// ── Log AI Usage ─────────────────────────────────────────────────

/**
 * Records an AI usage entry in the audit log.
 * Should be called AFTER a successful AI call.
 */
export async function logAiUsage(params: {
  userId: string;
  modelId: string;
  actionType: "suggest_all" | "optimize_field";
  exerciseName: string;
  fieldName?: string;
}): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("ai_usage_log").insert({
    user_id: params.userId,
    model_id: params.modelId,
    action_type: params.actionType,
    exercise_name: params.exerciseName,
    field_name: params.fieldName ?? null,
  });

  if (error) {
    console.error("Failed to log AI usage:", error);
    // Non-critical: don't throw — the AI call was already successful
  }
}
