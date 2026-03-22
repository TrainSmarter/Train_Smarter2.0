// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  DIMENSION_SLUGS,
  MAX_TREE_DEPTH,
  TRAINER_VISIBLE_DEPTH_FALLBACK,
} from "./constants";

/**
 * Unit tests for PROJ-20 taxonomy constants.
 */

describe("DIMENSION_SLUGS", () => {
  it("has exactly 9 dimension slugs", () => {
    const keys = Object.keys(DIMENSION_SLUGS);
    expect(keys).toHaveLength(9);
  });

  it("all values are non-empty strings", () => {
    for (const value of Object.values(DIMENSION_SLUGS)) {
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it("all keys match expected dimension names", () => {
    const expectedKeys = [
      "MUSCLE_GROUP",
      "EQUIPMENT",
      "JOINT",
      "LATERALITY",
      "MOVEMENT_PLANE",
      "MOVEMENT_PATTERN",
      "ENDURANCE_TYPE",
      "SPEED_TYPE",
      "FLEXIBILITY_TYPE",
    ];
    expect(Object.keys(DIMENSION_SLUGS).sort()).toEqual(expectedKeys.sort());
  });

  it("has both cross-cutting and type-specific categories", () => {
    // Cross-cutting (no exercise type prefix)
    expect(DIMENSION_SLUGS.MUSCLE_GROUP).toBe("muscle_group");
    expect(DIMENSION_SLUGS.EQUIPMENT).toBe("equipment");
    expect(DIMENSION_SLUGS.JOINT).toBe("joint");
    expect(DIMENSION_SLUGS.LATERALITY).toBe("laterality");
    expect(DIMENSION_SLUGS.MOVEMENT_PLANE).toBe("movement_plane");

    // Type-specific
    expect(DIMENSION_SLUGS.MOVEMENT_PATTERN).toBe("movement_pattern");
    expect(DIMENSION_SLUGS.ENDURANCE_TYPE).toBe("endurance_type");
    expect(DIMENSION_SLUGS.SPEED_TYPE).toBe("speed_type");
    expect(DIMENSION_SLUGS.FLEXIBILITY_TYPE).toBe("flexibility_type");
  });
});

describe("MAX_TREE_DEPTH", () => {
  it("equals 10", () => {
    expect(MAX_TREE_DEPTH).toBe(10);
  });
});

describe("TRAINER_VISIBLE_DEPTH_FALLBACK", () => {
  it("equals 2", () => {
    expect(TRAINER_VISIBLE_DEPTH_FALLBACK).toBe(2);
  });
});
