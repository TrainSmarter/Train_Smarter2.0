/**
 * Taxonomy types & Zod schemas -- PROJ-20
 *
 * Types for category dimensions, hierarchical category nodes,
 * and exercise-category assignments.
 */

import { z } from "zod";
import type { BilingualText } from "@/lib/exercises/types";

// Re-export for convenience
export type { BilingualText };

// ── Exercise Types (reuse from exercises) ───────────────────────
export const EXERCISE_TYPES = ["strength", "endurance", "speed", "flexibility"] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

// ── Scope Types ─────────────────────────────────────────────────
export type DimensionScope = "global";
export type NodeScope = "global" | "trainer";

// ── Category Dimension ──────────────────────────────────────────

export interface CategoryDimension {
  id: string;
  slug: string;
  name: BilingualText;
  description: BilingualText | null;
  exerciseType: ExerciseType | null;
  scope: DimensionScope;
  sortOrder: number;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Category Node ───────────────────────────────────────────────

export interface CategoryNode {
  id: string;
  dimensionId: string;
  parentId: string | null;
  slug: string;
  name: BilingualText;
  description: BilingualText | null;
  path: string;
  depth: number;
  icon: string | null;
  trainerVisible: boolean;
  aiHint: string | null;
  metadata: Record<string, unknown>;
  scope: NodeScope;
  createdBy: string | null;
  sortOrder: number;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Recursive tree structure for client-side rendering */
export interface CategoryNodeWithChildren extends CategoryNode {
  children: CategoryNodeWithChildren[];
}

// ── Exercise Category Assignment ────────────────────────────────

export interface ExerciseCategoryAssignment {
  id: string;
  exerciseId: string;
  nodeId: string;
  assignedBy: string | null;
  createdAt: string;
}

// ── Composed Types ──────────────────────────────────────────────

/** Dimension with its flat list of nodes */
export interface DimensionWithNodes {
  dimension: CategoryDimension;
  nodes: CategoryNode[];
}

// ── Zod Schemas — Bilingual Helpers ─────────────────────────────

const bilingualTextSchema = z.object({
  de: z.string().min(1).max(200),
  en: z.string().min(1).max(200),
});

const bilingualDescriptionSchema = z.object({
  de: z.string().max(2000).optional().default(""),
  en: z.string().max(2000).optional().default(""),
});

// ── Zod Schemas — Dimension CRUD ────────────────────────────────

export const createDimensionSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z][a-z0-9_-]*$/, "Slug must be lowercase with hyphens/underscores"),
  name: bilingualTextSchema,
  description: bilingualDescriptionSchema.optional().nullable(),
  exerciseType: z.enum(EXERCISE_TYPES).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
});

export type CreateDimensionInput = z.infer<typeof createDimensionSchema>;

export const updateDimensionSchema = z.object({
  id: z.string().uuid(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z][a-z0-9_-]*$/)
    .optional(),
  name: bilingualTextSchema.optional(),
  description: bilingualDescriptionSchema.optional().nullable(),
  exerciseType: z.enum(EXERCISE_TYPES).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
});

export type UpdateDimensionInput = z.infer<typeof updateDimensionSchema>;

// ── Zod Schemas — Node CRUD ─────────────────────────────────────

export const createNodeSchema = z.object({
  dimensionId: z.string().uuid(),
  parentId: z.string().uuid().optional().nullable(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z][a-z0-9-]*$/, "Slug must be lowercase with hyphens"),
  name: bilingualTextSchema,
  description: bilingualDescriptionSchema.optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  trainerVisible: z.boolean().optional(),
  aiHint: z.string().max(1000).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export type CreateNodeInput = z.infer<typeof createNodeSchema>;

export const updateNodeSchema = z.object({
  id: z.string().uuid(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z][a-z0-9-]*$/)
    .optional(),
  name: bilingualTextSchema.optional(),
  description: bilingualDescriptionSchema.optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  trainerVisible: z.boolean().optional(),
  aiHint: z.string().max(1000).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export type UpdateNodeInput = z.infer<typeof updateNodeSchema>;

export const moveNodeSchema = z.object({
  nodeId: z.string().uuid(),
  newParentId: z.string().uuid().nullable(),
});

export type MoveNodeInput = z.infer<typeof moveNodeSchema>;

export const deleteNodeSchema = z.object({
  id: z.string().uuid(),
});

export const deleteDimensionSchema = z.object({
  id: z.string().uuid(),
});

export const reorderNodesSchema = z.object({
  nodeIds: z.array(z.string().uuid()).min(1),
});

export type ReorderNodesInput = z.infer<typeof reorderNodesSchema>;

export const setExerciseCategoryAssignmentsSchema = z.object({
  exerciseId: z.string().uuid(),
  nodeIds: z.array(z.string().uuid()),
});

export type SetExerciseCategoryAssignmentsInput = z.infer<
  typeof setExerciseCategoryAssignmentsSchema
>;
