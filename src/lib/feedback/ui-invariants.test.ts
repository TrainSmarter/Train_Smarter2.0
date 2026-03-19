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

describe("week-strip: today indicator distinct from entry dot", () => {
  const strip = readSrc("components/feedback/week-strip.tsx");

  it("today gets a ring indicator (not just bold text)", () => {
    expect(strip).toContain("ring-2 ring-primary");
  });

  it("entry dot uses bg-success only when isFilled", () => {
    expect(strip).toContain("isFilled");
    expect(strip).toContain("bg-success");
  });

  it("empty days have transparent dot (no gray dot)", () => {
    expect(strip).toContain("bg-transparent");
    expect(strip).not.toContain("bg-muted-foreground/30");
  });

  it("day number is inside a rounded-full container for ring effect", () => {
    expect(strip).toContain("rounded-full");
    expect(strip).toContain("h-7 w-7");
  });
});
