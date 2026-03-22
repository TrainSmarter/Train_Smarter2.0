/**
 * AI Provider & Model definitions — PROJ-12
 *
 * Central registry of supported AI models for exercise suggestion.
 * Keys are checked at runtime to determine availability.
 */

import { env } from "@/lib/env";
import type { ExerciseType } from "@/lib/exercises/types";

// ── Types ────────────────────────────────────────────────────────

export type AiProvider = "anthropic" | "openai";

export interface AiModel {
  id: string;
  provider: AiProvider;
  displayName: string;
  cost: "€" | "€€" | "€€€" | "€€€€";
  /** If true, this model supports extended thinking (Anthropic only) */
  supportsThinking?: boolean;
}

export interface AiExerciseSuggestion {
  nameTranslation: string;
  descriptionDe: string;
  descriptionEn: string;
  exerciseType: ExerciseType;
  primaryMuscleGroupIds: string[];
  secondaryMuscleGroupIds: string[];
  equipmentIds: string[];
  /** PROJ-20: Hierarchical category assignments (dimensionSlug -> nodeUUIDs) */
  categoryAssignments?: Record<string, string[]>;
}

export interface ApiKeyStatus {
  anthropic: boolean;
  openai: boolean;
}

export interface ProviderStatus {
  provider: AiProvider;
  available: boolean;
}

// ── Model Registry ───────────────────────────────────────────────

export const AI_MODELS: AiModel[] = [
  {
    id: "claude-haiku-4-5-20251001",
    provider: "anthropic",
    displayName: "Claude 4.5 Haiku",
    cost: "€",
  },
  {
    id: "claude-sonnet-4-6-20250514",
    provider: "anthropic",
    displayName: "Claude Sonnet 4.6",
    cost: "€€",
    supportsThinking: true,
  },
  {
    id: "gpt-4o-mini",
    provider: "openai",
    displayName: "GPT-4o Mini",
    cost: "€",
  },
  {
    id: "gpt-4o",
    provider: "openai",
    displayName: "GPT-4o",
    cost: "€€€",
  },
  {
    id: "claude-opus-4-6-20250620",
    provider: "anthropic",
    displayName: "Claude Opus 4.6",
    cost: "€€€€",
    supportsThinking: true,
  },
];

export const DEFAULT_AI_MODEL = "claude-haiku-4-5-20251001";

// ── Helpers ──────────────────────────────────────────────────────

/** Find a model by its ID. Returns undefined if not found. */
export function getModelById(id: string): AiModel | undefined {
  return AI_MODELS.find((m) => m.id === id);
}

/** Check which providers have API keys configured. */
export function getAvailableProviders(): ProviderStatus[] {
  return [
    { provider: "anthropic", available: !!env.ANTHROPIC_API_KEY },
    { provider: "openai", available: !!env.OPENAI_API_KEY },
  ];
}

/** Check if a specific provider's API key is configured. */
export function isProviderAvailable(provider: AiProvider): boolean {
  switch (provider) {
    case "anthropic":
      return !!env.ANTHROPIC_API_KEY;
    case "openai":
      return !!env.OPENAI_API_KEY;
    default:
      return false;
  }
}
