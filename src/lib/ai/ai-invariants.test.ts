import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * PROJ-19 AI Module — Source Code Invariant Tests
 *
 * Covers:
 * - AI Providers: model registry, helpers, extended thinking support
 * - AI Usage & Rate Limiting: period calculation, fail-closed, logging
 * - AI Prompts: defaults, template variables, taxonomy injection
 * - Exercise Actions: AI authorization, rate limiting, field validation
 * - Admin Settings: extended thinking, rate limit config, model selection
 * - Security: input sanitization, API key protection, RLS policies
 * - UI Fixes: Button asChild, NavMain tooltip, TooltipContent
 * - Migrations: ai_usage_log table, admin_settings RLS
 * - i18n: all new PROJ-19 keys present
 */

function readSrc(relativePath: string): string {
  return fs.readFileSync(
    path.resolve(__dirname, "../..", relativePath),
    "utf-8"
  );
}

function readRoot(relativePath: string): string {
  return fs.readFileSync(
    path.resolve(__dirname, "../../..", relativePath),
    "utf-8"
  );
}

// ══════════════════════════════════════════════════════════════════
// 1. AI Provider & Model Registry
// ══════════════════════════════════════════════════════════════════

describe("AI Provider Registry", () => {
  let providers: string;

  beforeEach(() => {
    providers = readSrc("lib/ai/providers.ts");
  });

  it("should export AI_MODELS array with 5 models", () => {
    expect(providers).toContain("export const AI_MODELS");
    // 5 model objects in the array
    const modelMatches = providers.match(/id:\s*"/g);
    expect(modelMatches).toHaveLength(5);
  });

  it("should include Claude Opus 4.6 with supportsThinking", () => {
    expect(providers).toContain("claude-opus-4-6-20250620");
    expect(providers).toContain('cost: "€€€€"');
    expect(providers).toContain("supportsThinking: true");
  });

  it("should include Claude Sonnet 4.6 with supportsThinking", () => {
    expect(providers).toContain("claude-sonnet-4-6-20250514");
  });

  it("should have Haiku as default model", () => {
    expect(providers).toContain(
      'export const DEFAULT_AI_MODEL = "claude-haiku-4-5-20251001"'
    );
  });

  it("should export getModelById and isProviderAvailable helpers", () => {
    expect(providers).toContain("export function getModelById");
    expect(providers).toContain("export function isProviderAvailable");
  });

  it("should have supportsThinking as optional in AiModel interface", () => {
    expect(providers).toContain("supportsThinking?: boolean");
  });

  it("should include both Anthropic and OpenAI providers", () => {
    expect(providers).toContain('provider: "anthropic"');
    expect(providers).toContain('provider: "openai"');
  });

  it("should not expose API keys — only check via env", () => {
    expect(providers).toContain("env.ANTHROPIC_API_KEY");
    expect(providers).toContain("env.OPENAI_API_KEY");
    expect(providers).not.toContain("sk-ant-");
    expect(providers).not.toContain("sk-proj-");
  });
});

// ══════════════════════════════════════════════════════════════════
// 2. AI Usage & Rate Limiting
// ══════════════════════════════════════════════════════════════════

describe("AI Usage & Rate Limiting", () => {
  let usage: string;

  beforeEach(() => {
    usage = readSrc("lib/ai/usage.ts");
  });

  it('should be marked as "use server"', () => {
    expect(usage).toMatch(/^"use server"/);
  });

  it("should export all required async functions", () => {
    const fns = [
      "getRateLimitConfig",
      "getAiUsageData",
      "checkRateLimit",
      "logAiUsage",
    ];
    for (const fn of fns) {
      expect(usage).toContain(`export async function ${fn}`);
    }
  });

  it("should default to 50 calls per month", () => {
    expect(usage).toContain("DEFAULT_RATE_LIMIT_COUNT = 50");
    expect(usage).toMatch(/DEFAULT_RATE_LIMIT_PERIOD.*=.*"month"/);
  });

  it("should calculate period bounds for day, week, and month", () => {
    expect(usage).toContain('case "day"');
    expect(usage).toContain('case "week"');
    expect(usage).toContain('case "month"');
  });

  it("should start week on Monday", () => {
    expect(usage).toContain("daysFromMonday");
  });

  it("CRITICAL: should fail CLOSED on rate limit DB error", () => {
    // This was BUG-2 — rate limit must deny on error, not allow
    expect(usage).toContain("allowed: false");
    expect(usage).toContain("Fail closed");
    expect(usage).not.toMatch(/error.*allowed:\s*true/);
  });

  it("should return unlimited for admins", () => {
    expect(usage).toContain("isAdmin");
    expect(usage).toContain("allowed: true, used: 0, limit: Infinity");
  });

  it("should log usage with action_type and optional field_name", () => {
    expect(usage).toContain("action_type");
    expect(usage).toContain("field_name");
  });
});

// ══════════════════════════════════════════════════════════════════
// 3. AI Prompt Defaults & Templates
// ══════════════════════════════════════════════════════════════════

describe("AI Prompt Defaults", () => {
  let defaults: string;

  beforeEach(() => {
    defaults = readSrc("lib/ai/prompt-defaults.ts");
  });

  it("should export DEFAULT_PROMPT_SUGGEST_ALL with taxonomy placeholders", () => {
    expect(defaults).toContain("export const DEFAULT_PROMPT_SUGGEST_ALL");
    expect(defaults).toContain("{{taxonomy_muscles}}");
    expect(defaults).toContain("{{taxonomy_equipment}}");
  });

  it("should export DEFAULT_PROMPT_OPTIMIZE_FIELD with field placeholders", () => {
    expect(defaults).toContain("export const DEFAULT_PROMPT_OPTIMIZE_FIELD");
    expect(defaults).toContain("{{exercise_name}}");
    expect(defaults).toContain("{{field_name}}");
    expect(defaults).toContain("{{current_value}}");
    expect(defaults).toContain("{{language}}");
  });

  it("should mention German umlauts in default prompts", () => {
    expect(defaults).toContain("ä, ö, ü, ß");
  });

  it("should export CustomPrompts interface", () => {
    expect(defaults).toContain("export interface CustomPrompts");
  });
});

describe("AI Prompts Server Actions", () => {
  let prompts: string;

  beforeEach(() => {
    prompts = readSrc("lib/ai/prompts.ts");
  });

  it('should be marked as "use server"', () => {
    expect(prompts).toMatch(/^"use server"/);
  });

  it("should export getSuggestAllPrompt and getOptimizeFieldPrompt", () => {
    expect(prompts).toContain("export async function getSuggestAllPrompt");
    expect(prompts).toContain("export async function getOptimizeFieldPrompt");
  });

  it("should inject taxonomy into templates", () => {
    expect(prompts).toContain("injectTaxonomy");
    expect(prompts).toContain("taxonomy_muscles");
    expect(prompts).toContain("taxonomy_equipment");
  });

  it("should fall back to default prompts when no custom prompt exists", () => {
    expect(prompts).toContain("DEFAULT_PROMPT_SUGGEST_ALL");
    expect(prompts).toContain("DEFAULT_PROMPT_OPTIMIZE_FIELD");
  });

  it("should require admin for saving and resetting prompts", () => {
    expect(prompts).toContain("verifyPlatformAdmin");
  });
});

// ══════════════════════════════════════════════════════════════════
// 4. AI Suggest Exercise (Provider Dispatch)
// ══════════════════════════════════════════════════════════════════

describe("AI Suggest Exercise", () => {
  let suggest: string;

  beforeEach(() => {
    suggest = readSrc("lib/ai/suggest-exercise.ts");
  });

  it("should export suggestExercise function", () => {
    expect(suggest).toContain("export async function suggestExercise");
  });

  it("should accept useThinking parameter with default false", () => {
    expect(suggest).toMatch(/useThinking\s*=\s*false/);
  });

  it("should have extended thinking timeout constant", () => {
    expect(suggest).toContain("EXTENDED_THINKING_TIMEOUT_MS");
  });

  it("should use tool_choice auto for thinking mode", () => {
    expect(suggest).toContain('tool_choice: { type: "auto" }');
  });

  it("should use forced tool_choice for standard mode", () => {
    expect(suggest).toContain(
      'tool_choice: { type: "tool", name: "suggest_exercise_details" }'
    );
  });

  it("should only enable thinking if model supports it", () => {
    expect(suggest).toContain("model.supportsThinking === true");
  });

  it("CRITICAL: should sanitize exercise name before prompt injection", () => {
    expect(suggest).toContain("sanitizeForPrompt");
    expect(suggest).toContain("MAX_INPUT_LENGTH");
  });

  it("should validate returned UUIDs against actual taxonomy", () => {
    expect(suggest).toContain("filterValidUuids");
    expect(suggest).toContain("validMuscleGroupIds");
    expect(suggest).toContain("validEquipmentIds");
  });

  it("should fetch fresh taxonomy on every call", () => {
    expect(suggest).toContain('getTaxonomy("muscle_group")');
    expect(suggest).toContain('getTaxonomy("equipment")');
  });

  it("should use custom prompt when available", () => {
    expect(suggest).toContain("getSuggestAllPrompt");
  });
});

// ══════════════════════════════════════════════════════════════════
// 5. AI Optimize Field (Single-Field)
// ══════════════════════════════════════════════════════════════════

describe("AI Optimize Field", () => {
  let optimize: string;

  beforeEach(() => {
    optimize = readSrc("lib/ai/optimize-field.ts");
  });

  it("should export optimizeField function", () => {
    expect(optimize).toContain("export async function optimizeField");
  });

  it("should accept useThinking parameter with default false", () => {
    expect(optimize).toMatch(/useThinking\s*=\s*false/);
  });

  it("CRITICAL: should sanitize exercise name", () => {
    expect(optimize).toContain("sanitizeForPrompt");
  });

  it("should have separate timeout for thinking", () => {
    expect(optimize).toContain("EXTENDED_THINKING_TIMEOUT_MS");
  });

  it("should only enable thinking if model supports it", () => {
    expect(optimize).toContain("model.supportsThinking === true");
  });
});

// ══════════════════════════════════════════════════════════════════
// 6. Exercise Actions — AI Authorization & Rate Limiting
// ══════════════════════════════════════════════════════════════════

describe("Exercise Actions — AI features", () => {
  let actions: string;

  beforeEach(() => {
    actions = readSrc("lib/exercises/actions.ts");
  });

  it("should export suggestExerciseDetails and optimizeExerciseField", () => {
    expect(actions).toContain(
      "export async function suggestExerciseDetails"
    );
    expect(actions).toContain(
      "export async function optimizeExerciseField"
    );
  });

  it("should check AI authorization via isAiAuthorized", () => {
    expect(actions).toContain("isAiAuthorized");
    expect(actions).toContain("is_platform_admin");
    expect(actions).toContain("ai_enabled");
  });

  it("should enforce server-side rate limiting before AI call", () => {
    expect(actions).toContain("checkRateLimit");
    expect(actions).toContain("RATE_LIMIT_EXCEEDED");
  });

  it("should log usage after successful AI call", () => {
    expect(actions).toContain("logAiUsage");
    expect(actions).toContain("suggest_all");
    expect(actions).toContain("optimize_field");
  });

  it("should read extended thinking setting", () => {
    expect(actions).toContain("getExtendedThinkingSetting");
    expect(actions).toContain("useThinking");
  });

  it("should validate field names against whitelist", () => {
    expect(actions).toContain("name_de");
    expect(actions).toContain("name_en");
    expect(actions).toContain("description_de");
    expect(actions).toContain("description_en");
    expect(actions).toContain("INVALID_FIELD");
  });
});

// ══════════════════════════════════════════════════════════════════
// 7. Admin Settings — Extended Thinking + Rate Limiting
// ══════════════════════════════════════════════════════════════════

describe("Admin Settings Actions", () => {
  let settings: string;

  beforeEach(() => {
    settings = readSrc("lib/admin/settings-actions.ts");
  });

  it('should be marked as "use server"', () => {
    expect(settings).toMatch(/^"use server"/);
  });

  it("should export extended thinking get/set functions", () => {
    expect(settings).toContain(
      "export async function getExtendedThinkingSetting"
    );
    expect(settings).toContain(
      "export async function setExtendedThinkingSetting"
    );
  });

  it("should default extended thinking to false", () => {
    // getExtendedThinkingSetting should return false as default
    const fnStart = settings.indexOf("getExtendedThinkingSetting");
    const fnSlice = settings.slice(fnStart, fnStart + 500);
    expect(fnSlice).toContain("return false");
  });

  it("should require admin for setting extended thinking", () => {
    // setExtendedThinkingSetting must call verifyPlatformAdmin
    const setFn = settings.slice(
      settings.indexOf("async function setExtendedThinkingSetting")
    );
    expect(setFn).toContain("verifyPlatformAdmin");
  });

  it("should export rate limit config functions", () => {
    expect(settings).toContain(
      "export async function getRateLimitConfigAdmin"
    );
    expect(settings).toContain(
      "export async function setRateLimitConfig"
    );
  });

  it("should validate rate limit inputs", () => {
    expect(settings).toContain("INVALID_PERIOD");
    expect(settings).toContain("INVALID_COUNT");
    expect(settings).toContain("maxCount < 0");
    expect(settings).toContain("maxCount > 10000");
  });

  it("should export toggleUserAiAccess in admin actions", () => {
    const adminActions = readSrc("lib/admin/actions.ts");
    expect(adminActions).toContain("export async function toggleUserAiAccess");
    expect(adminActions).toContain("ai_enabled");
    expect(adminActions).toContain("CANNOT_DISABLE_ADMIN_AI");
  });
});

// ══════════════════════════════════════════════════════════════════
// 8. Security — Input Sanitization
// ══════════════════════════════════════════════════════════════════

describe("Security — Input Sanitization", () => {
  it("should sanitize in suggest-exercise.ts", () => {
    const suggest = readSrc("lib/ai/suggest-exercise.ts");
    expect(suggest).toContain("function sanitizeForPrompt");
    expect(suggest).toContain("MAX_INPUT_LENGTH");
    // Must strip control characters
    expect(suggest).toMatch(/\\x00.*\\x1F/);
  });

  it("should sanitize in optimize-field.ts", () => {
    const optimize = readSrc("lib/ai/optimize-field.ts");
    expect(optimize).toContain("function sanitizeForPrompt");
    expect(optimize).toContain("MAX_INPUT_LENGTH");
  });

  it("should limit input to 200 characters", () => {
    const suggest = readSrc("lib/ai/suggest-exercise.ts");
    expect(suggest).toContain("MAX_INPUT_LENGTH = 200");
  });
});

// ══════════════════════════════════════════════════════════════════
// 9. Migrations
// ══════════════════════════════════════════════════════════════════

describe("PROJ-19 Migrations", () => {
  it("should create ai_usage_log table with correct columns", () => {
    const migration = readRoot(
      "supabase/migrations/20260321100000_proj19_ai_usage_log.sql"
    );
    expect(migration).toContain("CREATE TABLE public.ai_usage_log");
    expect(migration).toContain("user_id");
    expect(migration).toContain("model_id");
    expect(migration).toContain("action_type");
    expect(migration).toContain("exercise_name");
    expect(migration).toContain("field_name");
    expect(migration).toContain("ON DELETE CASCADE");
  });

  it("should have RLS on ai_usage_log", () => {
    const migration = readRoot(
      "supabase/migrations/20260321100000_proj19_ai_usage_log.sql"
    );
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("auth.uid() = user_id");
  });

  it("should have composite index for rate limit queries", () => {
    const migration = readRoot(
      "supabase/migrations/20260321100000_proj19_ai_usage_log.sql"
    );
    expect(migration).toContain("idx_ai_usage_log_user_created");
    expect(migration).toContain("user_id, created_at");
  });

  it("should allow authenticated users to read AI-related admin_settings", () => {
    const migration = readRoot(
      "supabase/migrations/20260321200000_proj19_admin_settings_trainer_read.sql"
    );
    expect(migration).toContain("authenticated");
    expect(migration).toContain("ai_model");
    expect(migration).toContain("ai_extended_thinking");
    expect(migration).toContain("ai_rate_limit_period");
    expect(migration).toContain("ai_rate_limit_count");
    expect(migration).toContain("ai_prompt_suggest_all");
    expect(migration).toContain("ai_prompt_optimize_field");
  });
});

// ══════════════════════════════════════════════════════════════════
// 10. UI Fixes — Button asChild, NavMain, Tooltip
// ══════════════════════════════════════════════════════════════════

describe("UI Regression Fixes", () => {
  it("CRITICAL: Button asChild should render only children, no iconLeft/iconRight", () => {
    const button = readSrc("components/ui/button.tsx");
    // When asChild is true, only children should be rendered
    expect(button).toContain("asChild ? (");
    expect(button).toContain("children");
    // The pattern should be: asChild renders children only, else renders icons + children
    expect(button).toMatch(/asChild\s*\?\s*\(\s*\n?\s*children/);
  });

  it("CRITICAL: NavMain should NOT pass tooltip to CollapsibleTrigger's SidebarMenuButton", () => {
    const navMain = readSrc("components/nav-main.tsx");
    // CollapsibleTrigger asChild wrapping SidebarMenuButton WITHOUT tooltip
    const collapsibleSection = navMain.match(
      /CollapsibleTrigger asChild[\s\S]*?SidebarMenuButton[\s\S]*?<\/CollapsibleTrigger>/
    );
    expect(collapsibleSection).toBeTruthy();
    // Should NOT have tooltip prop on SidebarMenuButton inside CollapsibleTrigger
    const match = collapsibleSection![0];
    expect(match).not.toContain("tooltip={");
  });

  it("exercise-library-page should not use asChild + iconLeft together", () => {
    const libraryPage = readSrc(
      "components/exercises/exercise-library-page.tsx"
    );
    // Should not have iconLeft combined with asChild
    expect(libraryPage).not.toMatch(/asChild[\s\S]{0,50}iconLeft/);
  });

  it("exercise-form should not have conditional TooltipContent without Tooltip wrapper", () => {
    const form = readSrc("components/exercises/exercise-form.tsx");
    // Should not have pattern: {condition && <TooltipContent>} inside a <Tooltip>
    // The fix was to split into two branches: tooltip when rate limited, plain button otherwise
    expect(form).not.toMatch(
      /\{isRateLimited\s*&&\s*\(\s*<TooltipContent/
    );
  });
});

// ══════════════════════════════════════════════════════════════════
// 11. Admin Settings UI
// ══════════════════════════════════════════════════════════════════

describe("Admin Settings UI", () => {
  let settingsPage: string;

  beforeEach(() => {
    settingsPage = readSrc("components/admin/admin-settings-page.tsx");
  });

  it("should have extended thinking toggle with Switch component", () => {
    expect(settingsPage).toContain("Switch");
    expect(settingsPage).toContain("extended-thinking");
    expect(settingsPage).toContain("handleToggleThinking");
  });

  it("should accept extendedThinking prop", () => {
    expect(settingsPage).toContain("extendedThinking: boolean");
  });

  it("should have rate limit config with period select and count input", () => {
    expect(settingsPage).toContain("rate-period");
    expect(settingsPage).toContain("rate-count");
    expect(settingsPage).toContain("handleSaveRateLimit");
  });

  it("CRITICAL: rate count input should block negative values", () => {
    // BUG-4 fix — onKeyDown blocks -, ., e, E
    expect(settingsPage).toContain('e.key === "-"');
    expect(settingsPage).toContain("e.preventDefault()");
    expect(settingsPage).toContain("Math.max(0");
  });

  it("should have prompt editor with accordion", () => {
    expect(settingsPage).toContain("Accordion");
    expect(settingsPage).toContain("suggest-all");
    expect(settingsPage).toContain("optimize-field");
    expect(settingsPage).toContain("handleSavePrompt");
    expect(settingsPage).toContain("handleResetPrompt");
  });

  it("should import setExtendedThinkingSetting", () => {
    expect(settingsPage).toContain("setExtendedThinkingSetting");
  });
});

// ══════════════════════════════════════════════════════════════════
// 12. User Management — AI Toggle
// ══════════════════════════════════════════════════════════════════

describe("User Management — AI Toggle", () => {
  it("should have AI toggle in user-detail-slide-over", () => {
    const slideOver = readSrc(
      "components/admin/user-detail-slide-over.tsx"
    );
    expect(slideOver).toContain("handleAiToggle");
    expect(slideOver).toContain("toggleUserAiAccess");
    expect(slideOver).toContain("Sparkles");
  });

  it("should show AI badge in users-table", () => {
    const table = readSrc("components/admin/users-table.tsx");
    expect(table).toContain("aiEnabled");
    expect(table).toContain("Sparkles");
  });

  it("should have aiEnabled field in AdminUser type", () => {
    const types = readSrc("lib/admin/types.ts");
    expect(types).toMatch(/aiEnabled.*boolean/);
  });
});

// ══════════════════════════════════════════════════════════════════
// 13. i18n — PROJ-19 Keys
// ══════════════════════════════════════════════════════════════════

describe("PROJ-19 i18n keys", () => {
  let deJson: string;
  let enJson: string;

  beforeEach(() => {
    deJson = readRoot("src/messages/de.json");
    enJson = readRoot("src/messages/en.json");
  });

  const exerciseKeys = [
    "aiSuggest",
    "aiSuggestLoading",
    "aiSuggestSuccess",
    "aiSuggestError",
    "aiSuggestNoName",
    "aiLimitReached",
    "aiUsageCount",
  ];

  const adminKeys = [
    "rateLimitTitle",
    "rateLimitPeriod",
    "rateLimitCount",
    "rateLimitDay",
    "rateLimitWeek",
    "rateLimitMonth",
    "extendedThinkingLabel",
    "extendedThinkingDescription",
    "extendedThinkingSaved",
  ];

  for (const key of exerciseKeys) {
    it(`should have "${key}" in both de.json and en.json`, () => {
      expect(deJson).toContain(`"${key}"`);
      expect(enJson).toContain(`"${key}"`);
    });
  }

  for (const key of adminKeys) {
    it(`should have "${key}" in both de.json and en.json`, () => {
      expect(deJson).toContain(`"${key}"`);
      expect(enJson).toContain(`"${key}"`);
    });
  }

  it("should use correct German umlauts, not ASCII substitutes", () => {
    expect(deJson).not.toMatch(/"[^"]*Uebung[^"]*"/);
    expect(deJson).not.toMatch(/"[^"]*rueck[^"]*"/);
  });
});

// ══════════════════════════════════════════════════════════════════
// 14. Page Routes — AI Data Passing
// ══════════════════════════════════════════════════════════════════

describe("Exercise Page Routes — AI integration", () => {
  it("new exercise page should check AI authorization and pass usage data", () => {
    const newPage = readSrc(
      "app/[locale]/(protected)/training/exercises/new/page.tsx"
    );
    expect(newPage).toContain("is_platform_admin");
    expect(newPage).toContain("ai_enabled");
    expect(newPage).toContain("showAiSuggest");
    expect(newPage).toContain("usageData");
  });

  it("edit exercise page should check AI authorization and pass usage data", () => {
    const editPage = readSrc(
      "app/[locale]/(protected)/training/exercises/[id]/page.tsx"
    );
    expect(editPage).toContain("is_platform_admin");
    expect(editPage).toContain("ai_enabled");
    expect(editPage).toContain("showAiSuggest");
    expect(editPage).toContain("usageData");
  });

  it("admin settings page should pass extendedThinking prop", () => {
    const settingsPage = readSrc(
      "app/[locale]/(protected)/admin/settings/page.tsx"
    );
    expect(settingsPage).toContain("getExtendedThinkingSetting");
    expect(settingsPage).toContain("extendedThinking");
  });
});

// ══════════════════════════════════════════════════════════════════
// 15. Usage Types
// ══════════════════════════════════════════════════════════════════

describe("AI Usage Types", () => {
  it("should export RateLimitPeriod, AiUsageData, and RateLimitConfig", () => {
    const types = readSrc("lib/ai/usage-types.ts");
    expect(types).toContain("export type RateLimitPeriod");
    expect(types).toContain("export interface AiUsageData");
    expect(types).toContain("export interface RateLimitConfig");
    expect(types).toContain("isUnlimited");
  });
});
