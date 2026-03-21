/**
 * AI Single-Field Optimization — PROJ-19
 *
 * Optimizes a single exercise field (name or description) using AI.
 * Uses a lightweight prompt — faster and cheaper than full suggest.
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { env } from "@/lib/env";
import { getModelById, isProviderAvailable } from "./providers";

// ── Constants ────────────────────────────────────────────────────

const API_TIMEOUT_MS = 10_000; // Single field = faster
const EXTENDED_THINKING_TIMEOUT_MS = 90_000; // Opus + thinking
const MAX_INPUT_LENGTH = 200;

// ── Input Sanitization ──────────────────────────────────────────

/** Strip control characters and limit length to prevent prompt injection. */
function sanitizeForPrompt(input: string): string {
  return input
    .replace(/[\x00-\x1F\x7F]/g, "") // strip ALL control chars incl. \n, \r, \t
    .slice(0, MAX_INPUT_LENGTH)
    .trim();
}

// ── Anthropic Call ────────────────────────────────────────────────

async function callAnthropic(
  systemPrompt: string,
  userPrompt: string,
  modelId: string,
  useThinking: boolean
): Promise<string> {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("API_KEY_NOT_CONFIGURED");
  }

  const client = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    timeout: useThinking ? EXTENDED_THINKING_TIMEOUT_MS : API_TIMEOUT_MS,
  });

  if (useThinking) {
    const response = await client.messages.create({
      model: modelId,
      max_tokens: 8_000,
      thinking: {
        type: "enabled",
        budget_tokens: 5_000,
      },
      messages: [
        { role: "user", content: `${systemPrompt}\n\n${userPrompt}` },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("AI_NO_TEXT_RESPONSE");
    }

    return textBlock.text.trim();
  }

  const response = await client.messages.create({
    model: modelId,
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AI_NO_TEXT_RESPONSE");
  }

  return textBlock.text.trim();
}

// ── OpenAI Call ───────────────────────────────────────────────────

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  modelId: string
): Promise<string> {
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
    max_tokens: 512,
  });

  const text = response.choices[0]?.message?.content;
  if (!text) {
    throw new Error("AI_NO_TEXT_RESPONSE");
  }

  return text.trim();
}

// ── Main Export ──────────────────────────────────────────────────

/**
 * Optimize a single field using AI.
 *
 * @param systemPrompt - The resolved system prompt (with variables already injected)
 * @param exerciseName - The exercise name for context
 * @param modelId - The AI model ID to use
 * @returns The optimized text for the field
 */
export async function optimizeField(
  systemPrompt: string,
  exerciseName: string,
  modelId: string,
  useThinking = false
): Promise<string> {
  const model = getModelById(modelId);
  if (!model) {
    throw new Error("MODEL_NOT_FOUND");
  }

  if (!isProviderAvailable(model.provider)) {
    throw new Error("PROVIDER_NOT_AVAILABLE");
  }

  // Sanitize exercise name to prevent prompt injection
  const sanitizedName = sanitizeForPrompt(exerciseName);
  const userPrompt = `Exercise: "${sanitizedName}"\n\nPlease provide the optimized text.`;

  switch (model.provider) {
    case "anthropic": {
      const thinking = useThinking && model.supportsThinking === true;
      return callAnthropic(systemPrompt, userPrompt, model.id, thinking);
    }
    case "openai":
      return callOpenAI(systemPrompt, userPrompt, model.id);
    default:
      throw new Error("UNSUPPORTED_PROVIDER");
  }
}
