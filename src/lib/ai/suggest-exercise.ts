/**
 * AI Exercise Suggestion — PROJ-12 + PROJ-20
 *
 * Given an exercise name, uses AI to suggest complete details:
 * - Translation of the name
 * - Descriptions in DE + EN
 * - Exercise type
 * - PROJ-20: Hierarchical category assignments across multiple dimensions
 * - Legacy: Primary/secondary muscle groups + equipment (backward compat)
 *
 * Supports Anthropic (Tool Use) and OpenAI (Structured Output).
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { env } from "@/lib/env";
import { getTaxonomy } from "@/lib/exercises/queries";
import { getAllTaxonomyData } from "@/lib/taxonomy/queries";
import { getModelById, isProviderAvailable } from "./providers";
import { getSuggestAllPrompt, getSuggestAllPromptV2 } from "./prompts";
import type { AiExerciseSuggestion } from "./providers";
import type { TaxonomyEntry, ExerciseType } from "@/lib/exercises/types";
import type { DimensionWithNodes } from "@/lib/taxonomy/types";
import { DIMENSION_SLUGS } from "@/lib/taxonomy/constants";

// Re-export for convenience
export type { AiExerciseSuggestion };

// ── Constants ────────────────────────────────────────────────────

const API_TIMEOUT_MS = 15_000;
const EXTENDED_THINKING_TIMEOUT_MS = 60_000; // Opus + thinking needs more time
const MAX_INPUT_LENGTH = 200;

const EXERCISE_TYPES_LIST = ["strength", "endurance", "speed", "flexibility"];

// ── Input Sanitization ──────────────────────────────────────────

/** Strip control characters and limit length to prevent prompt injection. */
function sanitizeForPrompt(input: string): string {
  return input
    .replace(/[\x00-\x1F\x7F]/g, "") // strip ALL control chars incl. \n, \r, \t
    .slice(0, MAX_INPUT_LENGTH)
    .trim();
}

// ── Tool / Function Schema (V2 — with categoryAssignments) ──────

const TOOL_SCHEMA_V2 = {
  name: "suggest_exercise_details",
  description:
    "Suggest complete details for an exercise based on its name. Categorize it across multiple taxonomy dimensions using node UUIDs from the provided taxonomy tree.",
  input_schema: {
    type: "object" as const,
    properties: {
      name_translation: {
        type: "string" as const,
        description:
          "The exercise name translated to the other language (if input is German, translate to English and vice versa)",
      },
      description_de: {
        type: "string" as const,
        description:
          "2-4 sentences in German describing proper execution form",
      },
      description_en: {
        type: "string" as const,
        description:
          "2-4 sentences in English describing proper execution form",
      },
      exercise_type: {
        type: "string" as const,
        enum: EXERCISE_TYPES_LIST,
        description: "The type of exercise",
      },
      category_assignments: {
        type: "object" as const,
        description:
          "Category assignments per dimension. Keys are dimension slugs (e.g. 'muscle_group', 'equipment'), values are arrays of node UUIDs from the provided taxonomy tree. Pick the most specific (deepest/leaf) applicable nodes.",
        additionalProperties: {
          type: "array" as const,
          items: { type: "string" as const },
        },
      },
      primary_muscle_group_ids: {
        type: "array" as const,
        items: { type: "string" as const },
        description:
          "LEGACY: UUIDs of primary muscle groups. May be left empty if category_assignments includes muscle_group.",
      },
      secondary_muscle_group_ids: {
        type: "array" as const,
        items: { type: "string" as const },
        description:
          "LEGACY: UUIDs of secondary muscle groups. May be left empty if category_assignments includes muscle_group.",
      },
      equipment_ids: {
        type: "array" as const,
        items: { type: "string" as const },
        description:
          "LEGACY: UUIDs of equipment. May be left empty if category_assignments includes equipment.",
      },
    },
    required: [
      "name_translation",
      "description_de",
      "description_en",
      "exercise_type",
      "category_assignments",
    ],
  },
};

