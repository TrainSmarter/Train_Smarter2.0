"use server";

/**
 * Admin Settings Server Actions — PROJ-12, PROJ-19
 *
 * Manages admin_settings table for AI model configuration and rate limiting.
 * All actions require is_platform_admin.
 */

import { createClient } from "@/lib/supabase/server";
import { verifyPlatformAdmin } from "./actions";
import {
  DEFAULT_AI_MODEL,
  getModelById,
  getAvailableProviders,
} from "@/lib/ai/providers";
import { suggestExercise } from "@/lib/ai/suggest-exercise";
import type { AiExerciseSuggestion, ApiKeyStatus } from "@/lib/ai/providers";
import type { RateLimitPeriod, RateLimitConfig } from "@/lib/ai/usage-types";

type ActionResult<T = undefined> = T extends undefined
  ? { success: boolean; error?: string }
  : { success: boolean; error?: string; data?: T };

// ── Get AI Model Setting ─────────────────────────────────────────

/** Read the currently configured AI model ID from admin_settings. */
export async function getAiModelSetting(): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("admin_settings")
    .select("value")
    .eq("key", "ai_model")
    .maybeSingle();

  if (error || !data) {
    console.error("Failed to read ai_model setting:", error);
    return DEFAULT_AI_MODEL;
  }

  // value is stored as JSONB — a quoted string like '"claude-haiku-4-5-20251001"'
  const modelId = typeof data.value === "string" ? data.value : String(data.value);

  // Validate it's a known model
  if (!getModelById(modelId)) {
    return DEFAULT_AI_MODEL;
  }

  return modelId;
}

// ── Set AI Model Setting ─────────────────────────────────────────

/** Update the AI model setting. Requires platform admin. */
export async function setAiModelSetting(
  modelId: string
): Promise<ActionResult> {
  const adminId = await verifyPlatformAdmin();
  if (!adminId) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // Validate model exists in registry
  if (!getModelById(modelId)) {
    return { success: false, error: "INVALID_MODEL" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("admin_settings")
    .upsert(
      {
        key: "ai_model",
        value: modelId,
        updated_by: adminId,
      },
      { onConflict: "key" }
    );

  if (error) {
    console.error("Failed to update ai_model setting:", error);
    return { success: false, error: "UPDATE_FAILED" };
  }

  return { success: true };
}

// ── Get API Key Status ───────────────────────────────────────────

/** Returns which AI providers have API keys configured (boolean per provider, never the key itself). */
export async function getApiKeyStatus(): Promise<ApiKeyStatus> {
  const adminId = await verifyPlatformAdmin();
  if (!adminId) {
    return { anthropic: false, openai: false };
  }

  const providers = getAvailableProviders();
  return {
    anthropic: providers.find((p) => p.provider === "anthropic")?.available ?? false,
    openai: providers.find((p) => p.provider === "openai")?.available ?? false,
  };
}

// ── Test AI Model ────────────────────────────────────────────────

/** Test an AI model by running a suggestion for a given exercise name. Requires platform admin. */
export async function testAiModel(
  modelId: string,
  testExerciseName: string
): Promise<ActionResult<AiExerciseSuggestion>> {
  const adminId = await verifyPlatformAdmin();
  if (!adminId) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  if (!testExerciseName || testExerciseName.trim().length === 0) {
    return { success: false, error: "EMPTY_EXERCISE_NAME" };
  }

  if (!getModelById(modelId)) {
    return { success: false, error: "INVALID_MODEL" };
  }

  try {
    const suggestion = await suggestExercise(
      testExerciseName.trim(),
      "de",
      modelId
    );
    return { success: true, data: suggestion };
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    console.error("AI model test failed:", message);
    return { success: false, error: message };
  }
}

// ── Get Extended Thinking Setting ─────────────────────────────────

/** Read whether extended thinking is enabled. */
export async function getExtendedThinkingSetting(): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("admin_settings")
    .select("value")
    .eq("key", "ai_extended_thinking")
    .maybeSingle();

  if (error || !data) return false;

  return data.value === true || data.value === "true";
}

/** Update the extended thinking setting. Requires platform admin. */
export async function setExtendedThinkingSetting(
  enabled: boolean
): Promise<ActionResult> {
  const adminId = await verifyPlatformAdmin();
  if (!adminId) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("admin_settings")
    .upsert(
      {
        key: "ai_extended_thinking",
        value: enabled,
        updated_by: adminId,
      },
      { onConflict: "key" }
    );

  if (error) {
    console.error("Failed to update extended thinking setting:", error);
    return { success: false, error: "UPDATE_FAILED" };
  }

  return { success: true };
}

// ── Get Rate Limit Config ────────────────────────────────────────

/** Read the current rate limit configuration from admin_settings. Admin-only. */
export async function getRateLimitConfigAdmin(): Promise<
  ActionResult<RateLimitConfig>
> {
  const adminId = await verifyPlatformAdmin();
  if (!adminId) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("admin_settings")
    .select("key, value")
    .in("key", ["ai_rate_limit_period", "ai_rate_limit_count"]);

  let period: RateLimitPeriod = "month";
  let maxCount = 50;

  if (rows) {
    for (const row of rows) {
      if (row.key === "ai_rate_limit_period") {
        const val =
          typeof row.value === "string" ? row.value : String(row.value);
        if (val === "day" || val === "week" || val === "month") {
          period = val;
        }
      }
      if (row.key === "ai_rate_limit_count") {
        const val =
          typeof row.value === "number" ? row.value : Number(row.value);
        if (!isNaN(val) && val >= 0) {
          maxCount = val;
        }
      }
    }
  }

  return { success: true, data: { period, maxCount } };
}

// ── Set Rate Limit Config ────────────────────────────────────────

/** Update rate limit configuration. Requires platform admin. */
export async function setRateLimitConfig(
  period: RateLimitPeriod,
  maxCount: number
): Promise<ActionResult> {
  const adminId = await verifyPlatformAdmin();
  if (!adminId) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // Validate inputs
  const validPeriods: RateLimitPeriod[] = ["day", "week", "month"];
  if (!validPeriods.includes(period)) {
    return { success: false, error: "INVALID_PERIOD" };
  }

  if (!Number.isInteger(maxCount) || maxCount < 0 || maxCount > 10000) {
    return { success: false, error: "INVALID_COUNT" };
  }

  const supabase = await createClient();

  // Batch upsert both settings atomically
  const { error } = await supabase
    .from("admin_settings")
    .upsert(
      [
        { key: "ai_rate_limit_period", value: period, updated_by: adminId },
        { key: "ai_rate_limit_count", value: maxCount, updated_by: adminId },
      ],
      { onConflict: "key" }
    );

  if (error) {
    console.error("Failed to update rate limit config:", error);
    return { success: false, error: "UPDATE_FAILED" };
  }

  return { success: true };
}
