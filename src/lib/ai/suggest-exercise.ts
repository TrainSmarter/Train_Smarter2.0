/**
 * AI Exercise Suggestion — PROJ-12
 *
 * Given an exercise name, uses AI to suggest complete details:
 * - Translation of the name
 * - Descriptions in DE + EN
 * - Exercise type
 * - Primary/secondary muscle groups (from DB taxonomy UUIDs)
 * - Equipment (from DB taxonomy UUIDs)
 *
 * Supports Anthropic (Tool Use) and OpenAI (Structured Output).
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { env } from "@/lib/env";
import { getTaxonomy } from "@/lib/exercises/queries";
import { getModelById, isProviderAvailable } from "./providers";
import type { AiExerciseSuggestion } from "./providers";
import type { TaxonomyEntry, ExerciseType } from "@/lib/exercises/types";

// Re-export for convenience
export type { AiExerciseSuggestion };

// ── Constants ────────────────────────────────────────────────────

const API_TIMEOUT_MS = 15_000;

const EXERCISE_TYPES_LIST = ["strength", "endurance", "speed", "flexibility"];

// ── Tool / Function Schema ───────────────────────────────────────

const TOOL_SCHEMA = {
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

// OpenAI function definition (slightly different format)
const OPENAI_FUNCTION = {
  name: TOOL_SCHEMA.name,
  description: TOOL_SCHEMA.description,
  parameters: TOOL_SCHEMA.input_schema,
};

// ── Prompt Builder ───────────────────────────────────────────────

function buildSystemPrompt(
  muscleGroups: TaxonomyEntry[],
  equipment: TaxonomyEntry[]
): string {
  const mgList = muscleGroups
    .map((mg) => `  - ${mg.id}: ${mg.name.de} / ${mg.name.en}`)
    .join("\n");

  const eqList = equipment
    .map((eq) => `  - ${eq.id}: ${eq.name.de} / ${eq.name.en}`)
    .join("\n");

  return `You are an exercise science expert. Given an exercise name, suggest complete details.

CRITICAL RULES:
1. For muscle groups and equipment, you MUST select ONLY from the provided UUIDs below.
2. Do not invent new categories — if nothing fits, return an empty array.
3. Descriptions should be 2-4 sentences explaining proper execution form.
4. Always provide both German and English descriptions with correct grammar.
5. German text must use proper umlauts (ä, ö, ü, ß).
6. Select 1-3 primary muscle groups and 0-3 secondary muscle groups.
7. Select 0-3 equipment items.

Available muscle groups:
${mgList}

Available equipment:
${eqList}

You MUST call the suggest_exercise_details tool with your answer.`;
}

function buildUserPrompt(exerciseName: string, locale: "de" | "en"): string {
  const inputLang = locale === "de" ? "German" : "English";
  const outputLang = locale === "de" ? "English" : "German";

  return `Exercise name (${inputLang}): "${exerciseName}"

Please suggest the complete details for this exercise. The name_translation should be the ${outputLang} translation of this exercise name.`;
}

// ── Anthropic Call ────────────────────────────────────────────────

async function callAnthropic(
  systemPrompt: string,
  userPrompt: string,
  modelId: string
): Promise<AiExerciseSuggestion> {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("API_KEY_NOT_CONFIGURED");
  }

  const client = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    timeout: API_TIMEOUT_MS,
  });

  const response = await client.messages.create({
    model: modelId,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    tools: [
      {
        name: TOOL_SCHEMA.name,
        description: TOOL_SCHEMA.description,
        input_schema: TOOL_SCHEMA.input_schema,
      },
    ],
    tool_choice: { type: "tool", name: "suggest_exercise_details" },
  });

  // Extract tool use result
  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("AI_NO_TOOL_RESPONSE");
  }

  return parseToolInput(toolBlock.input as Record<string, unknown>);
}

// ── OpenAI Call ───────────────────────────────────────────────────

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  modelId: string
): Promise<AiExerciseSuggestion> {
  if (!env.OPENAI_API_KEY) {
    throw new Error("API_KEY_NOT_CONFIGURED");
  }

  const client = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    timeout: API_TIMEOUT_MS,
  });

  const response = await client.chat.completions.create({
    model: modelId,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    tools: [{ type: "function", function: OPENAI_FUNCTION }],
    tool_choice: {
      type: "function",
      function: { name: "suggest_exercise_details" },
    },
    max_tokens: 1024,
  });

  const toolCall = response.choices[0]?.message?.tool_calls?.[0];
  if (!toolCall || toolCall.type !== "function") {
    throw new Error("AI_NO_TOOL_RESPONSE");
  }

  const parsed = JSON.parse(toolCall.function.arguments);
  return parseToolInput(parsed);
}

// ── Response Parser ──────────────────────────────────────────────

function parseToolInput(
  input: Record<string, unknown>
): AiExerciseSuggestion {
  return {
    nameTranslation: String(input.name_translation ?? ""),
    descriptionDe: String(input.description_de ?? ""),
    descriptionEn: String(input.description_en ?? ""),
    exerciseType: validateExerciseType(String(input.exercise_type ?? "strength")),
    primaryMuscleGroupIds: asStringArray(input.primary_muscle_group_ids),
    secondaryMuscleGroupIds: asStringArray(input.secondary_muscle_group_ids),
    equipmentIds: asStringArray(input.equipment_ids),
  };
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

// ── Main Export ──────────────────────────────────────────────────

/**
 * Suggest exercise details using AI.
 *
 * @param exerciseName - The name of the exercise (in the given locale)
 * @param locale - "de" or "en" — determines which language the name is in
 * @param modelId - The AI model ID to use (from AI_MODELS registry)
 * @returns Suggested exercise details with validated taxonomy UUIDs
 * @throws Error with code "API_KEY_NOT_CONFIGURED" if the provider's key is missing
 * @throws Error with code "MODEL_NOT_FOUND" if modelId is not in the registry
 * @throws Error with code "PROVIDER_NOT_AVAILABLE" if the provider's key is not set
 */
export async function suggestExercise(
  exerciseName: string,
  locale: "de" | "en",
  modelId: string
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

  // Fetch taxonomy from DB (fresh, so new entries are included)
  const [muscleGroups, equipment] = await Promise.all([
    getTaxonomy("muscle_group"),
    getTaxonomy("equipment"),
  ]);

  // Build prompts
  const systemPrompt = buildSystemPrompt(muscleGroups, equipment);
  const userPrompt = buildUserPrompt(exerciseName, locale);

  // Dispatch to provider
  let suggestion: AiExerciseSuggestion;

  switch (model.provider) {
    case "anthropic":
      suggestion = await callAnthropic(systemPrompt, userPrompt, model.id);
      break;
    case "openai":
      suggestion = await callOpenAI(systemPrompt, userPrompt, model.id);
      break;
    default:
      throw new Error("UNSUPPORTED_PROVIDER");
  }

  // Validate returned UUIDs against actual taxonomy
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