// Legacy tool schema (fallback when no hierarchical taxonomy is available)
const TOOL_SCHEMA_LEGACY = {
  name: "suggest_exercise_details",
  description:
    "Suggest complete details for an exercise based on its name. You MUST select muscle group and equipment IDs only from the provided lists.",
  input_schema: {
    type: "object" as const,
    properties: {
      name_translation: {
        type: "string" as const,
        description:
          "The exercise name translated to the other language (if input is German, translate to English and vice versa)",
      },
      description_de: {
        type: "string" as const,
        description:
          "2-4 sentences in German describing proper execution form",
      },
      description_en: {
        type: "string" as const,
        description:
          "2-4 sentences in English describing proper execution form",
      },
      exercise_type: {
        type: "string" as const,
        enum: EXERCISE_TYPES_LIST,
        description: "The type of exercise",
      },
      primary_muscle_group_ids: {
        type: "array" as const,
        items: { type: "string" as const },
        description:
          "UUIDs of primary muscle groups targeted. MUST be from the provided list.",
      },
      secondary_muscle_group_ids: {
        type: "array" as const,
        items: { type: "string" as const },
        description:
          "UUIDs of secondary/assisting muscle groups. MUST be from the provided list.",
      },
      equipment_ids: {
        type: "array" as const,
        items: { type: "string" as const },
        description:
          "UUIDs of required equipment. MUST be from the provided list.",
      },
    },
    required: [
      "name_translation",
      "description_de",
      "description_en",
      "exercise_type",
      "primary_muscle_group_ids",
      "secondary_muscle_group_ids",
      "equipment_ids",
    ],
  },
};

// OpenAI function definitions
const OPENAI_FUNCTION_V2 = {
  name: TOOL_SCHEMA_V2.name,
  description: TOOL_SCHEMA_V2.description,
  parameters: TOOL_SCHEMA_V2.input_schema,
};

const OPENAI_FUNCTION_LEGACY = {
  name: TOOL_SCHEMA_LEGACY.name,
  description: TOOL_SCHEMA_LEGACY.description,
  parameters: TOOL_SCHEMA_LEGACY.input_schema,
};

// ── Prompt Builder ───────────────────────────────────────────────

function buildUserPrompt(exerciseName: string, locale: "de" | "en"): string {
  const inputLang = locale === "de" ? "German" : "English";
  const outputLang = locale === "de" ? "English" : "German";
  const sanitizedName = sanitizeForPrompt(exerciseName);

  return `Exercise name (${inputLang}): <user_input>${sanitizedName}</user_input>

Please suggest the complete details for this exercise. The name_translation should be the ${outputLang} translation of this exercise name.`;
}

// ── Anthropic Call ────────────────────────────────────────────────

async function callAnthropic(
  systemPrompt: string,
  userPrompt: string,
  modelId: string,
  useThinking: boolean,
  useV2Schema: boolean
): Promise<AiExerciseSuggestion> {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("API_KEY_NOT_CONFIGURED");
  }

  const client = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    timeout: useThinking ? EXTENDED_THINKING_TIMEOUT_MS : API_TIMEOUT_MS,
  });

  const toolSchema = useV2Schema ? TOOL_SCHEMA_V2 : TOOL_SCHEMA_LEGACY;

  if (useThinking) {
    const response = await client.messages.create({
      model: modelId,
      max_tokens: 16_000,
      thinking: {
        type: "enabled",
        budget_tokens: 10_000,
      },
      messages: [
        { role: "user", content: `${systemPrompt}\n\n${userPrompt}` },
      ],
      tools: [
        {
          name: toolSchema.name,
          description: toolSchema.description,
          input_schema: toolSchema.input_schema,
        },
      ],
      tool_choice: { type: "auto" },
    });

    const toolBlock = response.content.find((b) => b.type === "tool_use");
    if (!toolBlock || toolBlock.type !== "tool_use") {
      throw new Error("AI_NO_TOOL_RESPONSE");
    }

    return parseToolInput(toolBlock.input as Record<string, unknown>, useV2Schema);
  }

  // Standard call (no extended thinking)
  const response = await client.messages.create({
    model: modelId,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    tools: [
      {
        name: toolSchema.name,
        description: toolSchema.description,
        input_schema: toolSchema.input_schema,
      },
    ],
    tool_choice: { type: "tool", name: "suggest_exercise_details" },
  });

  // Extract tool use result
  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("AI_NO_TOOL_RESPONSE");
  }

  return parseToolInput(toolBlock.input as Record<string, unknown>, useV2Schema);
}

