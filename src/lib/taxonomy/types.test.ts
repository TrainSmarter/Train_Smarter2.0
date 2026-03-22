// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  createDimensionSchema,
  updateDimensionSchema,
  createNodeSchema,
  updateNodeSchema,
  moveNodeSchema,
  reorderNodesSchema,
  setExerciseCategoryAssignmentsSchema,
} from "./types";

/**
 * Unit tests for PROJ-20 Taxonomy Zod schemas.
 */

const validUuid = "550e8400-e29b-41d4-a716-446655440000";
const validUuid2 = "550e8400-e29b-41d4-a716-446655440001";

// ════════════════════════════════════════════════════════════════
// 1. createDimensionSchema
// ════════════════════════════════════════════════════════════════

describe("createDimensionSchema", () => {
  const validInput = {
    slug: "muscle-group",
    name: { de: "Muskelgruppe", en: "Muscle Group" },
    exerciseType: "strength" as const,
  };

  it("accepts valid input with bilingual name, slug, and exercise_type", () => {
    const result = createDimensionSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts input without exercise_type (cross-cutting dimension)", () => {
    const { exerciseType: _, ...input } = validInput;
    const result = createDimensionSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("accepts null exercise_type (cross-cutting dimension)", () => {
    const result = createDimensionSchema.safeParse({
      ...validInput,
      exerciseType: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty slug", () => {
    const result = createDimensionSchema.safeParse({
      ...validInput,
      slug: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects slug starting with a digit", () => {
    const result = createDimensionSchema.safeParse({
      ...validInput,
      slug: "1invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name.de", () => {
    const result = createDimensionSchema.safeParse({
      ...validInput,
      name: { de: "", en: "Muscle Group" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name.en", () => {
    const result = createDimensionSchema.safeParse({
      ...validInput,
      name: { de: "Muskelgruppe", en: "" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid exercise_type value", () => {
    const result = createDimensionSchema.safeParse({
      ...validInput,
      exerciseType: "yoga",
    });
    expect(result.success).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// 2. updateDimensionSchema
// ════════════════════════════════════════════════════════════════

describe("updateDimensionSchema", () => {
  it("accepts valid partial update", () => {
    const result = updateDimensionSchema.safeParse({
      id: validUuid,
      name: { de: "Neuer Name", en: "New Name" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts update with only id (no fields changed)", () => {
    const result = updateDimensionSchema.safeParse({ id: validUuid });
    expect(result.success).toBe(true);
  });

  it("requires id as UUID", () => {
    const result = updateDimensionSchema.safeParse({
      id: validUuid,
      slug: "new-slug",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID id", () => {
    const result = updateDimensionSchema.safeParse({ id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// 3. createNodeSchema
// ════════════════════════════════════════════════════════════════

describe("createNodeSchema", () => {
  const validNodeInput = {
    dimensionId: validUuid,
    slug: "upper-body",
    name: { de: "Oberkörper", en: "Upper Body" },
  };

  it("accepts valid input with dimensionId, name, and slug", () => {
    const result = createNodeSchema.safeParse(validNodeInput);
    expect(result.success).toBe(true);
  });

  it("accepts optional fields (description, icon, aiHint, parentId)", () => {
    const result = createNodeSchema.safeParse({
      ...validNodeInput,
      parentId: validUuid2,
      description: { de: "Beschreibung", en: "Description" },
      icon: "bicep",
      aiHint: "Used for upper body strength exercises",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing dimensionId", () => {
    const { dimensionId: _, ...input } = validNodeInput;
    const result = createNodeSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects empty name.de", () => {
    const result = createNodeSchema.safeParse({
      ...validNodeInput,
      name: { de: "", en: "Upper Body" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty slug", () => {
    const result = createNodeSchema.safeParse({
      ...validNodeInput,
      slug: "",
    });
    expect(result.success).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// 4. updateNodeSchema
// ════════════════════════════════════════════════════════════════

describe("updateNodeSchema", () => {
  it("accepts valid partial update with id", () => {
    const result = updateNodeSchema.safeParse({
      id: validUuid,
      name: { de: "Neuer Name", en: "New Name" },
    });
    expect(result.success).toBe(true);
  });

  it("requires id", () => {
    const result = updateNodeSchema.safeParse({
      name: { de: "Test", en: "Test" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-UUID id", () => {
    const result = updateNodeSchema.safeParse({ id: "invalid" });
    expect(result.success).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// 5. moveNodeSchema
// ════════════════════════════════════════════════════════════════

describe("moveNodeSchema", () => {
  it("accepts valid nodeId + newParentId", () => {
    const result = moveNodeSchema.safeParse({
      nodeId: validUuid,
      newParentId: validUuid2,
    });
    expect(result.success).toBe(true);
  });

  it("accepts null newParentId (move to root)", () => {
    const result = moveNodeSchema.safeParse({
      nodeId: validUuid,
      newParentId: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID nodeId", () => {
    const result = moveNodeSchema.safeParse({
      nodeId: "not-uuid",
      newParentId: null,
    });
    expect(result.success).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// 6. reorderNodesSchema
// ════════════════════════════════════════════════════════════════

describe("reorderNodesSchema", () => {
  it("accepts array of UUID strings", () => {
    const result = reorderNodesSchema.safeParse({
      nodeIds: [validUuid, validUuid2],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty array", () => {
    const result = reorderNodesSchema.safeParse({ nodeIds: [] });
    expect(result.success).toBe(false);
  });

  it("rejects non-UUID strings in array", () => {
    const result = reorderNodesSchema.safeParse({
      nodeIds: ["not-a-uuid"],
    });
    expect(result.success).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// 7. setExerciseCategoryAssignmentsSchema
// ════════════════════════════════════════════════════════════════

describe("setExerciseCategoryAssignmentsSchema", () => {
  it("accepts exerciseId + nodeIds array", () => {
    const result = setExerciseCategoryAssignmentsSchema.safeParse({
      exerciseId: validUuid,
      nodeIds: [validUuid2],
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty nodeIds array (clear all assignments)", () => {
    const result = setExerciseCategoryAssignmentsSchema.safeParse({
      exerciseId: validUuid,
      nodeIds: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID exerciseId", () => {
    const result = setExerciseCategoryAssignmentsSchema.safeParse({
      exerciseId: "invalid",
      nodeIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-UUID in nodeIds array", () => {
    const result = setExerciseCategoryAssignmentsSchema.safeParse({
      exerciseId: validUuid,
      nodeIds: ["not-a-uuid"],
    });
    expect(result.success).toBe(false);
  });
});
