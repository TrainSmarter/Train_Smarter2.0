import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Source-code invariant tests for PROJ-6 UI component changes since commit 63028c7
 *
 * Covers:
 * - checkin-form.tsx: BACKFILL_LIMIT_EXCEEDED error handling, proactiveBackfillWarning, backfillMode prop
 * - athlete-detail-view.tsx: updateBackfillMode import, 3 select options, no old days dropdown
 */

// ── Helpers ─────────────────────────────────────────────────────

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

// ═══════════════════════════════════════════════════════════════
// 1. checkin-form.tsx invariants
// ═══════════════════════════════════════════════════════════════

describe("checkin-form.tsx invariants", () => {
  const form = readSrc("components/feedback/checkin-form.tsx");

  describe("BACKFILL_LIMIT_EXCEEDED error handling", () => {
    it("BACKFILL_LIMIT_EXCEEDED is in the GLOBAL_ERROR_CODES set", () => {
      expect(form).toContain('"BACKFILL_LIMIT_EXCEEDED"');
      // Verify it is part of GLOBAL_ERROR_CODES
      const globalErrorMatch = form.match(
        /GLOBAL_ERROR_CODES[\s\S]*?new Set\(\[([^\]]+)\]/
      );
      expect(globalErrorMatch).not.toBeNull();
      expect(globalErrorMatch![1]).toContain("BACKFILL_LIMIT_EXCEEDED");
    });

    it("BACKFILL_LIMIT_EXCEEDED triggers a global error banner (not field-specific)", () => {
      // The getGlobalErrorInfo function has a case for BACKFILL_LIMIT_EXCEEDED
      expect(form).toContain('case "BACKFILL_LIMIT_EXCEEDED"');
      expect(form).toContain("errorBannerBackfillTitle");
      expect(form).toContain("errorBannerBackfill");
    });
  });

  describe("proactiveBackfillWarning logic", () => {
    it("proactiveBackfillWarning is computed as a useMemo", () => {
      expect(form).toContain("proactiveBackfillWarning");
      expect(form).toMatch(/const proactiveBackfillWarning\s*=\s*React\.useMemo/);
    });

    it("proactive warning checks backfillMode prop", () => {
      expect(form).toContain("backfillMode");
    });

    it("proactive warning uses errorBannerBackfillProactive i18n key", () => {
      expect(form).toContain("errorBannerBackfillProactive");
    });
  });

  describe("backfillMode prop (replacing backfillDays)", () => {
    it("has backfillMode prop in CheckinFormProps", () => {
      expect(form).toContain("backfillMode?: BackfillMode");
    });

    it("does NOT have backfillDays prop", () => {
      expect(form).not.toMatch(/backfillDays\s*\??\s*:\s*number/);
    });

    it("imports BackfillMode type from types", () => {
      expect(form).toContain("BackfillMode");
      expect(form).toMatch(/import.*BackfillMode.*from/);
    });
  });

  describe("AlertExtended for error banner", () => {
    it("imports AlertExtended component", () => {
      expect(form).toContain("AlertExtended");
      expect(form).toMatch(
        /import\s*\{?\s*AlertExtended\s*\}?\s*from/
      );
    });

    it("renders AlertExtended with variant='error'", () => {
      expect(form).toContain('variant="error"');
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. athlete-detail-view.tsx invariants
// ═══════════════════════════════════════════════════════════════

describe("athlete-detail-view.tsx invariants", () => {
  const view = readSrc("components/feedback/athlete-detail-view.tsx");

  describe("updateBackfillMode import (not updateBackfillDays)", () => {
    it("imports updateBackfillMode", () => {
      expect(view).toContain("updateBackfillMode");
      expect(view).toMatch(/import.*updateBackfillMode.*from/);
    });

    it("does NOT import updateBackfillDays", () => {
      expect(view).not.toContain("updateBackfillDays");
    });
  });

  describe("Select dropdown has exactly 3 backfill mode options", () => {
    it('has SelectItem with value "current_week"', () => {
      expect(view).toContain('value="current_week"');
    });

    it('has SelectItem with value "two_weeks"', () => {
      expect(view).toContain('value="two_weeks"');
    });

    it('has SelectItem with value "unlimited"', () => {
      expect(view).toContain('value="unlimited"');
    });

    it("uses i18n keys for option labels", () => {
      expect(view).toContain('t("backfillCurrentWeek")');
      expect(view).toContain('t("backfillTwoWeeks")');
      expect(view).toContain('t("backfillUnlimited")');
    });
  });

  describe("old days dropdown (1-14) is removed", () => {
    it("does NOT contain numeric 1-14 range options", () => {
      // The old dropdown had values like "1", "2", ... "14" for days
      // Make sure there is no iteration over numeric day values
      expect(view).not.toMatch(/Array\.from.*14/);
      expect(view).not.toMatch(/backfillDays/);
    });

    it("does NOT contain feedback_backfill_days reference", () => {
      expect(view).not.toContain("feedback_backfill_days");
    });
  });

  describe("backfillMode state management", () => {
    it("uses BackfillMode type for state", () => {
      expect(view).toMatch(/useState<BackfillMode>/);
    });

    it("calls updateBackfillMode on change", () => {
      expect(view).toContain("updateBackfillMode(athlete.athleteId, newMode)");
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. Migration invariants
// ═══════════════════════════════════════════════════════════════

describe("Migration 20260319100000_backfill_mode.sql", () => {
  const migration = readRoot(
    "supabase/migrations/20260319100000_backfill_mode.sql"
  );

  it("creates feedback_backfill_mode column", () => {
    expect(migration).toContain("feedback_backfill_mode");
  });

  it("has CHECK constraint with exactly 3 valid values", () => {
    expect(migration).toContain("chk_feedback_backfill_mode");
    expect(migration).toContain("'current_week'");
    expect(migration).toContain("'two_weeks'");
    expect(migration).toContain("'unlimited'");
  });

  it("defaults to 'current_week'", () => {
    expect(migration).toContain("DEFAULT 'current_week'");
  });

  it("includes a backfill UPDATE for existing rows", () => {
    expect(migration).toContain("UPDATE public.trainer_athlete_connections");
    expect(migration).toContain("SET feedback_backfill_mode");
  });
});

describe("Migration 20260319200000_fix_consent_rls_for_trainers.sql", () => {
  const migration = readRoot(
    "supabase/migrations/20260319200000_fix_consent_rls_for_trainers.sql"
  );

  it("is SECURITY DEFINER", () => {
    expect(migration).toContain("SECURITY DEFINER");
  });

  it("creates check_athlete_consent function", () => {
    expect(migration).toContain("check_athlete_consent");
    expect(migration).toMatch(
      /CREATE OR REPLACE FUNCTION public\.check_athlete_consent/
    );
  });

  it("creates check_athletes_consent batch function", () => {
    expect(migration).toContain("check_athletes_consent");
    expect(migration).toMatch(
      /CREATE OR REPLACE FUNCTION public\.check_athletes_consent/
    );
  });

  it("check_athlete_consent accepts p_athlete_id uuid and p_consent_type text", () => {
    expect(migration).toMatch(
      /check_athlete_consent\(\s*p_athlete_id uuid,\s*p_consent_type text/
    );
  });

  it("check_athletes_consent accepts p_athlete_ids uuid[] and p_consent_type text", () => {
    expect(migration).toMatch(
      /check_athletes_consent\(\s*p_athlete_ids uuid\[\],\s*p_consent_type text/
    );
  });

  it("GRANTs EXECUTE to authenticated role", () => {
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.check_athlete_consent"
    );
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.check_athletes_consent"
    );
    expect(migration).toContain("TO authenticated");
  });

  it("verifies caller authorization (trainer connection or self)", () => {
    expect(migration).toContain("v_caller := auth.uid()");
    expect(migration).toContain("v_caller = p_athlete_id");
    expect(migration).toContain("trainer_id = v_caller");
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. checkin-form: null value save on clear + Enter key
// ═══════════════════════════════════════════════════════════════

describe("checkin-form: save null on clear + Enter key", () => {
  const form = readSrc("components/feedback/checkin-form.tsx");

  it("handleBlurSave checks for previously existing value (hadPreviousValue)", () => {
    expect(form).toContain("hadPreviousValue");
    expect(form).toContain("existingValues?.[categoryId]");
  });

  it("saves null when field is cleared (hasCurrentValue || hadPreviousValue)", () => {
    expect(form).toContain("if (hasCurrentValue || hadPreviousValue)");
  });

  it("handleEnterSave function exists and calls handleBlurSave", () => {
    expect(form).toContain("function handleEnterSave");
    expect(form).toContain("handleBlurSave(categoryId)");
  });

  it("handleEnterSave focuses the next number field via data-category-id", () => {
    expect(form).toContain("data-category-id");
    expect(form).toContain('querySelector<HTMLInputElement>');
    expect(form).toContain("nextInput?.focus()");
  });

  it("passes onEnter prop to NumberInput", () => {
    expect(form).toContain("onEnter={() => handleEnterSave(cat.id)}");
  });

  it("tracks numberCategoryIds for Enter navigation", () => {
    expect(form).toContain("numberCategoryIds");
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. number-input: onEnter prop + keydown handler
// ═══════════════════════════════════════════════════════════════

describe("number-input: onEnter prop", () => {
  const input = readSrc("components/feedback/number-input.tsx");

  it("accepts onEnter prop in interface", () => {
    expect(input).toContain("onEnter?: () => void");
  });

  it("destructures onEnter in component function", () => {
    expect(input).toMatch(/onEnter,?\s*\n/);
  });

  it("handles Enter keydown in inline mode input", () => {
    expect(input).toContain('e.key === "Enter"');
    expect(input).toContain("onEnter?.()");
  });

  it("handles Enter keydown in standalone mode Input", () => {
    // Both inline and standalone inputs should have onKeyDown
    const keydownCount = (input.match(/onKeyDown/g) || []).length;
    expect(keydownCount).toBeGreaterThanOrEqual(2);
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. week-strip: today ring vs entry dot distinction
// ═══════════════════════════════════════════════════════════════

describe("week-strip: today indicator and status badges", () => {
  const strip = readSrc("components/feedback/week-strip.tsx");

  it("today gets a ring indicator (not just bold text)", () => {
    expect(strip).toContain("ring-2 ring-primary");
  });

  it("day number circle has relative class for badge positioning", () => {
    expect(strip).toContain("relative flex h-7 w-7");
  });

  it("green status: bg-success/20 with dark mode boost", () => {
    expect(strip).toContain("bg-success/20 dark:bg-success/30");
  });

  it("yellow status: bg-warning/20 with dark mode boost", () => {
    expect(strip).toContain("bg-warning/20 dark:bg-warning/30");
  });

  it("red status: bg-destructive/20 with dark mode boost", () => {
    expect(strip).toContain("bg-destructive/20 dark:bg-destructive/30");
  });

  it("green badge: solid bg-success with Check icon and white text", () => {
    expect(strip).toContain("bg-success text-white");
    expect(strip).toContain("<Check");
  });

  it("yellow badge: solid bg-warning with Minus icon and dark text for contrast", () => {
    expect(strip).toContain("bg-warning text-amber-950");
    expect(strip).toContain("<Minus");
  });

  it("red badge: solid bg-destructive with X icon and white text", () => {
    expect(strip).toContain("bg-destructive text-white");
    expect(strip).toContain("<X");
  });

  it("imports Check, Minus, X from lucide-react", () => {
    expect(strip).toMatch(/import\s*\{[^}]*Check[^}]*\}\s*from\s*"lucide-react"/);
    expect(strip).toMatch(/import\s*\{[^}]*Minus[^}]*\}\s*from\s*"lucide-react"/);
    expect(strip).toMatch(/import\s*\{[^}]*\bX\b[^}]*\}\s*from\s*"lucide-react"/);
  });

  it("badge is aria-hidden (decorative)", () => {
    // All badges should be aria-hidden="true"
    const badgeMatches = strip.match(/aria-hidden="true"/g);
    expect(badgeMatches).not.toBeNull();
    expect(badgeMatches!.length).toBeGreaterThanOrEqual(3);
  });

  it("day number is inside a rounded-full container for ring effect", () => {
    expect(strip).toContain("rounded-full");
    expect(strip).toContain("h-7 w-7");
  });

  it("accepts requiredCategoryIds and checkinValues props", () => {
    expect(strip).toContain("requiredCategoryIds");
    expect(strip).toContain("checkinValues");
  });

  it("uses computeDotColor for status determination", () => {
    expect(strip).toContain("computeDotColor");
  });

  it("does NOT have the old dot element (mt-0.5 h-1.5 w-1.5)", () => {
    expect(strip).not.toContain("mt-0.5 h-1.5 w-1.5");
  });
});

// ═══════════════════════════════════════════════════════════════
// 7. PROJ-18: Migration invariants
// ═══════════════════════════════════════════════════════════════

describe("Migration 20260320000000_proj18_trainer_defaults.sql", () => {
  const migration = readRoot(
    "supabase/migrations/20260320000000_proj18_trainer_defaults.sql"
  );

  it("creates trainer_category_defaults table", () => {
    expect(migration).toContain(
      "CREATE TABLE public.trainer_category_defaults"
    );
  });

  it("has trainer_id and category_id columns with FK constraints", () => {
    expect(migration).toContain("trainer_id");
    expect(migration).toContain("category_id");
    expect(migration).toContain("REFERENCES auth.users(id)");
    expect(migration).toContain("REFERENCES public.feedback_categories(id)");
  });

  it("has UNIQUE constraint on (trainer_id, category_id)", () => {
    expect(migration).toContain("uq_trainer_category_default");
    expect(migration).toContain("UNIQUE (trainer_id, category_id)");
  });

  it("has CHECK constraint: required needs active", () => {
    expect(migration).toContain("chk_required_needs_active");
    expect(migration).toContain("NOT is_required OR is_active");
  });

  it("enables RLS on trainer_category_defaults", () => {
    expect(migration).toContain(
      "ALTER TABLE public.trainer_category_defaults ENABLE ROW LEVEL SECURITY"
    );
  });

  it("has all 4 RLS policies (SELECT, INSERT, UPDATE, DELETE)", () => {
    expect(migration).toContain("Trainers can read own defaults");
    expect(migration).toContain("Trainers can insert own defaults");
    expect(migration).toContain("Trainers can update own defaults");
    expect(migration).toContain("Trainers can delete own defaults");
  });

  it("adds is_required column to feedback_category_overrides", () => {
    expect(migration).toContain(
      "ADD COLUMN IF NOT EXISTS is_required boolean NOT NULL DEFAULT false"
    );
  });

  it("creates set_athlete_category_required SECURITY DEFINER function", () => {
    expect(migration).toMatch(
      /CREATE OR REPLACE FUNCTION public\.set_athlete_category_required/
    );
    expect(migration).toContain("SECURITY DEFINER");
  });

  it("set_athlete_category_required verifies trainer-athlete connection", () => {
    expect(migration).toContain("trainer_athlete_connections");
    expect(migration).toContain("trainer_id = auth.uid()");
    expect(migration).toContain("athlete_id = p_athlete_id");
    expect(migration).toContain("status = 'active'");
  });

  it("set_athlete_category_required upserts override row", () => {
    expect(migration).toContain("ON CONFLICT (user_id, category_id)");
    expect(migration).toContain("DO UPDATE SET");
    expect(migration).toContain("is_required = p_is_required");
  });

  it("creates copy_trainer_defaults_to_athlete SECURITY DEFINER function", () => {
    expect(migration).toMatch(
      /CREATE OR REPLACE FUNCTION public\.copy_trainer_defaults_to_athlete/
    );
  });

  it("copy_trainer_defaults_to_athlete verifies caller is the trainer", () => {
    expect(migration).toContain("v_caller := auth.uid()");
    expect(migration).toContain("v_caller != p_trainer_id");
  });

  it("GRANTs EXECUTE to authenticated for both functions", () => {
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.set_athlete_category_required"
    );
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.copy_trainer_defaults_to_athlete"
    );
  });
});

describe("Migration 20260320100000_proj18_fix_override_rls_and_copy.sql", () => {
  const migration = readRoot(
    "supabase/migrations/20260320100000_proj18_fix_override_rls_and_copy.sql"
  );

  it("creates RLS policy for trainers to read athlete overrides", () => {
    expect(migration).toContain(
      "Trainers can read connected athlete overrides"
    );
    expect(migration).toContain("feedback_category_overrides");
  });

  it("RLS policy checks trainer_athlete_connections with status = 'active'", () => {
    expect(migration).toContain("trainer_athlete_connections");
    expect(migration).toContain("trainer_id = auth.uid()");
    expect(migration).toContain("status = 'active'");
  });

  it("fixes copy_trainer_defaults_to_athlete to use status = 'active'", () => {
    // The fix migration overwrites the function — make sure 'accepted' is NOT present
    expect(migration).not.toContain("status = 'accepted'");
    expect(migration).toContain("status = 'active'");
  });
});

// ═══════════════════════════════════════════════════════════════
// 8. PROJ-18: checkin-form required field asterisk
// ═══════════════════════════════════════════════════════════════

describe("checkin-form: required field asterisk (PROJ-18)", () => {
  const form = readSrc("components/feedback/checkin-form.tsx");

  it("shows asterisk for isEffectivelyRequired categories", () => {
    expect(form).toContain("isEffectivelyRequired");
  });

  it("asterisk uses text-destructive class", () => {
    expect(form).toContain('className="text-destructive');
  });

  it("asterisk is aria-hidden (decorative)", () => {
    expect(form).toContain('aria-hidden="true">*</span>');
  });

  it("renders asterisk for all field types (number, scale, text)", () => {
    // Count occurrences of the asterisk pattern
    const matches = form.match(/isEffectivelyRequired && \(/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(3);
  });
});

// ═══════════════════════════════════════════════════════════════
// 9. PROJ-18: default-settings-page component
// ═══════════════════════════════════════════════════════════════

describe("default-settings-page.tsx invariants (PROJ-18)", () => {
  const page = readSrc("components/feedback/default-settings-page.tsx");

  it("imports updateTrainerDefault action", () => {
    expect(page).toContain("updateTrainerDefault");
    expect(page).toMatch(/import.*updateTrainerDefault.*from/);
  });

  it("accepts allCategories and trainerDefaults props", () => {
    expect(page).toContain("allCategories: FeedbackCategory[]");
    expect(page).toContain("trainerDefaults: TrainerCategoryDefault[]");
  });

  it("has active toggle (is_active) and required toggle (is_required)", () => {
    expect(page).toContain('"is_active"');
    expect(page).toContain('"is_required"');
  });

  it("disables required toggle for text-type categories", () => {
    expect(page).toContain("isTextType");
    expect(page).toContain("disabled={isTextType");
  });

  it("shows info banner with AlertExtended", () => {
    expect(page).toContain("AlertExtended");
    expect(page).toContain('variant="info"');
    expect(page).toContain("settingsInfoBanner");
  });

  it("has optimistic update with revert on error", () => {
    expect(page).toContain("Optimistic update");
    expect(page).toContain("Revert");
  });

  it("syncs local state from props via defaultsKey effect", () => {
    expect(page).toContain("defaultsKey");
    expect(page).toContain("setLocalDefaults");
  });

  it("handles both scope groups: global and trainer", () => {
    expect(page).toContain('"global"');
    expect(page).toContain('"trainer"');
  });
});

// ═══════════════════════════════════════════════════════════════
// 10. PROJ-18: feedback-trainer-page tabs
// ═══════════════════════════════════════════════════════════════

describe("feedback-trainer-page.tsx invariants (PROJ-18)", () => {
  const page = readSrc("components/feedback/feedback-trainer-page.tsx");

  it("renders shadcn Tabs component", () => {
    expect(page).toContain("Tabs");
    expect(page).toContain("TabsList");
    expect(page).toContain("TabsTrigger");
    expect(page).toContain("TabsContent");
  });

  it("has overview and settings tabs", () => {
    expect(page).toContain('value="overview"');
    expect(page).toContain('value="settings"');
  });

  it("renders MonitoringDashboard in overview tab", () => {
    expect(page).toContain("MonitoringDashboard");
  });

  it("renders DefaultSettingsPage in settings tab", () => {
    expect(page).toContain("DefaultSettingsPage");
  });

  it("persists tab selection in localStorage", () => {
    expect(page).toContain("localStorage");
    expect(page).toContain("TAB_STORAGE_KEY");
  });

  it("passes trainerDefaults and allCategories to DefaultSettingsPage", () => {
    expect(page).toContain("trainerDefaults={trainerDefaults}");
    expect(page).toContain("allCategories={allCategories}");
  });
});

// ═══════════════════════════════════════════════════════════════
// 11. PROJ-18: category-manager required toggle + state sync
// ═══════════════════════════════════════════════════════════════

describe("category-manager.tsx PROJ-18 extensions", () => {
  const mgr = readSrc("components/feedback/category-manager.tsx");

  it("imports updateAthleteRequired action", () => {
    expect(mgr).toContain("updateAthleteRequired");
    expect(mgr).toMatch(/import.*updateAthleteRequired.*from/);
  });

  it("imports TrainerCategoryDefault type", () => {
    expect(mgr).toContain("TrainerCategoryDefault");
  });

  it("accepts trainerDefaults prop", () => {
    expect(mgr).toContain("trainerDefaults?: TrainerCategoryDefault[]");
  });

  it("has handleRequiredToggle function", () => {
    expect(mgr).toContain("handleRequiredToggle");
    expect(mgr).toContain("updateAthleteRequired(targetAthleteId");
  });

  it("shows Individuell badge when athlete differs from default", () => {
    expect(mgr).toContain("individualBadge");
    expect(mgr).toContain("isIndividual");
    expect(mgr).toContain('variant="warning"');
  });

  it("syncs state via categoriesKey (not togglingId) to avoid revert bug", () => {
    expect(mgr).toContain("categoriesKey");
    // categoriesKey is computed from categories.map (may span multiple lines)
    expect(mgr).toContain("categories.map((c)");
    // Must NOT depend on togglingId for sync (was the root cause of the revert bug)
    expect(mgr).not.toMatch(/\[categories,\s*togglingId\]/);
  });

  it("disables required toggle for text-type categories", () => {
    expect(mgr).toContain("isTextType");
    expect(mgr).toContain("disabled={isTextType || isToggling}");
  });

  it("shows required toggle only in trainer view with active category", () => {
    expect(mgr).toContain("isTrainerView && targetAthleteId && isActive");
  });
});

// ═══════════════════════════════════════════════════════════════
// 12. PROJ-18: actions.ts — revalidatePath uses layout
// ═══════════════════════════════════════════════════════════════

describe("actions.ts revalidatePath uses layout (PROJ-18 fix)", () => {
  const actions = readSrc("lib/feedback/actions.ts");

  it("all revalidatePath calls use 'layout' to invalidate sub-routes", () => {
    // Every revalidatePath in feedback actions must use "layout"
    const revalidateCalls = actions.match(/revalidatePath\([^)]+\)/g) ?? [];
    // Filter out comments
    const actualCalls = revalidateCalls.filter(
      (c) => !c.includes("//")
    );
    expect(actualCalls.length).toBeGreaterThan(0);
    for (const call of actualCalls) {
      expect(call).toContain('"layout"');
    }
  });

  it("does NOT have any revalidatePath without layout param", () => {
    // The old pattern was revalidatePath("/feedback") without second arg
    // Regex: revalidatePath("/feedback") NOT followed by comma
    expect(actions).not.toMatch(/revalidatePath\("\/feedback"\)\s*;/);
  });
});

// ═══════════════════════════════════════════════════════════════
// 13. PROJ-18: types.ts — new types
// ═══════════════════════════════════════════════════════════════

describe("types.ts PROJ-18 extensions", () => {
  const types = readSrc("lib/feedback/types.ts");

  it("defines TrainerCategoryDefault interface", () => {
    expect(types).toContain("export interface TrainerCategoryDefault");
    expect(types).toContain("trainerId: string");
    expect(types).toContain("categoryId: string");
    expect(types).toContain("isActive: boolean");
    expect(types).toContain("isRequired: boolean");
  });

  it("ActiveCategory extends with isRequiredOverride and isEffectivelyRequired", () => {
    expect(types).toContain("isRequiredOverride: boolean | null");
    expect(types).toContain("isEffectivelyRequired: boolean");
  });

  it("CategoryOverride has isRequired field", () => {
    const overrideMatch = types.match(
      /export interface CategoryOverride[\s\S]*?\}/
    );
    expect(overrideMatch).not.toBeNull();
    expect(overrideMatch![0]).toContain("isRequired: boolean");
  });
});

// ═══════════════════════════════════════════════════════════════
// 14. PROJ-18: actions.ts — new server actions exist
// ═══════════════════════════════════════════════════════════════

describe("actions.ts PROJ-18 server actions", () => {
  const actions = readSrc("lib/feedback/actions.ts");

  it("exports updateTrainerDefault function", () => {
    expect(actions).toMatch(
      /export async function updateTrainerDefault/
    );
  });

  it("updateTrainerDefault accepts categoryId, field, value", () => {
    expect(actions).toContain(
      'field: "is_active" | "is_required"'
    );
  });

  it("updateTrainerDefault upserts into trainer_category_defaults", () => {
    expect(actions).toContain("trainer_category_defaults");
    expect(actions).toContain("onConflict");
  });

  it("updateTrainerDefault preserves existing state on partial update", () => {
    // When changing is_active, it reads existing is_required first
    expect(actions).toContain("existing?.is_required");
    expect(actions).toContain("existing?.is_active");
  });

  it("exports updateAthleteRequired function", () => {
    expect(actions).toMatch(
      /export async function updateAthleteRequired/
    );
  });

  it("updateAthleteRequired calls set_athlete_category_required RPC", () => {
    expect(actions).toContain(
      'supabase.rpc("set_athlete_category_required"'
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// 15. PROJ-18: queries.ts — new query functions
// ═══════════════════════════════════════════════════════════════

describe("queries.ts PROJ-18 extensions", () => {
  const queries = readSrc("lib/feedback/queries.ts");

  it("exports getTrainerDefaults function", () => {
    expect(queries).toMatch(
      /export async function getTrainerDefaults/
    );
  });

  it("getTrainerDefaults queries trainer_category_defaults", () => {
    expect(queries).toContain("trainer_category_defaults");
  });

  it("exports getRequiredCategoryIds function", () => {
    expect(queries).toMatch(
      /export async function getRequiredCategoryIds/
    );
  });

  it("getActiveCategories returns isRequiredOverride and isEffectivelyRequired", () => {
    expect(queries).toContain("isRequiredOverride");
    expect(queries).toContain("isEffectivelyRequired");
  });

  it("getActiveCategories reads is_required from overrides", () => {
    expect(queries).toContain("is_required");
    expect(queries).toContain("override.isRequired");
  });
});

// ═══════════════════════════════════════════════════════════════
// 16. PROJ-18: i18n — all new keys exist in both locales
// ═══════════════════════════════════════════════════════════════

describe("i18n: PROJ-18 keys in de.json and en.json", () => {
  const de = readRoot("src/messages/de.json");
  const en = readRoot("src/messages/en.json");

  const requiredKeys = [
    "tabSettings",
    "settingsTitle",
    "settingsDescription",
    "settingsInfoBanner",
    "defaultActive",
    "defaultRequired",
    "requiredField",
    "individualBadge",
    "trainerDefaultSaved",
    "trainerDefaultError",
    "athleteRequiredSaved",
    "athleteRequiredError",
  ];

  for (const key of requiredKeys) {
    it(`has "${key}" in de.json`, () => {
      expect(de).toContain(`"${key}"`);
    });

    it(`has "${key}" in en.json`, () => {
      expect(en).toContain(`"${key}"`);
    });
  }

  it("German strings use correct umlauts (not ASCII substitutes)", () => {
    // Check that common German words are spelled correctly
    expect(de).toContain("Änderungen");
    expect(de).toContain("für");
    expect(de).toContain("Standardmäßig");
    expect(de).not.toContain("Aenderungen");
    expect(de).not.toContain("fuer");
  });
});

// ═══════════════════════════════════════════════════════════════
// 17. PROJ-18: athlete-detail-view passes trainerDefaults
// ═══════════════════════════════════════════════════════════════

describe("athlete-detail-view.tsx PROJ-18 extensions", () => {
  const view = readSrc("components/feedback/athlete-detail-view.tsx");

  it("accepts trainerDefaults prop", () => {
    expect(view).toContain("trainerDefaults");
  });

  it("passes trainerDefaults to CategoryManager", () => {
    expect(view).toContain("trainerDefaults={trainerDefaults}");
  });
});

// ═══════════════════════════════════════════════════════════════
// 18. PROJ-18: athlete-checkin-page passes requiredCategoryIds
// ═══════════════════════════════════════════════════════════════

describe("athlete-checkin-page.tsx PROJ-18 extensions", () => {
  const page = readSrc("components/feedback/athlete-checkin-page.tsx");

  it("accepts requiredCategoryIds prop", () => {
    expect(page).toContain("requiredCategoryIds");
  });

  it("passes requiredCategoryIds to WeekStrip", () => {
    expect(page).toContain("requiredCategoryIds={requiredCategoryIds}");
  });
});

// ═══════════════════════════════════════════════════════════════
// 19. Trend chart UX — scroll arrows, sticky, fullscreen, layout
// ═══════════════════════════════════════════════════════════════

describe("unified-trend-chart.tsx — scroll arrows + expand button", () => {
  const chart = readSrc("components/feedback/unified-trend-chart.tsx");

  it("imports ChevronLeft, ChevronRight, Maximize2 from lucide-react", () => {
    expect(chart).toMatch(/import\s*\{[^}]*ChevronLeft[^}]*\}\s*from\s*"lucide-react"/);
    expect(chart).toMatch(/import\s*\{[^}]*ChevronRight[^}]*\}\s*from\s*"lucide-react"/);
    expect(chart).toMatch(/import\s*\{[^}]*Maximize2[^}]*\}\s*from\s*"lucide-react"/);
  });

  it("accepts onExpand optional prop", () => {
    expect(chart).toContain("onExpand?: () => void");
  });

  it("renders expand button inside chart border area when onExpand is provided", () => {
    expect(chart).toContain("onExpand && (");
    expect(chart).toContain("Maximize2");
    expect(chart).toContain("expandChart");
  });

  it("expand button is positioned absolute inside chart card", () => {
    expect(chart).toContain("absolute top-3 right-3 z-10");
  });

  it("expand button has border and shadow for visibility", () => {
    expect(chart).toContain("border bg-card/90");
    expect(chart).toContain("shadow-sm");
  });

  it("has scroll arrow buttons for chip overflow", () => {
    expect(chart).toContain("scrollChipsLeft");
    expect(chart).toContain("scrollChipsRight");
  });

  it("uses useRef for chip scroll container", () => {
    expect(chart).toContain("chipsRef");
    expect(chart).toMatch(/React\.useRef<HTMLDivElement>/);
  });

  it("tracks scroll state with canScrollLeft/canScrollRight", () => {
    expect(chart).toContain("canScrollLeft");
    expect(chart).toContain("canScrollRight");
  });

  it("uses ResizeObserver to update scroll state", () => {
    expect(chart).toContain("ResizeObserver");
  });

  it("chip container has overflow-x-auto and scrollbar-hide", () => {
    expect(chart).toContain("overflow-x-auto");
    expect(chart).toContain("scrollbar-hide");
  });
});

describe("athlete-checkin-page.tsx — layout, sticky, fullscreen dialog", () => {
  const page = readSrc("components/feedback/athlete-checkin-page.tsx");

  it("WeekStrip is inside the left column (not above the grid)", () => {
    // WeekStrip should be inside the grid, before the form card
    expect(page).toContain("WeekStrip");
    // The form card follows directly after WeekStrip with mt-4
    expect(page).toContain("mt-4 rounded-lg border bg-card p-5");
  });

  it("right column has sticky positioning for the chart", () => {
    expect(page).toContain("lg:sticky");
    expect(page).toContain("lg:top-[max(1.5rem,calc(50vh-250px))]");
  });

  it("sticky div is inside an outer wrapper (not self-start) for proper sticky behavior", () => {
    // The outer grid cell must NOT have self-start (breaks sticky)
    expect(page).not.toMatch(/lg:self-start/);
  });

  it("has fullscreen chart dialog with responsive width", () => {
    expect(page).toContain("showFullscreenChart");
    expect(page).toContain("setShowFullscreenChart");
    expect(page).toContain("DialogContent");
    // Responsive: calc-based width for mobile/tablet, capped on desktop
    expect(page).toContain("w-[calc(100vw-2rem)]");
    expect(page).toContain("max-w-5xl");
  });

  it("fullscreen dialog prevents horizontal overflow", () => {
    expect(page).toContain("overflow-x-hidden");
  });

  it("fullscreen dialog chart has min-w-0 wrapper (prevents flexbox overflow)", () => {
    expect(page).toContain("min-w-0 w-full");
  });

  it("passes onExpand to UnifiedTrendChart", () => {
    expect(page).toContain("onExpand={() => setShowFullscreenChart(true)}");
  });

  it("does NOT import Maximize2 (moved to chart component)", () => {
    expect(page).not.toContain("Maximize2");
  });

  it("computes streak client-side via computeStreak", () => {
    expect(page).toContain("computeStreak");
    expect(page).toContain("liveStreak");
  });

  it("passes loadedWeekStarts to WeekStrip", () => {
    expect(page).toContain("loadedWeekStarts={loadedWeekStarts}");
  });
});

describe("protected layout.tsx — no overflow-y-auto (sticky fix)", () => {
  const layout = readRoot(
    "src/app/[locale]/(protected)/layout.tsx"
  );

  it("main content div does NOT have overflow-y-auto (breaks sticky)", () => {
    expect(layout).not.toContain("overflow-y-auto");
  });

  it("main content div has flex-1 and padding", () => {
    expect(layout).toContain("flex-1 p-6 lg:p-8");
  });
});

describe("i18n: trend chart UX keys", () => {
  const de = readRoot("src/messages/de.json");
  const en = readRoot("src/messages/en.json");

  const keys = ["expandChart", "scrollChipsLeft", "scrollChipsRight"];

  for (const key of keys) {
    it(`has "${key}" in de.json`, () => {
      expect(de).toContain(`"${key}"`);
    });

    it(`has "${key}" in en.json`, () => {
      expect(en).toContain(`"${key}"`);
    });
  }
});
