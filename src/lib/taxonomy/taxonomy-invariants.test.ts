// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * PROJ-20 Taxonomy System — Source Code Invariant Tests
 *
 * These tests verify structural properties of the codebase to prevent
 * regressions during refactoring. They check:
 * - Actions: auth, validation, admin-check, soft-delete, revalidation, circular ref
 * - Queries: is_deleted filtering, exercise type filtering
 * - AI Integration: taxonomy data import, V2 schema, backward compat
 * - AI Prompts: buildTaxonomyTreeString, English scope labels, aiHint
 * - PROJ-18 Security: trainer role check in feedback actions
 */

function readSrc(relativePath: string): string {
  return fs.readFileSync(
    path.resolve(__dirname, "../..", relativePath),
    "utf-8"
  );
}

// ══════════════════════════════════════════════════════════════════
// 1. Server Actions Invariants (taxonomy/actions.ts)
// ══════════════════════════════════════════════════════════════════

describe("PROJ-20 Server Actions invariants", () => {
  let actions: string;

  beforeEach(() => {
    actions = readSrc("lib/taxonomy/actions.ts");
  });

  it('should be marked as "use server"', () => {
    expect(actions).toMatch(/^"use server"/);
  });

  describe("every exported action calls auth.getUser()", () => {
    const actionNames = [
      "createDimension",
      "updateDimension",
      "deleteDimension",
      "createNode",
      "updateNode",
      "deleteNode",
      "moveNode",
      "reorderNodes",
      "setExerciseCategoryAssignments",
    ];

    it("should export all 9 actions as async functions", () => {
      for (const name of actionNames) {
        expect(actions).toContain(`export async function ${name}`);
      }
    });

    it("should call supabase.auth.getUser() in every action", () => {
      const getUserCalls = actions.match(/auth\.getUser\(\)/g) ?? [];
      expect(getUserCalls.length).toBeGreaterThanOrEqual(9);
    });

    it('should return UNAUTHORIZED error when auth fails', () => {
      const unauthorizedReturns = actions.match(/error: "UNAUTHORIZED"/g) ?? [];
      expect(unauthorizedReturns.length).toBeGreaterThanOrEqual(9);
    });
  });

  describe("Zod validation on every mutation", () => {
    it("should use safeParse for input validation", () => {
      const safeParses = actions.match(/\.safeParse\(/g) ?? [];
      expect(safeParses.length).toBeGreaterThanOrEqual(9);
    });

    it('should return INVALID_INPUT on validation failure', () => {
      const invalidInputs = actions.match(/error: "INVALID_INPUT"/g) ?? [];
      expect(invalidInputs.length).toBeGreaterThanOrEqual(9);
    });

    it("should import all Zod schemas from types", () => {
      expect(actions).toContain("createDimensionSchema");
      expect(actions).toContain("updateDimensionSchema");
      expect(actions).toContain("deleteDimensionSchema");
      expect(actions).toContain("createNodeSchema");
      expect(actions).toContain("updateNodeSchema");
      expect(actions).toContain("moveNodeSchema");
      expect(actions).toContain("deleteNodeSchema");
      expect(actions).toContain("reorderNodesSchema");
      expect(actions).toContain("setExerciseCategoryAssignmentsSchema");
    });
  });

  describe("createDimension, updateDimension, deleteDimension check is_platform_admin", () => {
    it("should check is_platform_admin for dimension CRUD", () => {
      // These 3 dimension actions are admin-only
      expect(actions).toContain("is_platform_admin");
      const adminChecks = actions.match(/is_platform_admin/g) ?? [];
      // At least 3 checks (one per dimension action) + potentially more in node actions
      expect(adminChecks.length).toBeGreaterThanOrEqual(3);
    });

    it('should return FORBIDDEN when admin check fails', () => {
      const forbiddenReturns = actions.match(/error: "FORBIDDEN"/g) ?? [];
      // 3 dimension actions + 4 node actions (createNode, updateNode, deleteNode, moveNode, reorderNodes)
      expect(forbiddenReturns.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("node actions check TRAINER role for non-admin paths", () => {
    it('should check roles.includes("TRAINER") for node operations', () => {
      const trainerChecks = actions.match(/roles\.includes\("TRAINER"\)/g) ?? [];
      // createNode, updateNode, deleteNode, moveNode, reorderNodes
      expect(trainerChecks.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("setExerciseCategoryAssignments checks exercise exists", () => {
    it("should verify exercise exists and is not deleted before modifying assignments", () => {
      // The action queries exercises table to verify the exercise exists
      expect(actions).toContain('.from("exercises")');
      expect(actions).toContain('.eq("is_deleted", false)');
    });
  });

  describe("every exported action calls revalidatePath", () => {
    it("should call revalidatePath after mutations", () => {
      const revalidateCalls = actions.match(/revalidatePath\(/g) ?? [];
      // At least one revalidatePath per action (most have 2 — admin + exercises page)
      expect(revalidateCalls.length).toBeGreaterThanOrEqual(9);
    });
  });

  describe("soft-delete pattern", () => {
    it("should use is_deleted: true for node deletion", () => {
      expect(actions).toContain("is_deleted: true");
    });

    it("should set deleted_at timestamp on deletion", () => {
      expect(actions).toContain("deleted_at:");
      expect(actions).toContain("new Date().toISOString()");
    });

    it("deleteNode uses soft-delete pattern (is_deleted, deleted_at)", () => {
      // deleteNode should update is_deleted + deleted_at, not use .delete()
      expect(actions).toContain("is_deleted: true, deleted_at: now");
    });

    it("deleteDimension soft-deletes all nodes in dimension", () => {
      // Should update nodes in the dimension to is_deleted=true
      expect(actions).toContain('.from("category_nodes")');
      expect(actions).toContain('.eq("dimension_id", id)');
    });
  });

  describe("moveNode checks circular reference", () => {
    it("should prevent moving node under itself", () => {
      expect(actions).toContain("CIRCULAR_REFERENCE");
    });

    it("should check if newParentId equals nodeId", () => {
      expect(actions).toContain("newParentId === nodeId");
    });

    it("should check if target is a descendant using path", () => {
      expect(actions).toContain("targetNode.path.startsWith(currentNode.path");
    });
  });

  describe("recomputeSubtreePaths has depth guard", () => {
    it("should have a depth guard at 10", () => {
      expect(actions).toContain("currentDepth >= 10");
    });

    it("should warn when max depth is reached", () => {
      expect(actions).toContain("max depth (10) reached");
    });
  });
});

// ══════════════════════════════════════════════════════════════════
// 2. Queries Invariants (taxonomy/queries.ts)
// ══════════════════════════════════════════════════════════════════

describe("PROJ-20 Queries invariants", () => {
  let queries: string;

  beforeEach(() => {
    queries = readSrc("lib/taxonomy/queries.ts");
  });

  it("all SELECT queries filter is_deleted = false", () => {
    // Count occurrences of is_deleted filtering
    const isDeletedFilters = queries.match(/\.eq\("is_deleted", false\)/g) ?? [];
    // getDimensions, getDimensionsForExerciseType, getNodesByDimension,
    // getAllTaxonomyData (dimensions + nodes = 2)
    expect(isDeletedFilters.length).toBeGreaterThanOrEqual(4);
  });

  it("getDimensionsForExerciseType filters by exercise_type", () => {
    expect(queries).toContain("exercise_type.is.null");
    expect(queries).toContain("exercise_type.eq.");
  });

  it("getAllTaxonomyData fetches both dimensions and nodes", () => {
    expect(queries).toContain("getAllTaxonomyData");
    expect(queries).toContain('"category_dimensions"');
    expect(queries).toContain('"category_nodes"');
  });

  it("getAllTaxonomyData uses parallel fetch with Promise.all", () => {
    expect(queries).toContain("Promise.all");
  });

  it("all query functions return empty array on error", () => {
    // Pattern: if (error) { ... return []; }
    const emptyReturns = queries.match(/return \[\]/g) ?? [];
    expect(emptyReturns.length).toBeGreaterThanOrEqual(3);
  });
});

// ══════════════════════════════════════════════════════════════════
// 3. AI Integration Invariants (ai/suggest-exercise.ts)
// ══════════════════════════════════════════════════════════════════

describe("PROJ-20 AI Integration invariants", () => {
  let suggestExercise: string;

  beforeEach(() => {
    suggestExercise = readSrc("lib/ai/suggest-exercise.ts");
  });

  it("imports getAllTaxonomyData from taxonomy/queries", () => {
    expect(suggestExercise).toContain("getAllTaxonomyData");
    expect(suggestExercise).toContain("taxonomy/queries");
  });

  it("has TOOL_SCHEMA_V2 with category_assignments", () => {
    expect(suggestExercise).toContain("TOOL_SCHEMA_V2");
    expect(suggestExercise).toContain("category_assignments");
  });

  it("has validateCategoryAssignments function", () => {
    expect(suggestExercise).toContain("function validateCategoryAssignments");
  });

  it("has extractLegacyFromAssignments for backward compat", () => {
    expect(suggestExercise).toContain("function extractLegacyFromAssignments");
    expect(suggestExercise).toContain("DIMENSION_SLUGS.MUSCLE_GROUP");
    expect(suggestExercise).toContain("DIMENSION_SLUGS.EQUIPMENT");
  });

  it("fetches taxonomy data in parallel with legacy taxonomy", () => {
    expect(suggestExercise).toContain("getAllTaxonomyData()");
    // Should be in a Promise.all or parallel destructuring
    expect(suggestExercise).toContain("Promise.all");
  });

  it("uses V2 schema when taxonomy data is available", () => {
    expect(suggestExercise).toContain("useV2");
    expect(suggestExercise).toContain("taxonomyData.length > 0");
  });

  it("imports DIMENSION_SLUGS from taxonomy/constants", () => {
    expect(suggestExercise).toContain("DIMENSION_SLUGS");
    expect(suggestExercise).toContain("taxonomy/constants");
  });
});

// ══════════════════════════════════════════════════════════════════
// 4. AI Prompts Invariants (ai/prompts.ts)
// ══════════════════════════════════════════════════════════════════

describe("PROJ-20 AI Prompts invariants", () => {
  let prompts: string;

  beforeEach(() => {
    prompts = readSrc("lib/ai/prompts.ts");
  });

  it("buildTaxonomyTreeString function exists", () => {
    expect(prompts).toContain("function buildTaxonomyTreeString");
  });

  it("uses English scope labels (not German)", () => {
    // Should use "all exercise types" and "only for" in English
    expect(prompts).toContain("all exercise types");
    expect(prompts).toContain("only for");
  });

  it("includes aiHint in output", () => {
    expect(prompts).toContain("aiHint");
    expect(prompts).toContain("node.aiHint");
  });

  it("getSuggestAllPromptV2 is exported", () => {
    expect(prompts).toContain("export async function getSuggestAllPromptV2");
  });

  it("uses {{taxonomy_tree}} template variable", () => {
    expect(prompts).toContain("{{taxonomy_tree}}");
  });

  it("imports DimensionWithNodes from taxonomy types", () => {
    expect(prompts).toContain("DimensionWithNodes");
    expect(prompts).toContain("taxonomy/types");
  });
});

// ══════════════════════════════════════════════════════════════════
// 5. AI Prompt Defaults (ai/prompt-defaults.ts)
// ══════════════════════════════════════════════════════════════════

describe("PROJ-20 AI Prompt Defaults invariants", () => {
  let defaults: string;

  beforeEach(() => {
    defaults = readSrc("lib/ai/prompt-defaults.ts");
  });

  it("exports DEFAULT_PROMPT_SUGGEST_ALL_V2 template", () => {
    expect(defaults).toContain("DEFAULT_PROMPT_SUGGEST_ALL_V2");
  });

  it("V2 template contains {{taxonomy_tree}} placeholder", () => {
    expect(defaults).toContain("{{taxonomy_tree}}");
  });

  it("V2 template contains {{legacy_taxonomy}} placeholder", () => {
    expect(defaults).toContain("{{legacy_taxonomy}}");
  });

  it("V2 template instructs to pick most specific (deepest) nodes", () => {
    expect(defaults).toContain("MOST SPECIFIC");
  });

  it("V2 template instructs to use dimension slugs as keys", () => {
    expect(defaults).toContain("dimension slugs");
  });
});

// ══════════════════════════════════════════════════════════════════
// 6. PROJ-18 Security Fix (feedback/actions.ts)
// ══════════════════════════════════════════════════════════════════

describe("PROJ-18 Security: feedback actions", () => {
  let feedbackActions: string;

  beforeEach(() => {
    feedbackActions = readSrc("lib/feedback/actions.ts");
  });

  it("updateTrainerDefault checks TRAINER role", () => {
    expect(feedbackActions).toContain("updateTrainerDefault");
    expect(feedbackActions).toContain('roles.includes("TRAINER")');
  });

  it('file contains roles.includes("TRAINER") check', () => {
    const checks = feedbackActions.match(/roles\.includes\("TRAINER"\)/g) ?? [];
    expect(checks.length).toBeGreaterThanOrEqual(1);
  });
});
