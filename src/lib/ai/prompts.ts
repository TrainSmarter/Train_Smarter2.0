"use server";

/**
 * AI Prompt Server Actions — PROJ-19
 *
 * Admin-configurable prompt templates stored in admin_settings.
 * Falls back to hardcoded defaults if no custom prompt is set.
 * All exports from this file MUST be async functions (server actions).
 */

import { createClient } from "@/lib/supabase/server";
import { verifyPlatformAdmin } from "@/lib/admin/actions";
import {
  DEFAULT_PROMPT_SUGGEST_ALL,
  DEFAULT_PROMPT_OPTIMIZE_FIELD,
} from "./prompt-defaults";
import type { CustomPrompts } from "./prompt-defaults";
import type { TaxonomyEntry } from "@/lib/exercises/types";

// ── Admin Settings Keys ──────────────────────────────────────────

const KEY_PROMPT_SUGGEST_ALL = "ai_prompt_suggest_all";
const KEY_PROMPT_OPTIMIZE_FIELD = "ai_prompt_optimize_field";

// ── Read Custom Prompt ───────────────────────────────────────────

/**
 * Get the custom prompt for the given action, or null if none is set.
 */
async function getCustomPrompt(key: string): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("admin_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error || !data) return null;

  const val = typeof data.value === "string" ? data.value : null;
  return val && val.trim().length > 0 ? val : null;
}

// ── Taxonomy Injection Helper ────────────────────────────────────

function injectTaxonomy(
  template: string,
  muscleGroups: TaxonomyEntry[],
  equipment: TaxonomyEntry[]
): string {
  const mgList = muscleGroups
    .map((mg) => `  - ${mg.id}: ${mg.name.de} / ${mg.name.en}`)
    .join("\n");

  const eqList = equipment
    .map((eq) => `  - ${eq.id}: ${eq.name.de} / ${eq.name.en}`)
    .join("\n");

  return template
    .replace(/\{\{taxonomy_muscles\}\}/g, mgList)
    .replace(/\{\{taxonomy_equipment\}\}/g, eqList);
}

// ── Get Resolved Prompts (with taxonomy injection) ───────────────

/**
 * Returns the system prompt for "suggest all fields", with taxonomy injected.
 * Uses custom prompt if set by admin, otherwise the hardcoded default.
 */
export async function getSuggestAllPrompt(
  muscleGroups: TaxonomyEntry[],
  equipment: TaxonomyEntry[]
): Promise<string> {
  const custom = await getCustomPrompt(KEY_PROMPT_SUGGEST_ALL);
  const template = custom ?? DEFAULT_PROMPT_SUGGEST_ALL;

  return injectTaxonomy(template, muscleGroups, equipment);
}

/** Sanitize a parameter before injecting into a prompt template. */
function sanitizePromptParam(input: string, maxLength = 500): string {
  return input.replace(/[\x00-\x1F\x7F]/g, " ").slice(0, maxLength).trim();
}

/**
 * Returns the system prompt for "optimize single field".
 * Uses custom prompt if set by admin, otherwise the hardcoded default.
 */
export async function getOptimizeFieldPrompt(params: {
  exerciseName: string;
  fieldName: string;
  currentValue: string;
  language: string;
}): Promise<string> {
  const custom = await getCustomPrompt(KEY_PROMPT_OPTIMIZE_FIELD);
  const template = custom ?? DEFAULT_PROMPT_OPTIMIZE_FIELD;

  // Sanitize all params before injection to prevent prompt injection
  const safeName = sanitizePromptParam(params.exerciseName, 200);
  const safeFieldName = sanitizePromptParam(params.fieldName, 100);
  const safeCurrentValue = sanitizePromptParam(params.currentValue, 2000);
  const safeLanguage = sanitizePromptParam(params.language, 20);

  return template
    .replace(/\{\{exercise_name\}\}/g, safeName)
    .replace(/\{\{field_name\}\}/g, safeFieldName)
    .replace(/\{\{current_value\}\}/g, safeCurrentValue)
    .replace(/\{\{language\}\}/g, safeLanguage);
}

// ── Admin: Get Custom Prompts (for editor UI) ────────────────────

/**
 * Returns the current custom prompts (admin-only).
 * Returns null values if no custom prompt is set (default will be used).
 */
export async function getCustomPrompts(): Promise<CustomPrompts> {
  const adminId = await verifyPlatformAdmin();
  if (!adminId) return { suggestAll: null, optimizeField: null };

  const supabase = await createClient();

  const { data } = await supabase
    .from("admin_settings")
    .select("key, value")
    .in("key", [KEY_PROMPT_SUGGEST_ALL, KEY_PROMPT_OPTIMIZE_FIELD]);

  const result: CustomPrompts = { suggestAll: null, optimizeField: null };

  if (data) {
    for (const row of data) {
      const val = typeof row.value === "string" ? row.value : null;
      if (row.key === KEY_PROMPT_SUGGEST_ALL) result.suggestAll = val;
      if (row.key === KEY_PROMPT_OPTIMIZE_FIELD) result.optimizeField = val;
    }
  }

  return result;
}

// ── Admin: Save Custom Prompt ────────────────────────────────────

/**
 * Save a custom prompt template. Admin-only.
 * Pass null or empty string to delete the custom prompt (revert to default).
 */
export async function saveCustomPrompt(
  promptKey: "suggest_all" | "optimize_field",
  content: string | null
): Promise<{ success: boolean; error?: string }> {
  const adminId = await verifyPlatformAdmin();
  if (!adminId) return { success: false, error: "UNAUTHORIZED" };

  const key =
    promptKey === "suggest_all"
      ? KEY_PROMPT_SUGGEST_ALL
      : KEY_PROMPT_OPTIMIZE_FIELD;

  const MAX_PROMPT_LENGTH = 5000;
  if (content && content.trim().length > MAX_PROMPT_LENGTH) {
    return { success: false, error: "PROMPT_TOO_LONG" };
  }

  const supabase = await createClient();

  if (!content || content.trim().length === 0) {
    // Delete custom prompt — revert to default
    const { error } = await supabase
      .from("admin_settings")
      .delete()
      .eq("key", key);

    if (error) {
      console.error("Failed to delete custom prompt:", error);
      return { success: false, error: "DELETE_FAILED" };
    }
    return { success: true };
  }

  // Upsert custom prompt
  const { error } = await supabase
    .from("admin_settings")
    .upsert(
      {
        key,
        value: content.trim(),
        updated_by: adminId,
      },
      { onConflict: "key" }
    );

  if (error) {
    console.error("Failed to save custom prompt:", error);
    return { success: false, error: "SAVE_FAILED" };
  }

  return { success: true };
}
