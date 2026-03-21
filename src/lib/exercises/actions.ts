"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { suggestExercise } from "@/lib/ai/suggest-exercise";
import { optimizeField } from "@/lib/ai/optimize-field";
import { getAiModelSetting, getExtendedThinkingSetting } from "@/lib/admin/settings-actions";
import { checkRateLimit, logAiUsage, deleteAiUsageEntry } from "@/lib/ai/usage";
import { getOptimizeFieldPrompt } from "@/lib/ai/prompts";
import type { AiExerciseSuggestion } from "@/lib/ai/providers";
import {
  createExerciseSchema,
  updateExerciseSchema,
  deleteExerciseSchema,
  cloneExerciseSchema,
  createTaxonomySchema,
  updateTaxonomySchema,
  deleteTaxonomySchema,
} from "./types";

/**
 * Server Actions for Exercise Library — PROJ-12
 *
 * Pattern: authenticate -> validate -> authorize -> mutate -> revalidate -> return result
 */

type ActionResult<T = undefined> = T extends undefined
  ? { success: boolean; error?: string }
  : { success: boolean; error?: string; data?: T };

// ── Create Exercise ─────────────────────────────────────────────

export async function createExercise(data: {
  name: { de: string; en: string };
  description?: { de?: string; en?: string } | null;
  exerciseType: string;
  primaryMuscleGroupIds?: string[];
  secondaryMuscleGroupIds?: string[];
  equipmentIds?: string[];
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // Validate input
  const parsed = createExerciseSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  const {
    name,
    description,
    exerciseType,
    primaryMuscleGroupIds,
    secondaryMuscleGroupIds,
    equipmentIds,
  } = parsed.data;

  // Admin exercises are global (visible to all), trainer exercises are personal
  const isAdmin = user.app_metadata?.is_platform_admin === true;
  const { data: exercise, error: insertError } = await supabase
    .from("exercises")
    .insert({
      name,
      description: description ?? null,
      exercise_type: exerciseType,
      scope: isAdmin ? "global" : "trainer",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (insertError || !exercise) {
    console.error("Failed to create exercise:", insertError);
    return { success: false, error: "INSERT_FAILED" };
  }

  // Insert taxonomy assignments
  const assignments = [
    ...primaryMuscleGroupIds.map((tid) => ({
      exercise_id: exercise.id,
      taxonomy_id: tid,
      is_primary: true,
    })),
    ...secondaryMuscleGroupIds.map((tid) => ({
      exercise_id: exercise.id,
      taxonomy_id: tid,
      is_primary: false,
    })),
    ...equipmentIds.map((tid) => ({
      exercise_id: exercise.id,
      taxonomy_id: tid,
      is_primary: true, // equipment doesn't use primary/secondary distinction
    })),
  ];

  if (assignments.length > 0) {
    const { error: assignError } = await supabase
      .from("exercise_taxonomy_assignments")
      .insert(assignments);

    if (assignError) {
      console.error("Failed to create taxonomy assignments:", assignError);
      // Exercise was created, but assignments failed — not a full rollback
      // The user can edit and fix assignments later
    }
  }

  revalidatePath("/training/exercises", "page");
  return { success: true };
}

// ── Update Exercise ─────────────────────────────────────────────

export async function updateExercise(data: {
  id: string;
  name?: { de: string; en: string };
  description?: { de?: string; en?: string } | null;
  exerciseType?: string;
  primaryMuscleGroupIds?: string[];
  secondaryMuscleGroupIds?: string[];
  equipmentIds?: string[];
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // Validate input
  const parsed = updateExerciseSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  const {
    id,
    name,
    description,
    exerciseType,
    primaryMuscleGroupIds,
    secondaryMuscleGroupIds,
    equipmentIds,
  } = parsed.data;

  // Build update object
  const dbUpdates: Record<string, unknown> = {};
  if (name !== undefined) dbUpdates.name = name;
  if (description !== undefined) dbUpdates.description = description;
  if (exerciseType !== undefined) dbUpdates.exercise_type = exerciseType;

  if (Object.keys(dbUpdates).length > 0) {
    // RLS ensures only own exercises can be updated
    const { error: updateError } = await supabase
      .from("exercises")
      .update(dbUpdates)
      .eq("id", id)
      .eq("created_by", user.id);

    if (updateError) {
      console.error("Failed to update exercise:", updateError);
      return { success: false, error: "UPDATE_FAILED" };
    }
  }

  // If taxonomy IDs were provided, replace all assignments
  const hasTaxonomyUpdate =
    primaryMuscleGroupIds !== undefined ||
    secondaryMuscleGroupIds !== undefined ||
    equipmentIds !== undefined;

  if (hasTaxonomyUpdate) {
    // Delete existing assignments
    const { error: deleteAssignError } = await supabase
      .from("exercise_taxonomy_assignments")
      .delete()
      .eq("exercise_id", id);

    if (deleteAssignError) {
      console.error("Failed to delete old assignments:", deleteAssignError);
    }

    // Insert new assignments
    const assignments = [
      ...(primaryMuscleGroupIds ?? []).map((tid) => ({
        exercise_id: id,
        taxonomy_id: tid,
        is_primary: true,
      })),
      ...(secondaryMuscleGroupIds ?? []).map((tid) => ({
        exercise_id: id,
        taxonomy_id: tid,
        is_primary: false,
      })),
      ...(equipmentIds ?? []).map((tid) => ({
        exercise_id: id,
        taxonomy_id: tid,
        is_primary: true,
      })),
    ];

    if (assignments.length > 0) {
      const { error: assignError } = await supabase
        .from("exercise_taxonomy_assignments")
        .insert(assignments);

      if (assignError) {
        console.error("Failed to create taxonomy assignments:", assignError);
      }
    }
  }

  revalidatePath("/training/exercises", "page");
  return { success: true };
}

// ── Delete Exercise (Soft Delete) ───────────────────────────────

export async function deleteExercise(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // Validate input
  const parsed = deleteExerciseSchema.safeParse({ id });
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  // Soft-delete: set is_deleted=true, deleted_at=now()
  // RLS ensures only own exercises can be updated
  const { error: updateError } = await supabase
    .from("exercises")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("created_by", user.id);

  if (updateError) {
    console.error("Failed to soft-delete exercise:", updateError);
    return { success: false, error: "DELETE_FAILED" };
  }

  revalidatePath("/training/exercises", "page");
  return { success: true };
}

// ── Clone Exercise ──────────────────────────────────────────────

export async function cloneExercise(
  exerciseId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // Validate input
  const parsed = cloneExerciseSchema.safeParse({ exerciseId });
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  // Fetch the source exercise (RLS ensures it's visible)
  const { data: source, error: fetchError } = await supabase
    .from("exercises")
    .select("*")
    .eq("id", exerciseId)
    .maybeSingle();

  if (fetchError || !source) {
    console.error("Failed to fetch source exercise:", fetchError);
    return { success: false, error: "NOT_FOUND" };
  }

  // Build cloned name with suffix
  const sourceName = source.name as { de: string; en: string };
  const clonedName = {
    de: `${sourceName.de} (Kopie)`,
    en: `${sourceName.en} (Copy)`,
  };

  // Insert cloned exercise
  const { data: cloned, error: insertError } = await supabase
    .from("exercises")
    .insert({
      name: clonedName,
      description: source.description,
      exercise_type: source.exercise_type,
      scope: "trainer",
      created_by: user.id,
      cloned_from: source.id,
    })
    .select("id")
    .single();

  if (insertError || !cloned) {
    console.error("Failed to clone exercise:", insertError);
    return { success: false, error: "CLONE_FAILED" };
  }

  // Copy taxonomy assignments
  const { data: sourceAssignments } = await supabase
    .from("exercise_taxonomy_assignments")
    .select("taxonomy_id, is_primary")
    .eq("exercise_id", exerciseId);

  if (sourceAssignments && sourceAssignments.length > 0) {
    const clonedAssignments = sourceAssignments.map((a) => ({
      exercise_id: cloned.id,
      taxonomy_id: a.taxonomy_id,
      is_primary: a.is_primary,
    }));

    const { error: assignError } = await supabase
      .from("exercise_taxonomy_assignments")
      .insert(clonedAssignments);

    if (assignError) {
      console.error("Failed to clone taxonomy assignments:", assignError);
    }
  }

  revalidatePath("/training/exercises", "page");
  return { success: true };
}

// ── Create Taxonomy Entry ───────────────────────────────────────

export async function createTaxonomyEntry(data: {
  name: { de: string; en: string };
  type: "muscle_group" | "equipment";
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // Validate input
  const parsed = createTaxonomySchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  const { name, type } = parsed.data;

  // Determine next sort_order for trainer's own entries of this type
  const { data: existing } = await supabase
    .from("exercise_taxonomy")
    .select("sort_order")
    .eq("type", type)
    .eq("scope", "trainer")
    .eq("created_by", user.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSortOrder = (existing?.sort_order ?? 0) + 1;

  const { error: insertError } = await supabase
    .from("exercise_taxonomy")
    .insert({
      name,
      type,
      scope: "trainer",
      created_by: user.id,
      sort_order: nextSortOrder,
    });

  if (insertError) {
    console.error("Failed to create taxonomy entry:", insertError);
    return { success: false, error: "INSERT_FAILED" };
  }

  revalidatePath("/training/exercises", "page");
  return { success: true };
}

// ── Update Taxonomy Entry ───────────────────────────────────────

export async function updateTaxonomyEntry(data: {
  id: string;
  name?: { de: string; en: string };
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // Validate input
  const parsed = updateTaxonomySchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  const { id, name } = parsed.data;

  if (!name) {
    return { success: false, error: "NO_CHANGES" };
  }

  // RLS ensures only own taxonomy entries can be updated
  const { error: updateError } = await supabase
    .from("exercise_taxonomy")
    .update({ name })
    .eq("id", id)
    .eq("created_by", user.id);

  if (updateError) {
    console.error("Failed to update taxonomy entry:", updateError);
    return { success: false, error: "UPDATE_FAILED" };
  }

  revalidatePath("/training/exercises", "page");
  return { success: true };
}

// ── Delete Taxonomy Entry (Soft Delete) ─────────────────────────

export async function deleteTaxonomyEntry(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // Validate input
  const parsed = deleteTaxonomySchema.safeParse({ id });
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  // Soft-delete: set is_deleted=true, deleted_at=now()
  // RLS ensures only own taxonomy entries can be updated
  const { error: updateError } = await supabase
    .from("exercise_taxonomy")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("created_by", user.id);

  if (updateError) {
    console.error("Failed to soft-delete taxonomy entry:", updateError);
    return { success: false, error: "DELETE_FAILED" };
  }

  revalidatePath("/training/exercises", "page");
  return { success: true };
}

// ── AI Authorization Helper ──────────────────────────────────────

/**
 * Check if a user is authorized to use AI features.
 * Returns true for platform admins or trainers with ai_enabled=true.
 */
function isAiAuthorized(user: {
  app_metadata?: Record<string, unknown>;
}): boolean {
  if (user.app_metadata?.is_platform_admin === true) return true;
  if (user.app_metadata?.ai_enabled === true) return true;
  return false;
}

// ── Suggest Exercise Details (AI) ────────────────────────────────

/**
 * Use AI to suggest exercise details based on a name.
 * Available to platform admins and trainers with ai_enabled=true.
 * Enforces server-side rate limiting before making the AI call.
 *
 * Reads the configured AI model from admin_settings, then calls
 * the AI provider to generate a suggestion with validated taxonomy UUIDs.
 */
export async function suggestExerciseDetails(
  name: string,
  locale: "de" | "en"
): Promise<ActionResult<AiExerciseSuggestion>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // Check AI authorization: admin OR ai_enabled trainer
  if (!isAiAuthorized(user)) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  if (!name || name.trim().length === 0) {
    return { success: false, error: "EMPTY_EXERCISE_NAME" };
  }

  // Server-side rate limit check
  const isAdmin = user.app_metadata?.is_platform_admin === true;
  const rateLimitResult = await checkRateLimit(user.id, isAdmin);
  if (!rateLimitResult.allowed) {
    return { success: false, error: "RATE_LIMIT_EXCEEDED" };
  }

  // Read configured model + thinking setting from admin_settings
  const [modelId, useThinking] = await Promise.all([
    getAiModelSetting(),
    getExtendedThinkingSetting(),
  ]);

  // Log usage BEFORE AI call (optimistic), rollback on failure
  const usageEntryId = await logAiUsage({
    userId: user.id,
    modelId,
    actionType: "suggest_all",
    exerciseName: name.trim(),
  });

  try {
    const suggestion = await suggestExercise(name.trim(), locale, modelId, useThinking);

    return { success: true, data: suggestion };
  } catch (err) {
    // Rollback usage log on AI failure
    if (usageEntryId) {
      await deleteAiUsageEntry(usageEntryId);
    }
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    console.error("AI exercise suggestion failed:", message);
    return { success: false, error: message };
  }
}

// ── Optimize Exercise Field (AI — Single Field) ──────────────────

/**
 * Optimize a single exercise field using AI.
 * Available to platform admins and trainers with ai_enabled=true.
 * Enforces server-side rate limiting. Counts as 1 AI call.
 *
 * @param fieldName - The field to optimize (name_de, name_en, description_de, description_en)
 * @param currentValue - The current field content
 * @param exerciseName - The exercise name for context
 * @param locale - The target language
 */
export async function optimizeExerciseField(
  fieldName: "name_de" | "name_en" | "description_de" | "description_en",
  currentValue: string,
  exerciseName: string,
  locale: "de" | "en"
): Promise<ActionResult<string>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // Check AI authorization
  if (!isAiAuthorized(user)) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  if (!exerciseName || exerciseName.trim().length === 0) {
    return { success: false, error: "EMPTY_EXERCISE_NAME" };
  }

  // Validate fieldName
  const validFields = ["name_de", "name_en", "description_de", "description_en"];
  if (!validFields.includes(fieldName)) {
    return { success: false, error: "INVALID_FIELD" };
  }

  // Server-side rate limit check
  const isAdmin = user.app_metadata?.is_platform_admin === true;
  const rateLimitResult = await checkRateLimit(user.id, isAdmin);
  if (!rateLimitResult.allowed) {
    return { success: false, error: "RATE_LIMIT_EXCEEDED" };
  }

  // Map field names to human-readable labels for the prompt
  const fieldLabels: Record<string, string> = {
    name_de: "German exercise name",
    name_en: "English exercise name",
    description_de: "German exercise description",
    description_en: "English exercise description",
  };

  const languageMap: Record<string, string> = {
    name_de: "German",
    name_en: "English",
    description_de: "German",
    description_en: "English",
  };

  // Build the prompt using admin-configurable template
  const systemPrompt = await getOptimizeFieldPrompt({
    exerciseName: exerciseName.trim(),
    fieldName: fieldLabels[fieldName] ?? fieldName,
    currentValue: currentValue || "(empty)",
    language: languageMap[fieldName] ?? (locale === "de" ? "German" : "English"),
  });

  const [modelId, useThinking] = await Promise.all([
    getAiModelSetting(),
    getExtendedThinkingSetting(),
  ]);

  // Log usage BEFORE AI call (optimistic), rollback on failure
  const usageEntryId = await logAiUsage({
    userId: user.id,
    modelId,
    actionType: "optimize_field",
    exerciseName: exerciseName.trim(),
    fieldName,
  });

  try {
    const result = await optimizeField(
      systemPrompt,
      exerciseName.trim(),
      modelId,
      useThinking
    );

    return { success: true, data: result };
  } catch (err) {
    // Rollback usage log on AI failure
    if (usageEntryId) {
      await deleteAiUsageEntry(usageEntryId);
    }
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    console.error("AI field optimization failed:", message);
    return { success: false, error: message };
  }
}
