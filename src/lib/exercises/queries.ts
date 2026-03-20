import { createClient } from "@/lib/supabase/server";
import type {
  ExerciseWithTaxonomy,
  TaxonomyEntry,
  TaxonomyType,
  BilingualText,
  ExerciseType,
  ExerciseScope,
  TaxonomyScope,
} from "./types";

/**
 * Server-side queries for Exercise Library — PROJ-12
 *
 * All queries use the server-side Supabase client (RLS enforced).
 * Global exercises/taxonomy are readable by all authenticated users.
 * Trainer-scoped items are only visible to their creator.
 */

// ── DB Row Interfaces ───────────────────────────────────────────

interface DbExercise {
  id: string;
  name: unknown;
  description: unknown;
  exercise_type: string;
  scope: string;
  created_by: string | null;
  cloned_from: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DbTaxonomy {
  id: string;
  name: unknown;
  type: string;
  scope: string;
  created_by: string | null;
  sort_order: number;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DbAssignment {
  id: string;
  exercise_id: string;
  taxonomy_id: string;
  is_primary: boolean;
  created_at: string;
  taxonomy: DbTaxonomy;
}

// ── Mappers ─────────────────────────────────────────────────────

function mapTaxonomy(row: DbTaxonomy): TaxonomyEntry {
  return {
    id: row.id,
    name: row.name as BilingualText,
    type: row.type as TaxonomyType,
    scope: row.scope as TaxonomyScope,
    createdBy: row.created_by,
    sortOrder: row.sort_order,
    isDeleted: row.is_deleted,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── getExercises ────────────────────────────────────────────────

/** Fetch all visible exercises (global + own) with taxonomy data */
export async function getExercises(): Promise<ExerciseWithTaxonomy[]> {
  const supabase = await createClient();

  // RLS ensures we only see global + own exercises (is_deleted=false filtered by policy)
  const { data: exercises, error } = await supabase
    .from("exercises")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch exercises:", error);
    return [];
  }

  if (!exercises || exercises.length === 0) return [];

  const exerciseIds = exercises.map((e) => e.id);

  // Fetch all assignments with taxonomy join in one query
  const { data: assignments, error: assignError } = await supabase
    .from("exercise_taxonomy_assignments")
    .select(`
      id,
      exercise_id,
      taxonomy_id,
      is_primary,
      created_at,
      taxonomy:exercise_taxonomy (
        id, name, type, scope, created_by, sort_order,
        is_deleted, deleted_at, created_at, updated_at
      )
    `)
    .in("exercise_id", exerciseIds);

  if (assignError) {
    console.error("Failed to fetch taxonomy assignments:", assignError);
  }

  // Group assignments by exercise_id
  const assignmentMap = new Map<string, DbAssignment[]>();
  for (const a of (assignments ?? []) as unknown as DbAssignment[]) {
    if (!assignmentMap.has(a.exercise_id)) {
      assignmentMap.set(a.exercise_id, []);
    }
    assignmentMap.get(a.exercise_id)!.push(a);
  }

  return exercises.map((row) => {
    const ex = row as unknown as DbExercise;
    const exAssignments = assignmentMap.get(ex.id) ?? [];

    const primaryMuscleGroups: TaxonomyEntry[] = [];
    const secondaryMuscleGroups: TaxonomyEntry[] = [];
    const equipment: TaxonomyEntry[] = [];

    for (const a of exAssignments) {
      if (!a.taxonomy) continue;
      const tax = mapTaxonomy(a.taxonomy);
      if (tax.type === "muscle_group") {
        if (a.is_primary) {
          primaryMuscleGroups.push(tax);
        } else {
          secondaryMuscleGroups.push(tax);
        }
      } else if (tax.type === "equipment") {
        equipment.push(tax);
      }
    }

    // Sort by sort_order
    primaryMuscleGroups.sort((a, b) => a.sortOrder - b.sortOrder);
    secondaryMuscleGroups.sort((a, b) => a.sortOrder - b.sortOrder);
    equipment.sort((a, b) => a.sortOrder - b.sortOrder);

    return {
      id: ex.id,
      name: ex.name as BilingualText,
      description: ex.description as BilingualText | null,
      exerciseType: ex.exercise_type as ExerciseType,
      scope: ex.scope as ExerciseScope,
      createdBy: ex.created_by,
      clonedFrom: ex.cloned_from,
      isDeleted: ex.is_deleted,
      deletedAt: ex.deleted_at,
      createdAt: ex.created_at,
      updatedAt: ex.updated_at,
      primaryMuscleGroups,
      secondaryMuscleGroups,
      equipment,
    };
  });
}

// ── getTaxonomy ─────────────────────────────────────────────────

/** Fetch all visible taxonomy entries of a given type */
export async function getTaxonomy(
  type: TaxonomyType
): Promise<TaxonomyEntry[]> {
  const supabase = await createClient();

  // RLS ensures we only see global + own (is_deleted=false filtered by policy)
  const { data, error } = await supabase
    .from("exercise_taxonomy")
    .select("*")
    .eq("type", type)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to fetch taxonomy:", error);
    return [];
  }

  return (data ?? []).map((row) => mapTaxonomy(row as unknown as DbTaxonomy));
}

// ── getExerciseById ─────────────────────────────────────────────

/** Fetch a single exercise with all assignments */
export async function getExerciseById(
  id: string
): Promise<ExerciseWithTaxonomy | null> {
  const supabase = await createClient();

  const { data: exercise, error } = await supabase
    .from("exercises")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !exercise) {
    if (error) console.error("Failed to fetch exercise:", error);
    return null;
  }

  const ex = exercise as unknown as DbExercise;

  // Fetch assignments with taxonomy join
  const { data: assignments, error: assignError } = await supabase
    .from("exercise_taxonomy_assignments")
    .select(`
      id,
      exercise_id,
      taxonomy_id,
      is_primary,
      created_at,
      taxonomy:exercise_taxonomy (
        id, name, type, scope, created_by, sort_order,
        is_deleted, deleted_at, created_at, updated_at
      )
    `)
    .eq("exercise_id", id);

  if (assignError) {
    console.error("Failed to fetch exercise assignments:", assignError);
  }

  const primaryMuscleGroups: TaxonomyEntry[] = [];
  const secondaryMuscleGroups: TaxonomyEntry[] = [];
  const equipment: TaxonomyEntry[] = [];

  for (const a of (assignments ?? []) as unknown as DbAssignment[]) {
    if (!a.taxonomy) continue;
    const tax = mapTaxonomy(a.taxonomy);
    if (tax.type === "muscle_group") {
      if (a.is_primary) {
        primaryMuscleGroups.push(tax);
      } else {
        secondaryMuscleGroups.push(tax);
      }
    } else if (tax.type === "equipment") {
      equipment.push(tax);
    }
  }

  primaryMuscleGroups.sort((a, b) => a.sortOrder - b.sortOrder);
  secondaryMuscleGroups.sort((a, b) => a.sortOrder - b.sortOrder);
  equipment.sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    id: ex.id,
    name: ex.name as BilingualText,
    description: ex.description as BilingualText | null,
    exerciseType: ex.exercise_type as ExerciseType,
    scope: ex.scope as ExerciseScope,
    createdBy: ex.created_by,
    clonedFrom: ex.cloned_from,
    isDeleted: ex.is_deleted,
    deletedAt: ex.deleted_at,
    createdAt: ex.created_at,
    updatedAt: ex.updated_at,
    primaryMuscleGroups,
    secondaryMuscleGroups,
    equipment,
  };
}