// ── OpenAI Call ───────────────────────────────────────────────────

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  modelId: string,
  useV2Schema: boolean
): Promise<AiExerciseSuggestion> {
  if (!env.OPENAI_API_KEY) {
    throw new Error("API_KEY_NOT_CONFIGURED");
  }

  const client = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    timeout: API_TIMEOUT_MS,
  });

  const functionDef = useV2Schema ? OPENAI_FUNCTION_V2 : OPENAI_FUNCTION_LEGACY;

  const response = await client.chat.completions.create({
    model: modelId,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    tools: [{ type: "function", function: functionDef }],
    tool_choice: {
      type: "function",
      function: { name: "suggest_exercise_details" },
    },
    max_tokens: 2048,
  });

  const toolCall = response.choices[0]?.message?.tool_calls?.[0];
  if (!toolCall || toolCall.type !== "function") {
    throw new Error("AI_NO_TOOL_RESPONSE");
  }

  const parsed = JSON.parse(toolCall.function.arguments);
  return parseToolInput(parsed, useV2Schema);
}

// ── Response Parser ──────────────────────────────────────────────

function parseToolInput(
  input: Record<string, unknown>,
  isV2: boolean
): AiExerciseSuggestion {
  const base: AiExerciseSuggestion = {
    nameTranslation: String(input.name_translation ?? ""),
    descriptionDe: String(input.description_de ?? ""),
    descriptionEn: String(input.description_en ?? ""),
    exerciseType: validateExerciseType(String(input.exercise_type ?? "strength")),
    primaryMuscleGroupIds: asStringArray(input.primary_muscle_group_ids),
    secondaryMuscleGroupIds: asStringArray(input.secondary_muscle_group_ids),
    equipmentIds: asStringArray(input.equipment_ids),
  };

  if (isV2) {
    base.categoryAssignments = parseCategoryAssignments(input.category_assignments);
  }

  return base;
}

function parseCategoryAssignments(
  val: unknown
): Record<string, string[]> {
  if (!val || typeof val !== "object" || Array.isArray(val)) return {};

  const result: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(val as Record<string, unknown>)) {
    if (typeof key === "string" && Array.isArray(value)) {
      result[key] = value.filter((v): v is string => typeof v === "string");
    }
  }
  return result;
}

function asStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((v): v is string => typeof v === "string");
}

function validateExerciseType(val: string): ExerciseType {
  if (EXERCISE_TYPES_LIST.includes(val)) return val as ExerciseType;
  return "strength";
}

// ── UUID Validation ──────────────────────────────────────────────

function filterValidUuids(ids: string[], validIds: Set<string>): string[] {
  return ids.filter((id) => validIds.has(id));
}

/**
 * Validate and filter categoryAssignments against actual taxonomy data.
 * Removes any node IDs not present in the fetched taxonomy,
 * and removes dimension slugs that don't exist.
 */
function validateCategoryAssignments(
  assignments: Record<string, string[]>,
  taxonomyData: DimensionWithNodes[]
): Record<string, string[]> {
  // Build a set of all valid node IDs and a set of valid dimension slugs
  const validNodeIds = new Set<string>();
  const validDimensionSlugs = new Set<string>();
  // Map from dimension slug -> set of valid node IDs in that dimension
  const nodeIdsByDimension = new Map<string, Set<string>>();

  for (const dw of taxonomyData) {
    validDimensionSlugs.add(dw.dimension.slug);
    const dimNodeIds = new Set<string>();
    for (const node of dw.nodes) {
      validNodeIds.add(node.id);
      dimNodeIds.add(node.id);
    }
    nodeIdsByDimension.set(dw.dimension.slug, dimNodeIds);
  }

  const validated: Record<string, string[]> = {};

  for (const [slug, nodeIds] of Object.entries(assignments)) {
    if (!validDimensionSlugs.has(slug)) continue;

    const dimNodeIds = nodeIdsByDimension.get(slug);
    if (!dimNodeIds) continue;

    const filtered = nodeIds.filter((id) => dimNodeIds.has(id));
    if (filtered.length > 0) {
      validated[slug] = filtered;
    }
  }

  return validated;
}

/**
 * Extract muscle group and equipment IDs from categoryAssignments
 * for backward compatibility with the legacy fields.
 */
