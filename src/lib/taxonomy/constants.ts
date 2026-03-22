/**
 * Shared constants for the taxonomy system -- PROJ-20
 */

// ── Dimension Slugs ─────────────────────────────────────────────

/** Cross-cutting dimensions (exercise_type = NULL) */
export const DIMENSION_SLUGS = {
  MUSCLE_GROUP: "muscle_group",
  EQUIPMENT: "equipment",
  JOINT: "joint",
  LATERALITY: "laterality",
  MOVEMENT_PLANE: "movement_plane",
  /** Strength-only */
  MOVEMENT_PATTERN: "movement_pattern",
  /** Endurance-only */
  ENDURANCE_TYPE: "endurance_type",
  /** Speed-only */
  SPEED_TYPE: "speed_type",
  /** Flexibility-only */
  FLEXIBILITY_TYPE: "flexibility_type",
} as const;

export type DimensionSlug = (typeof DIMENSION_SLUGS)[keyof typeof DIMENSION_SLUGS];

// ── Tree Constraints ────────────────────────────────────────────

/** Maximum allowed depth for category nodes (0-indexed) */
export const MAX_TREE_DEPTH = 10;

/** Default depth threshold for trainer visibility fallback */
export const TRAINER_VISIBLE_DEPTH_FALLBACK = 2;
