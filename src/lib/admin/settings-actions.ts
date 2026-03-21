"use server";

/**
 * Admin Settings Server Actions — PROJ-12
 *
 * Manages admin_settings table for AI model configuration.
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