function extractLegacyFromAssignments(
  assignments: Record<string, string[]>
): {
  primaryMuscleGroupIds: string[];
  equipmentIds: string[];
} {
  return {
    primaryMuscleGroupIds: assignments[DIMENSION_SLUGS.MUSCLE_GROUP] ?? [],
    equipmentIds: assignments[DIMENSION_SLUGS.EQUIPMENT] ?? [],
  };
}

// ── Main Export ──────────────────────────────────────────────────

/**
 * Suggest exercise details using AI.
 *
 * @param exerciseName - The name of the exercise (in the given locale)
 * @param locale - "de" or "en" — determines which language the name is in
 * @param modelId - The AI model ID to use (from AI_MODELS registry)
 * @param useThinking - If true, enable extended thinking (Anthropic models only)
 * @returns Suggested exercise details with validated taxonomy UUIDs
 * @throws Error with code "API_KEY_NOT_CONFIGURED" if the provider's key is missing
 * @throws Error with code "MODEL_NOT_FOUND" if modelId is not in the registry
 * @throws Error with code "PROVIDER_NOT_AVAILABLE" if the provider's key is not set
 */
export async function suggestExercise(
  exerciseName: string,
  locale: "de" | "en",
  modelId: string,
  useThinking = false
): Promise<AiExerciseSuggestion> {
  // Validate model exists
  const model = getModelById(modelId);
  if (!model) {
    throw new Error("MODEL_NOT_FOUND");
  }

  // Check provider availability
  if (!isProviderAvailable(model.provider)) {
    throw new Error("PROVIDER_NOT_AVAILABLE");
  }

  // Fetch both legacy taxonomy and hierarchical taxonomy in parallel
  const [muscleGroups, equipment, taxonomyData] = await Promise.all([
    getTaxonomy("muscle_group"),
    getTaxonomy("equipment"),
    getAllTaxonomyData(),
  ]);

  // Determine if we should use the V2 (hierarchical) path
  const useV2 = taxonomyData.length > 0;

  // Build prompts
  let systemPrompt: string;
  if (useV2) {
    systemPrompt = await getSuggestAllPromptV2(
      taxonomyData,
      null, // exercise type unknown at this point — include all dimensions
      muscleGroups,
      equipment
    );
  } else {
    // Fallback to legacy prompt
    systemPrompt = await getSuggestAllPrompt(muscleGroups, equipment);
  }

  const userPrompt = buildUserPrompt(exerciseName, locale);

  // Dispatch to provider
  let suggestion: AiExerciseSuggestion;

  switch (model.provider) {
    case "anthropic": {
      const thinking = useThinking && model.supportsThinking === true;
      suggestion = await callAnthropic(systemPrompt, userPrompt, model.id, thinking, useV2);
      break;
    }
    case "openai":
      suggestion = await callOpenAI(systemPrompt, userPrompt, model.id, useV2);
      break;
    default:
      throw new Error("UNSUPPORTED_PROVIDER");
  }

  // Validate returned UUIDs
  if (useV2 && suggestion.categoryAssignments) {
    // Validate hierarchical assignments against actual taxonomy
    suggestion.categoryAssignments = validateCategoryAssignments(
      suggestion.categoryAssignments,
      taxonomyData
    );

    // Populate legacy fields from categoryAssignments for backward compat
    const legacy = extractLegacyFromAssignments(suggestion.categoryAssignments);

    // Only overwrite legacy fields if they're empty (AI might have filled them too)
    if (suggestion.primaryMuscleGroupIds.length === 0) {
      suggestion.primaryMuscleGroupIds = legacy.primaryMuscleGroupIds;
    }
    if (suggestion.equipmentIds.length === 0) {
      suggestion.equipmentIds = legacy.equipmentIds;
    }
  }

  // Always validate legacy fields against actual taxonomy
  const validMuscleGroupIds = new Set(muscleGroups.map((mg) => mg.id));
  const validEquipmentIds = new Set(equipment.map((eq) => eq.id));

  suggestion.primaryMuscleGroupIds = filterValidUuids(
    suggestion.primaryMuscleGroupIds,
    validMuscleGroupIds
  );
  suggestion.secondaryMuscleGroupIds = filterValidUuids(
    suggestion.secondaryMuscleGroupIds,
    validMuscleGroupIds
  );
  suggestion.equipmentIds = filterValidUuids(
    suggestion.equipmentIds,
    validEquipmentIds
  );

  return suggestion;
}
