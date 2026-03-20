import { describe, it, expect } from "vitest";
import {
  createExerciseSchema,
  updateExerciseSchema,
  cloneExerciseSchema,
  createTaxonomySchema,
  updateTaxonomySchema,
  deleteExerciseSchema,
  deleteTaxonomySchema,
  EXERCISE_TYPES,
  TAXONOMY_TYPES,
} from "./types";

/**
 * Unit tests for PROJ-12 Exercise Library Zod schemas and type constants.
 */

// ════════════════════════════════════════════════════════════════
// 1. Constants
// ════════════════════════════════════════════════════════════════

describe("EXERCISE_TYPES constant", () => {
  it("has exactly 4 types", () => {
    expect(EXERCISE_TYPES).toHaveLength(4);
  });

  it("contains strength, endurance, speed, flexibility", () => {
    expect(EXERCISE_TYPES).toContain("strength");
    expect(EXERCISE_TYPES).toContain("endurance");
    expect(EXERCISE_TYPES).toContain("speed");
    expect(EXERCISE_TYPES).toContain("flexibility");
  });
});

describe("TAXONOMY_TYPES constant", () => {
  it("has exactly 2 types", () => {
    expect(TAXONOMY_TYPES).toHaveLength(2);
  });

  it("contains muscle_group and equipment", () => {
    expect(TAXONOMY_TYPES).toContain("muscle_group");
    expect(TAXONOMY_TYPES).toContain("equipment");
  });
});

// ════════════════════════════════════════════════════════════════
// 2. createExerciseSchema
// ════════════════════════════════════════════════════════════════

describe("createExerciseSchema", () => {
  const validInput = {
    name: { de: "Bankdruecken", en: "Bench Press" },
    exerciseType: "strength" as const,
  };

  it("accepts valid minimal input (name + type only)", () => {
    const result = createExerciseSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts valid full input with all fields", () => {
    const result = createExerciseSchema.safeParse({
      ...validInput,
      description: { de: "Brustpresse", en: "Chest press movement" },
      primaryMuscleGroupIds: ["550e8400-e29b-41d4-a716-446655440000"],
      secondaryMuscleGroupIds: ["550e8400-e29b-41d4-a716-446655440001"],
      equipmentIds: ["550e8400-e29b-41d4-a716-446655440002"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name DE", () => {
    const result = createExerciseSchema.safeParse({
      ...validInput,
      name: { de: "", en: "Bench Press" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name EN", () => {
    const result = createExerciseSchema.safeParse({
      ...validInput,
      name: { de: "Bankdruecken", en: "" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 100 chars", () => {
    const result = createExerciseSchema.safeParse({
      ...validInput,
      name: { de: "A".repeat(101), en: "Bench Press" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid exercise type", () => {
    const result = createExerciseSchema.safeParse({
      ...validInput,
      exerciseType: "yoga",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-UUID in muscle group IDs", () => {
    const result = createExerciseSchema.safeParse({
      ...validInput,
      primaryMuscleGroupIds: ["not-a-uuid"],
    });
    expect(result.success).toBe(false);
  });

  it("defaults arrays to empty when not provided", () => {
    const result = createExerciseSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.primaryMuscleGroupIds).toEqual([]);
      expect(result.data.secondaryMuscleGroupIds).toEqual([]);
      expect(result.data.equipmentIds).toEqual([]);
    }
  });

  it("accepts description with max 2000 chars", () => {
    const result = createExerciseSchema.safeParse({
      ...validInput,
      description: { de: "A".repeat(2000), en: "B".repeat(2000) },
    });
    expect(result.success).toBe(true);
  });

  it("rejects description longer than 2000 chars", () => {
    const result = createExerciseSchema.safeParse({
      ...validInput,
      description: { de: "A".repeat(2001), en: "Ok" },
    });
    expect(result.success).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// 3. updateExerciseSchema
// ════════════════════════════════════════════════════════════════

describe("updateExerciseSchema", () => {
  const validId = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts valid update with only ID (no fields changed)", () => {
    const result = updateExerciseSchema.safeParse({ id: validId });
    expect(result.success).toBe(true);
  });

  it("accepts partial updates (only name)", () => {
    const result = updateExerciseSchema.safeParse({
      id: validId,
      name: { de: "Neuer Name", en: "New Name" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID id", () => {
    const result = updateExerciseSchema.safeParse({ id: "invalid" });
    expect(result.success).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// 4. cloneExerciseSchema
// ════════════════════════════════════════════════════════════════

describe("cloneExerciseSchema", () => {
  it("accepts valid UUID", () => {
    const result = cloneExerciseSchema.safeParse({
      exerciseId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID", () => {
    const result = cloneExerciseSchema.safeParse({
      exerciseId: "not-valid",
    });
    expect(result.success).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// 5. createTaxonomySchema
// ════════════════════════════════════════════════════════════════

describe("createTaxonomySchema", () => {
  it("accepts valid muscle_group input", () => {
    const result = createTaxonomySchema.safeParse({
      name: { de: "Trapez", en: "Traps" },
      type: "muscle_group",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid equipment input", () => {
    const result = createTaxonomySchema.safeParse({
      name: { de: "Resistance Band", en: "Resistance Band" },
      type: "equipment",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid taxonomy type", () => {
    const result = createTaxonomySchema.safeParse({
      name: { de: "Test", en: "Test" },
      type: "movement_pattern",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = createTaxonomySchema.safeParse({
      name: { de: "", en: "Something" },
      type: "muscle_group",
    });
    expect(result.success).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// 6. Delete schemas
// ════════════════════════════════════════════════════════════════

describe("deleteExerciseSchema", () => {
  it("accepts valid UUID", () => {
    const result = deleteExerciseSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID", () => {
    const result = deleteTaxonomySchema.safeParse({ id: "abc" });
    expect(result.success).toBe(false);
  });
});

describe("updateTaxonomySchema", () => {
  it("accepts valid update", () => {
    const result = updateTaxonomySchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: { de: "Updated", en: "Updated" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects name exceeding 100 chars", () => {
    const result = updateTaxonomySchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: { de: "A".repeat(101), en: "Ok" },
    });
    expect(result.success).toBe(false);
  });
});
