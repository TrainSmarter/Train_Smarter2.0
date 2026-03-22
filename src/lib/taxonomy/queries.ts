import { createClient } from "@/lib/supabase/server";
import type {
  CategoryDimension,
  CategoryNode,
  DimensionWithNodes,
  BilingualText,
  ExerciseType,
  DimensionScope,
  NodeScope,
} from "./types";

/**
 * Server-side queries for Taxonomy System -- PROJ-20
 *
 * All queries use the server-side Supabase client (RLS enforced).
 * Global dimensions/nodes are readable by all authenticated users.
 * Trainer-scoped nodes are only visible to their creator.
 */

// ── DB Row Interfaces ───────────────────────────────────────────

interface DbDimension {
  id: string;
  slug: string;
  name: unknown;
  description: unknown;
  exercise_type: string | null;
  scope: string;
  sort_order: number;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DbNode {
  id: string;
  dimension_id: string;
  parent_id: string | null;
  slug: string;
  name: unknown;
  description: unknown;
  path: string;
  depth: number;
  icon: string | null;
  trainer_visible: boolean;
  ai_hint: string | null;
  metadata: unknown;
  scope: string;
  created_by: string | null;
  sort_order: number;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Mappers ─────────────────────────────────────────────────────

function mapDimension(row: DbDimension): CategoryDimension {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name as BilingualText,
    description: row.description as BilingualText | null,
    exerciseType: row.exercise_type as ExerciseType | null,
    scope: row.scope as DimensionScope,
    sortOrder: row.sort_order,
    isDeleted: row.is_deleted,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapNode(row: DbNode): CategoryNode {
  return {
    id: row.id,
    dimensionId: row.dimension_id,
    parentId: row.parent_id,
    slug: row.slug,
    name: row.name as BilingualText,
    description: row.description as BilingualText | null,
    path: row.path,
    depth: row.depth,
    icon: row.icon,
    trainerVisible: row.trainer_visible,
    aiHint: row.ai_hint,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    scope: row.scope as NodeScope,
    createdBy: row.created_by,
    sortOrder: row.sort_order,
    isDeleted: row.is_deleted,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── getDimensions ───────────────────────────────────────────────

/** Fetch all non-deleted dimensions, ordered by sort_order */
export async function getDimensions(): Promise<CategoryDimension[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("category_dimensions")
    .select("*")
    .eq("is_deleted", false)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to fetch dimensions:", error);
    return [];
  }

  return (data ?? []).map((row) => mapDimension(row as unknown as DbDimension));
}

// ── getDimensionsForExerciseType ────────────────────────────────

/**
 * Fetch dimensions relevant for a given exercise type.
 * Returns dimensions where exercise_type is NULL (cross-cutting)
 * OR matches the given type.
 */
export async function getDimensionsForExerciseType(
  exerciseType: string | null
): Promise<CategoryDimension[]> {
  const supabase = await createClient();

  let query = supabase
    .from("category_dimensions")
    .select("*")
    .eq("is_deleted", false)
    .order("sort_order", { ascending: true });

  if (exerciseType) {
    // Cross-cutting (NULL) + type-specific
    query = query.or(`exercise_type.is.null,exercise_type.eq.${exerciseType}`);
  } else {
    // Only cross-cutting dimensions
    query = query.is("exercise_type", null);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch dimensions for exercise type:", error);
    return [];
  }

  return (data ?? []).map((row) => mapDimension(row as unknown as DbDimension));
}

// ── getNodesByDimension ─────────────────────────────────────────

/**
 * Fetch all non-deleted nodes for a dimension (flat array).
 * Client builds the tree from flat data.
 */
export async function getNodesByDimension(
  dimensionId: string
): Promise<CategoryNode[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("category_nodes")
    .select("*")
    .eq("dimension_id", dimensionId)
    .eq("is_deleted", false)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to fetch nodes for dimension:", error);
    return [];
  }

  return (data ?? []).map((row) => mapNode(row as unknown as DbNode));
}

// ── getAllTaxonomyData ──────────────────────────────────────────

/**
 * Fetch all dimensions + all nodes in one call for client-side caching.
 * Returns an array of DimensionWithNodes.
 */
export async function getAllTaxonomyData(): Promise<DimensionWithNodes[]> {
  const supabase = await createClient();

  // Parallel fetch: dimensions + all nodes
  const [dimResult, nodeResult] = await Promise.all([
    supabase
      .from("category_dimensions")
      .select("*")
      .eq("is_deleted", false)
      .order("sort_order", { ascending: true }),
    supabase
      .from("category_nodes")
      .select("*")
      .eq("is_deleted", false)
      .order("sort_order", { ascending: true }),
  ]);

  if (dimResult.error) {
    console.error("Failed to fetch dimensions:", dimResult.error);
    return [];
  }

  if (nodeResult.error) {
    console.error("Failed to fetch nodes:", nodeResult.error);
    return [];
  }

  const dimensions = (dimResult.data ?? []).map((row) =>
    mapDimension(row as unknown as DbDimension)
  );
  const allNodes = (nodeResult.data ?? []).map((row) =>
    mapNode(row as unknown as DbNode)
  );

  // Group nodes by dimension
  const nodesByDimension = new Map<string, CategoryNode[]>();
  for (const node of allNodes) {
    if (!nodesByDimension.has(node.dimensionId)) {
      nodesByDimension.set(node.dimensionId, []);
    }
    nodesByDimension.get(node.dimensionId)!.push(node);
  }

  return dimensions.map((dimension) => ({
    dimension,
    nodes: nodesByDimension.get(dimension.id) ?? [],
  }));
}

// ── getNodeAncestors ────────────────────────────────────────────

/**
 * Get all ancestors of a node (for breadcrumb display).
 * Calls the get_category_ancestors RPC function.
 */
export async function getNodeAncestors(
  nodeId: string
): Promise<CategoryNode[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_category_ancestors", {
    p_node_id: nodeId,
  });

  if (error) {
    console.error("Failed to fetch node ancestors:", error);
    return [];
  }

  return (data ?? []).map((row: unknown) => mapNode(row as DbNode));
}

// ── getExerciseCategoryAssignments ──────────────────────────────

/**
 * Fetch all category assignments for a given exercise.
 * Returns node IDs grouped with their full node data.
 */
export async function getExerciseCategoryAssignments(
  exerciseId: string
): Promise<{ nodeId: string; node: CategoryNode }[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("exercise_category_assignments")
    .select(
      `
      id,
      exercise_id,
      node_id,
      assigned_by,
      created_at,
      node:category_nodes (
        id, dimension_id, parent_id, slug, name, description,
        path, depth, icon, trainer_visible, ai_hint, metadata,
        scope, created_by, sort_order, is_deleted, deleted_at,
        created_at, updated_at
      )
    `
    )
    .eq("exercise_id", exerciseId);

  if (error) {
    console.error("Failed to fetch exercise category assignments:", error);
    return [];
  }

  return (data ?? [])
    .filter((row) => row.node !== null)
    .map((row) => ({
      nodeId: row.node_id,
      node: mapNode(row.node as unknown as DbNode),
    }));
}
