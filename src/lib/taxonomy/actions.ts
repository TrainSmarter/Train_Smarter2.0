"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import {
  createDimensionSchema,
  updateDimensionSchema,
  deleteDimensionSchema,
  createNodeSchema,
  updateNodeSchema,
  moveNodeSchema,
  deleteNodeSchema,
  reorderNodesSchema,
  setExerciseCategoryAssignmentsSchema,
} from "./types";

/**
 * Server Actions for Taxonomy System -- PROJ-20
 *
 * Pattern: authenticate -> validate -> authorize -> mutate -> revalidate -> return result
 */

type ActionResult<T = undefined> = T extends undefined
  ? { success: boolean; error?: string }
  : { success: boolean; error?: string; data?: T };

/** Get a service-role client for admin operations (bypasses RLS) */
function getAdminClient() {
  return createSupabaseClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ── Create Dimension (admin only) ───────────────────────────────

export async function createDimension(data: {
  slug: string;
  name: { de: string; en: string };
  description?: { de?: string; en?: string } | null;
  exerciseType?: string | null;
  sortOrder?: number;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  if (user.app_metadata?.is_platform_admin !== true) {
    return { success: false, error: "FORBIDDEN" };
  }

  const parsed = createDimensionSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  const { slug, name, description, exerciseType, sortOrder } = parsed.data;

  const dbClient = getAdminClient();

  const { error: insertError } = await dbClient
    .from("category_dimensions")
    .insert({
      slug,
      name,
      description: description ?? null,
      exercise_type: exerciseType ?? null,
      sort_order: sortOrder ?? 0,
    });

  if (insertError) {
    console.error("Failed to create dimension:", insertError);
    if (insertError.code === "23505") {
      return { success: false, error: "SLUG_EXISTS" };
    }
    return { success: false, error: "INSERT_FAILED" };
  }

  revalidatePath("/admin/taxonomy", "page");
  revalidatePath("/training/exercises", "page");
  return { success: true };
}

// ── Update Dimension (admin only) ───────────────────────────────

export async function updateDimension(data: {
  id: string;
  slug?: string;
  name?: { de: string; en: string };
  description?: { de?: string; en?: string } | null;
  exerciseType?: string | null;
  sortOrder?: number;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  if (user.app_metadata?.is_platform_admin !== true) {
    return { success: false, error: "FORBIDDEN" };
  }

  const parsed = updateDimensionSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  const { id, slug, name, description, exerciseType, sortOrder } = parsed.data;

  const dbUpdates: Record<string, unknown> = {};
  if (slug !== undefined) dbUpdates.slug = slug;
  if (name !== undefined) dbUpdates.name = name;
  if (description !== undefined) dbUpdates.description = description;
  if (exerciseType !== undefined) dbUpdates.exercise_type = exerciseType;
  if (sortOrder !== undefined) dbUpdates.sort_order = sortOrder;

  if (Object.keys(dbUpdates).length === 0) {
    return { success: false, error: "NO_CHANGES" };
  }

  const dbClient = getAdminClient();

  const { error: updateError } = await dbClient
    .from("category_dimensions")
    .update(dbUpdates)
    .eq("id", id);

  if (updateError) {
    console.error("Failed to update dimension:", updateError);
    if (updateError.code === "23505") {
      return { success: false, error: "SLUG_EXISTS" };
    }
    return { success: false, error: "UPDATE_FAILED" };
  }

  revalidatePath("/admin/taxonomy", "page");
  revalidatePath("/training/exercises", "page");
  return { success: true };
}

// ── Delete Dimension (soft-delete, admin only) ──────────────────

export async function deleteDimension(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  if (user.app_metadata?.is_platform_admin !== true) {
    return { success: false, error: "FORBIDDEN" };
  }

  const parsed = deleteDimensionSchema.safeParse({ id });
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  const dbClient = getAdminClient();
  const now = new Date().toISOString();

  // Soft-delete dimension
  const { error: dimError } = await dbClient
    .from("category_dimensions")
    .update({ is_deleted: true, deleted_at: now })
    .eq("id", id);

  if (dimError) {
    console.error("Failed to soft-delete dimension:", dimError);
    return { success: false, error: "DELETE_FAILED" };
  }

  // Soft-delete all nodes in this dimension
  const { error: nodesError } = await dbClient
    .from("category_nodes")
    .update({ is_deleted: true, deleted_at: now })
    .eq("dimension_id", id)
    .eq("is_deleted", false);

  if (nodesError) {
    console.error("Failed to soft-delete dimension nodes:", nodesError);
  }

  revalidatePath("/admin/taxonomy", "page");
  revalidatePath("/training/exercises", "page");
  return { success: true };
}

// ── Create Node ─────────────────────────────────────────────────

export async function createNode(data: {
  dimensionId: string;
  parentId?: string | null;
  slug: string;
  name: { de: string; en: string };
  description?: { de?: string; en?: string } | null;
  icon?: string | null;
  trainerVisible?: boolean;
  aiHint?: string | null;
  metadata?: Record<string, unknown>;
  sortOrder?: number;
}): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const parsed = createNodeSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  const {
    dimensionId,
    parentId,
    slug,
    name,
    description,
    icon,
    trainerVisible,
    aiHint,
    metadata,
    sortOrder,
  } = parsed.data;

  const isAdmin = user.app_metadata?.is_platform_admin === true;
  const roles = (user.app_metadata?.roles as string[]) ?? [];

  // Only admins and trainers can create nodes; athletes cannot
  if (!isAdmin && !roles.includes("TRAINER")) {
    return { success: false, error: "FORBIDDEN" };
  }

  // Admin creates global nodes, trainers create trainer-scoped nodes
  const dbClient = isAdmin ? getAdminClient() : supabase;

  const insertData: Record<string, unknown> = {
    dimension_id: dimensionId,
    parent_id: parentId ?? null,
    slug,
    name,
    description: description ?? null,
    icon: icon ?? null,
    trainer_visible: trainerVisible ?? true,
    ai_hint: aiHint ?? null,
    metadata: metadata ?? {},
    scope: isAdmin ? "global" : "trainer",
    created_by: isAdmin ? null : user.id,
    sort_order: sortOrder ?? 0,
  };

  const { data: node, error: insertError } = await dbClient
    .from("category_nodes")
    .insert(insertData)
    .select("id")
    .single();

  if (insertError) {
    console.error("Failed to create node:", insertError);
    if (insertError.code === "23505") {
      return { success: false, error: "SLUG_EXISTS" };
    }
    if (insertError.message?.includes("depth")) {
      return { success: false, error: "MAX_DEPTH_EXCEEDED" };
    }
    return { success: false, error: "INSERT_FAILED" };
  }

  revalidatePath("/admin/taxonomy", "page");
  revalidatePath("/training/exercises", "page");
  return { success: true, data: { id: node.id } };
}

// ── Update Node ─────────────────────────────────────────────────

export async function updateNode(data: {
  id: string;
  slug?: string;
  name?: { de: string; en: string };
  description?: { de?: string; en?: string } | null;
  icon?: string | null;
  trainerVisible?: boolean;
  aiHint?: string | null;
  metadata?: Record<string, unknown>;
  sortOrder?: number;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const parsed = updateNodeSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  const { id, slug, name, description, icon, trainerVisible, aiHint, metadata, sortOrder } =
    parsed.data;

  const dbUpdates: Record<string, unknown> = {};
  if (slug !== undefined) dbUpdates.slug = slug;
  if (name !== undefined) dbUpdates.name = name;
  if (description !== undefined) dbUpdates.description = description;
  if (icon !== undefined) dbUpdates.icon = icon;
  if (trainerVisible !== undefined) dbUpdates.trainer_visible = trainerVisible;
  if (aiHint !== undefined) dbUpdates.ai_hint = aiHint;
  if (metadata !== undefined) dbUpdates.metadata = metadata;
  if (sortOrder !== undefined) dbUpdates.sort_order = sortOrder;

  if (Object.keys(dbUpdates).length === 0) {
    return { success: false, error: "NO_CHANGES" };
  }

  const isAdmin = user.app_metadata?.is_platform_admin === true;
  const roles = (user.app_metadata?.roles as string[]) ?? [];

  // Only admins and trainers can update nodes; athletes cannot
  if (!isAdmin && !roles.includes("TRAINER")) {
    return { success: false, error: "FORBIDDEN" };
  }

  const dbClient = isAdmin ? getAdminClient() : supabase;

  // If slug changed, the trigger will auto-recompute path for this node.
  // We also need to recompute paths for all descendants.
  const slugChanged = slug !== undefined;

  const { error: updateError } = await dbClient
    .from("category_nodes")
    .update(dbUpdates)
    .eq("id", id);

  if (updateError) {
    console.error("Failed to update node:", updateError);
    if (updateError.code === "23505") {
      return { success: false, error: "SLUG_EXISTS" };
    }
    return { success: false, error: "UPDATE_FAILED" };
  }

  // If slug changed, recompute paths for all descendants
  if (slugChanged) {
    await recomputeSubtreePaths(dbClient, id);
  }

  revalidatePath("/admin/taxonomy", "page");
  revalidatePath("/training/exercises", "page");
  return { success: true };
}

// ── Move Node (Re-Parenting) ────────────────────────────────────

export async function moveNode(data: {
  nodeId: string;
  newParentId: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const parsed = moveNodeSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  const { nodeId, newParentId } = parsed.data;

  // Prevent moving node under itself (circular reference check)
  if (newParentId === nodeId) {
    return { success: false, error: "CIRCULAR_REFERENCE" };
  }

  const isAdmin = user.app_metadata?.is_platform_admin === true;
  const roles = (user.app_metadata?.roles as string[]) ?? [];

  // Only admins and trainers can move nodes; athletes cannot
  if (!isAdmin && !roles.includes("TRAINER")) {
    return { success: false, error: "FORBIDDEN" };
  }

  const dbClient = isAdmin ? getAdminClient() : supabase;

  // If newParentId is set, verify it's not a descendant of nodeId
  if (newParentId) {
    const { data: currentNode } = await dbClient
      .from("category_nodes")
      .select("path")
      .eq("id", nodeId)
      .single();

    if (currentNode) {
      const { data: targetNode } = await dbClient
        .from("category_nodes")
        .select("path")
        .eq("id", newParentId)
        .single();

      if (targetNode && targetNode.path.startsWith(currentNode.path + ".")) {
        return { success: false, error: "CIRCULAR_REFERENCE" };
      }
    }
  }

  // Update parent_id (trigger will auto-recompute path + depth)
  const { error: moveError } = await dbClient
    .from("category_nodes")
    .update({ parent_id: newParentId })
    .eq("id", nodeId);

  if (moveError) {
    console.error("Failed to move node:", moveError);
    if (moveError.message?.includes("depth")) {
      return { success: false, error: "MAX_DEPTH_EXCEEDED" };
    }
    return { success: false, error: "MOVE_FAILED" };
  }

  // Recompute paths for all descendants
  await recomputeSubtreePaths(dbClient, nodeId);

  revalidatePath("/admin/taxonomy", "page");
  revalidatePath("/training/exercises", "page");
  return { success: true };
}

// ── Reorder Nodes ───────────────────────────────────────────────

export async function reorderNodes(
  nodeIds: string[]
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const parsed = reorderNodesSchema.safeParse({ nodeIds });
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  const isAdmin = user.app_metadata?.is_platform_admin === true;
  const roles = (user.app_metadata?.roles as string[]) ?? [];

  // Only admins and trainers can reorder nodes; athletes cannot
  if (!isAdmin && !roles.includes("TRAINER")) {
    return { success: false, error: "FORBIDDEN" };
  }

  const dbClient = isAdmin ? getAdminClient() : supabase;

  // Update sort_order for each node based on array position
  // NOTE (BUG-06): Each node gets an individual UPDATE via Promise.all.
  // This is acceptable because reorder operations typically involve < 20 siblings,
  // and Supabase JS client does not support multi-row UPDATE with different values.
  // The Promise.all approach runs them concurrently which is faster than sequential.
  const updates = parsed.data.nodeIds.map((id, index) =>
    dbClient
      .from("category_nodes")
      .update({ sort_order: index })
      .eq("id", id)
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);

  if (failed?.error) {
    console.error("Failed to reorder nodes:", failed.error);
    return { success: false, error: "REORDER_FAILED" };
  }

  revalidatePath("/admin/taxonomy", "page");
  return { success: true };
}

// ── Delete Node (soft-delete + descendants) ─────────────────────

export async function deleteNode(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const parsed = deleteNodeSchema.safeParse({ id });
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  const isAdmin = user.app_metadata?.is_platform_admin === true;
  const roles = (user.app_metadata?.roles as string[]) ?? [];

  // Only admins and trainers can delete nodes; athletes cannot
  if (!isAdmin && !roles.includes("TRAINER")) {
    return { success: false, error: "FORBIDDEN" };
  }

  const dbClient = isAdmin ? getAdminClient() : supabase;
  const now = new Date().toISOString();

  // Get the node's path to find all descendants
  const { data: node } = await dbClient
    .from("category_nodes")
    .select("path")
    .eq("id", id)
    .single();

  if (!node) {
    return { success: false, error: "NOT_FOUND" };
  }

  // Soft-delete the node itself
  const { error: deleteError } = await dbClient
    .from("category_nodes")
    .update({ is_deleted: true, deleted_at: now })
    .eq("id", id);

  if (deleteError) {
    console.error("Failed to soft-delete node:", deleteError);
    return { success: false, error: "DELETE_FAILED" };
  }

  // Soft-delete all descendants using path prefix
  const { error: descendantsError } = await dbClient
    .from("category_nodes")
    .update({ is_deleted: true, deleted_at: now })
    .like("path", node.path + ".%")
    .eq("is_deleted", false);

  if (descendantsError) {
    console.error("Failed to soft-delete descendant nodes:", descendantsError);
  }

  revalidatePath("/admin/taxonomy", "page");
  revalidatePath("/training/exercises", "page");
  return { success: true };
}

// ── Set Exercise Category Assignments ───────────────────────────

/**
 * Replace all category assignments for an exercise.
 * Deletes existing assignments and inserts new ones.
 */
export async function setExerciseCategoryAssignments(
  exerciseId: string,
  nodeIds: string[]
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const parsed = setExerciseCategoryAssignmentsSchema.safeParse({
    exerciseId,
    nodeIds,
  });
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  const isAdmin = user.app_metadata?.is_platform_admin === true;
  const dbClient = isAdmin ? getAdminClient() : supabase;

  // Verify the exercise exists and is not deleted before modifying assignments
  const { data: exercise, error: exerciseError } = await dbClient
    .from("exercises")
    .select("id")
    .eq("id", exerciseId)
    .eq("is_deleted", false)
    .maybeSingle();

  if (exerciseError || !exercise) {
    return { success: false, error: "NOT_FOUND" };
  }

  // Delete existing assignments
  const { error: deleteError } = await dbClient
    .from("exercise_category_assignments")
    .delete()
    .eq("exercise_id", exerciseId);

  if (deleteError) {
    console.error("Failed to delete existing assignments:", deleteError);
    return { success: false, error: "DELETE_FAILED" };
  }

  // Insert new assignments
  if (nodeIds.length > 0) {
    const assignments = nodeIds.map((nodeId) => ({
      exercise_id: exerciseId,
      node_id: nodeId,
      assigned_by: user.id,
    }));

    const { error: insertError } = await dbClient
      .from("exercise_category_assignments")
      .insert(assignments);

    if (insertError) {
      console.error("Failed to insert category assignments:", insertError);
      return { success: false, error: "INSERT_FAILED" };
    }
  }

  revalidatePath("/training/exercises", "page");
  return { success: true };
}

// ── Helper: Recompute subtree paths ─────────────────────────────

/**
 * After a node's slug or parent changes, recompute path + depth
 * for all its descendants. Uses a depth-first approach.
 *
 * @param dbClient - Supabase client (service-role or user-scoped)
 * @param parentNodeId - The node whose children need path recomputation
 * @param currentDepth - Recursion depth counter to prevent stack overflow (max 10)
 */
async function recomputeSubtreePaths(
  dbClient: ReturnType<typeof getAdminClient>,
  parentNodeId: string,
  currentDepth: number = 0
): Promise<void> {
  // Guard against unbounded recursion (max tree depth is 10)
  if (currentDepth >= 10) {
    console.warn("recomputeSubtreePaths: max depth (10) reached, stopping recursion");
    return;
  }

  // Get the updated parent node
  const { data: parentNode } = await dbClient
    .from("category_nodes")
    .select("id, path, depth")
    .eq("id", parentNodeId)
    .single();

  if (!parentNode) return;

  // Get all direct children
  const { data: children } = await dbClient
    .from("category_nodes")
    .select("id, slug")
    .eq("parent_id", parentNodeId)
    .eq("is_deleted", false);

  if (!children || children.length === 0) return;

  // Update each child's path and depth, then recurse
  for (const child of children) {
    const newPath = parentNode.path + "." + child.slug;
    const newDepth = parentNode.depth + 1;

    await dbClient
      .from("category_nodes")
      .update({ path: newPath, depth: newDepth })
      .eq("id", child.id);

    // Recurse for grandchildren
    await recomputeSubtreePaths(dbClient, child.id, currentDepth + 1);
  }
}
