/**
 * Shared constants for the exercise library — PROJ-12
 */

import type { ExerciseType } from "./types";

/**
 * Maps ExerciseType values to their i18n translation keys
 * within the "exercises" namespace.
 *
 * Usage: t(CATEGORY_LABELS[exercise.exerciseType])
 */
export const CATEGORY_LABELS: Record<ExerciseType, string> = {
  strength: "strength",
  endurance: "endurance",
  speed: "speed",
  flexibility: "flexibility",
};
