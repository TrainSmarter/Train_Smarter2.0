/**
 * Exercise Library types & Zod schemas — PROJ-12
 *
 * Types for exercises, taxonomy (muscle groups, equipment),
 * and junction table assignments.
 */

import { z } from "zod";

// ── Bilingual Label ─────────────────────────────────────────────

export interface BilingualText {
  de: string;
  en: string;
}

// ── Exercise Types ──────────────────────────────────────────────

export const EXERCISE_TYPES = ["strength", "endurance", "speed", "flexibility"] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export type ExerciseScope = "global" | "trainer";

export interface Exercise {
  id: string;
  name: BilingualText;
  description: BilingualText | null;
  exerciseType: ExerciseType;
  scope: ExerciseScope;
  createdBy: string | null;
  clonedFrom: string | null;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Exercise with taxonomy assignments resolved */
export interface ExerciseWithTaxonomy extends Exercise {
  primaryMuscleGroups: TaxonomyEntry[];
  secondaryMuscleGroups: TaxonomyEntry[];
  equipment: TaxonomyEntry[];
}

// ── Taxonomy Types ──────────────────────────────────────────────

export const TAXONOMY_TYPES = ["muscle_group", "equipment"] as const;
export type TaxonomyType = (typeof TAXONOMY_TYPES)[number];

export type TaxonomyScope = "global" | "trainer";

export interface TaxonomyEntry {
  id: string;
  name: BilingualText;
  type: TaxonomyType;
  scope: TaxonomyScope;
  createdBy: string | null;
  sortOrder: number;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Assignment Types ────────────────────────────────────────────

export interface TaxonomyAssignment {
  id: string;
  exerciseId: string;
  taxonomyId: string;
  isPrimary: boolean;
  createdAt: string;
}

// ── Zod Schemas — Form Validation ───────────────────────────────

const bilingualTextSchema = z.object({
  de: z.string().min(1).max(100),
  en: z.string().min(1).max(100),
});

const bilingualDescriptionSchema = z.object({
  de: z.string().max(2000).optional().default(""),
  en: z.string().max(2000).optional().default(""),
});

export const createExerciseSchema = z.object({
  name: bilingualTextSchema,
  description: bilingualDescriptionSchema.optional().nullable(),
  exerciseType: z.enum(EXERCISE_TYPES),
  primaryMuscleGroupIds: z.array(z.string().uuid()).default([]),
  secondaryMuscleGroupIds: z.array(z.string().uuid()).default([]),
  equipmentIds: z.array(z.string().uuid()).default([]),
});

export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;

export const updateExerciseSchema = z.object({
  id: z.string().uuid(),
  name: bilingualTextSchema.optional(),
  description: bilingualDescriptionSchema.optional().nullable(),
  exerciseType: z.enum(EXERCISE_TYPES).optional(),
  primaryMuscleGroupIds: z.array(z.string().uuid()).optional(),
  secondaryMuscleGroupIds: z.array(z.string().uuid()).optional(),
  equipmentIds: z.array(z.string().uuid()).optional(),
});

export type UpdateExerciseInput = z.infer<typeof updateExerciseSchema>;

export const cloneExerciseSchema = z.object({
  exerciseId: z.string().uuid(),
});

export type CloneExerciseInput = z.infer<typeof cloneExerciseSchema>;

export const createTaxonomySchema = z.object({
  name: bilingualTextSchema,
  type: z.enum(TAXONOMY_TYPES),
});

export type CreateTaxonomyInput = z.infer<typeof createTaxonomySchema>;

export const updateTaxonomySchema = z.object({
  id: z.string().uuid(),
  name: bilingualTextSchema.optional(),
});

export type UpdateTaxonomyInput = z.infer<typeof updateTaxonomySchema>;

export const deleteTaxonomySchema = z.object({
  id: z.string().uuid(),
});

export const deleteExerciseSchema = z.object({
  id: z.string().uuid(),
});

// ── PROJ-20: Hierarchical Taxonomy Types ───────────────────────

/** Category assignment as returned by queries (node info attached) */
export interface CategoryAssignmentInfo {
  nodeId: string;
  dimensionId: string;
  nodeName: { de: string; en: string };
  /** Materialized path, e.g. "muscle_group.upper.push" */
  nodePath: string;
  nodeDepth: number;
}

/** Exercise with hierarchical category assignments (PROJ-20) */
export interface ExerciseWithCategories extends Exercise {
  /** Legacy flat taxonomy — kept for backward compat */
  primaryMuscleGroups: TaxonomyEntry[];
  secondaryMuscleGroups: TaxonomyEntry[];
  equipment: TaxonomyEntry[];
  /** New hierarchical assignments grouped by dimension ID */
  categoryAssignments: CategoryAssignmentInfo[];
}

/** Zod schema for category assignments in exercise form */
export const exerciseCategoryAssignmentsSchema = z.record(
  z.string().uuid(),
  z.array(z.string().uuid())
);
