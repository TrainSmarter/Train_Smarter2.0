import { describe, it, expect } from "vitest";
import { CATEGORY_LABELS } from "./constants";
import { EXERCISE_TYPES, type ExerciseType } from "./types";

describe("CATEGORY_LABELS", () => {
  it("has an entry for every ExerciseType value", () => {
    for (const type of EXERCISE_TYPES) {
      expect(CATEGORY_LABELS).toHaveProperty(type);
    }
  });

  it("has exactly the same keys as EXERCISE_TYPES", () => {
    const labelKeys = Object.keys(CATEGORY_LABELS).sort();
    const typeValues = [...EXERCISE_TYPES].sort();
    expect(labelKeys).toEqual(typeValues);
  });

  it("every value is a non-empty string (i18n key)", () => {
    for (const type of EXERCISE_TYPES) {
      const value = CATEGORY_LABELS[type as ExerciseType];
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate values", () => {
    const values = Object.values(CATEGORY_LABELS);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it("contains expected exercise types: strength, endurance, speed, flexibility", () => {
    expect(CATEGORY_LABELS.strength).toBeDefined();
    expect(CATEGORY_LABELS.endurance).toBeDefined();
    expect(CATEGORY_LABELS.speed).toBeDefined();
    expect(CATEGORY_LABELS.flexibility).toBeDefined();
  });
});
