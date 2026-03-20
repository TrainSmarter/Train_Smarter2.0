"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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

  // Insert exercise (scope='trainer', created_by=user.id)
  const { data: exercise, error: insertError } = await supabase
    .from("exercises")
    .insert({
      name,
      description: description ?? null,
      exercise_type: exerciseType,
      scope: "trainer",
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
