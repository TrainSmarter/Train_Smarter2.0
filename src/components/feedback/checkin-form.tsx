"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { Check, Loader2, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertExtended } from "@/components/alert-extended";
import { NumberInput } from "./number-input";
import { autosaveCheckinField } from "@/lib/feedback/actions";
import { cn } from "@/lib/utils";
import type { ActiveCategory, BackfillMode } from "@/lib/feedback/types";

/** Error codes returned by the server action */
type ErrorCode =
  | "BACKFILL_LIMIT_EXCEEDED"
  | "FUTURE_DATE"
  | "CONSENT_REQUIRED"
  | "UNAUTHORIZED"
  | "CHECKIN_FAILED"
  | "VALUES_FAILED"
  | "VALUE_FAILED"
  | "INVALID_INPUT";

/** Global error codes that apply to all fields (not field-specific) */
const GLOBAL_ERROR_CODES: ReadonlySet<string> = new Set([
  "BACKFILL_LIMIT_EXCEEDED",
  "FUTURE_DATE",
  "CONSENT_REQUIRED",
  "UNAUTHORIZED",
]);

interface CheckinFormProps {
  /** Active categories for this athlete */
  categories: ActiveCategory[];
  /** Date for which the check-in is being filled */
  date: string;
  /** Pre-existing values if viewing/editing an existing check-in */
  existingValues?: Record<string, { numericValue: number | null; textValue: string | null }>;
  /** Callback after a field is successfully saved */
  onFieldSaved?: (categoryId: string, numericValue: number | null, textValue: string | null) => void;
  /** Link/callback to open category manager */
  onManageCategories?: () => void;
  /** Backfill mode controlling how far back entries can be made */
  backfillMode?: BackfillMode;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function CheckinForm({
  categories,
  date,
  existingValues,
  onFieldSaved,
  onManageCategories,
  backfillMode,
}: CheckinFormProps) {
  const t = useTranslations("feedback");
  const locale = useLocale();

  // Pre-fill scale categories with min=0 as default (e.g. Krankheit=0 means "healthy")
  // This is only a visual pre-selection — NOT auto-saved until user explicitly changes a value
  const computeInitialValues = React.useCallback(
    (existing?: Record<string, { numericValue: number | null; textValue: string | null }>) => {
      if (existing && Object.keys(existing).length > 0) return existing;

      const defaults: Record<string, { numericValue: number | null; textValue: string | null }> = {};
      for (const cat of categories) {
        if (cat.isActive && cat.type === "scale" && cat.minValue === 0) {
          defaults[cat.id] = { numericValue: 0, textValue: null };
        }
      }
      return defaults;
    },
    [categories]
  );

  const [values, setValues] = React.useState<
    Record<string, { numericValue: number | null; textValue: string | null }>
  >(() => computeInitialValues(existingValues));
  // Per-field save status: "saving" | "saved" | "error"
  const [fieldStatus, setFieldStatus] = React.useState<Record<string, SaveStatus>>({});
  // Per-field error codes (only set when status is "error")
  const [fieldErrorCodes, setFieldErrorCodes] = React.useState<Record<string, ErrorCode>>({});
  // Global error banner state
  const [globalError, setGlobalError] = React.useState<ErrorCode | null>(null);
  // Whether the global error banner has been dismissed
  const [globalErrorDismissed, setGlobalErrorDismissed] = React.useState(false);

  // Debounce timers per field
  const debounceTimers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // Per-field saved indicator timeouts
  const savedTimers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Track the previous date to reset values only when navigating to a different day
  const prevDateRef = React.useRef(date);

  // Proactive backfill check: is the selected date outside the allowed window?
  const proactiveBackfillWarning = React.useMemo(() => {
    if (!backfillMode || backfillMode === "unlimited") return false;
    const today = new Date().toISOString().split("T")[0];
    if (date > today) return false; // Future date has its own error
    if (date === today) return false;

    // Calculate the Monday of the relevant week
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() - mondayOffset);

    let minDate: Date;
    if (backfillMode === "two_weeks") {
      // Monday of last week
      minDate = new Date(thisMonday);
      minDate.setDate(thisMonday.getDate() - 7);
    } else {
      // "current_week" — Monday of this week
      minDate = thisMonday;
    }

    const minDateStr = minDate.toISOString().split("T")[0];
    return date < minDateStr;
  }, [date, backfillMode]);

  // Proactive future date check
  const proactiveFutureDateWarning = React.useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return date > today;
  }, [date]);

  // Reset values only when the date changes (not when existingValues update from autosave)
  React.useEffect(() => {
    if (date !== prevDateRef.current) {
      prevDateRef.current = date;
      setValues(computeInitialValues(existingValues));
      setFieldStatus({});
      setFieldErrorCodes({});
      setGlobalError(null);
      setGlobalErrorDismissed(false);
    }
  }, [date, existingValues, computeInitialValues]);

  // Cleanup timers on unmount
  React.useEffect(() => {
    return () => {
      for (const timer of Object.values(debounceTimers.current)) {
        clearTimeout(timer);
      }
      for (const timer of Object.values(savedTimers.current)) {
        clearTimeout(timer);
      }
    };
  }, []);

  async function doSave(
    categoryId: string,
    numericValue: number | null,
    textValue: string | null
  ) {
    setFieldStatus((prev) => ({ ...prev, [categoryId]: "saving" }));

    try {
      const result = await autosaveCheckinField(date, categoryId, numericValue, textValue);

      if (result.success) {
        setFieldStatus((prev) => ({ ...prev, [categoryId]: "saved" }));
        // Clear error code on success
        setFieldErrorCodes((prev) => {
          const next = { ...prev };
          delete next[categoryId];
          return next;
        });
        onFieldSaved?.(categoryId, numericValue, textValue);

        // Clear "saved" indicator after 2s
        if (savedTimers.current[categoryId]) {
          clearTimeout(savedTimers.current[categoryId]);
        }
        savedTimers.current[categoryId] = setTimeout(() => {
          setFieldStatus((prev) => {
            const next = { ...prev };
            if (next[categoryId] === "saved") delete next[categoryId];
            return next;
          });
        }, 2000);
      } else {
        const errorCode = (result.error ?? "CHECKIN_FAILED") as ErrorCode;
        console.error("[CheckinForm] Save failed:", result.error, { date, categoryId, numericValue, textValue });
        setFieldStatus((prev) => ({ ...prev, [categoryId]: "error" }));
        setFieldErrorCodes((prev) => ({ ...prev, [categoryId]: errorCode }));

        // If global error, set it for the banner
        if (GLOBAL_ERROR_CODES.has(errorCode)) {
          setGlobalError(errorCode);
          setGlobalErrorDismissed(false);
        }
      }
    } catch (err) {
      console.error("[CheckinForm] Save exception:", err, { date, categoryId, numericValue, textValue });
      setFieldStatus((prev) => ({ ...prev, [categoryId]: "error" }));
      setFieldErrorCodes((prev) => ({ ...prev, [categoryId]: "CHECKIN_FAILED" }));
    }
  }

  function scheduleTextSave(
    categoryId: string,
    numericValue: number | null,
    textValue: string | null
  ) {
    // Clear existing timer for this field
    if (debounceTimers.current[categoryId]) {
      clearTimeout(debounceTimers.current[categoryId]);
    }
    debounceTimers.current[categoryId] = setTimeout(() => {
      doSave(categoryId, numericValue, textValue);
    }, 1500);
  }

  function setFieldValue(
    categoryId: string,
    numericValue: number | null,
    textValue: string | null,
    saveMode: "immediate" | "blur" | "debounce"
  ) {
    setValues((prev) => ({
      ...prev,
      [categoryId]: { numericValue, textValue },
    }));

    // Clear field-level error when user changes value (new save attempt coming)
    if (fieldStatus[categoryId] === "error") {
      setFieldStatus((prev) => {
        const next = { ...prev };
        delete next[categoryId];
        return next;
      });
      setFieldErrorCodes((prev) => {
        const next = { ...prev };
        delete next[categoryId];
        return next;
      });
    }

    if (saveMode === "immediate") {
      doSave(categoryId, numericValue, textValue);
    } else if (saveMode === "debounce") {
      scheduleTextSave(categoryId, numericValue, textValue);
    }
    // "blur" mode: save will be triggered by onBlur handler
  }

  function handleBlurSave(categoryId: string) {
    // Clear any pending debounce for this field
    if (debounceTimers.current[categoryId]) {
      clearTimeout(debounceTimers.current[categoryId]);
      delete debounceTimers.current[categoryId];
    }
    const val = values[categoryId];
    if (val && (val.numericValue != null || val.textValue != null)) {
      doSave(categoryId, val.numericValue, val.textValue);
    }
  }

  const activeCategories = categories.filter((c) => c.isActive);

  if (activeCategories.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">{t("noCategoriesActive")}</p>
        {onManageCategories && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={onManageCategories}
            iconLeft={<Settings2 className="h-4 w-4" />}
          >
            {t("manageCategories")}
          </Button>
        )}
      </div>
    );
  }

  // Separate categories by type
  const numberCategories = activeCategories.filter((c) => c.type === "number");
  const scaleCategories = activeCategories.filter((c) => c.type === "scale");
  const textCategories = activeCategories.filter((c) => c.type === "text");

  // Helper: resolve the human-readable period string for backfill mode
  function getBackfillPeriodLabel(): string {
    if (backfillMode === "two_weeks") return t("backfillPeriodTwoWeeks");
    return t("backfillPeriodCurrentWeek");
  }

  // Helper: get banner info for a global error code
  function getGlobalErrorInfo(code: ErrorCode): { title: string; message: string } | null {
    switch (code) {
      case "BACKFILL_LIMIT_EXCEEDED":
        return {
          title: t("errorBannerBackfillTitle"),
          message: t("errorBannerBackfill", { period: getBackfillPeriodLabel() }),
        };
      case "FUTURE_DATE":
        return {
          title: t("errorBannerFutureDateTitle"),
          message: t("errorBannerFutureDate"),
        };
      case "CONSENT_REQUIRED":
        return {
          title: t("errorBannerConsentTitle"),
          message: t("errorBannerConsent"),
        };
      case "UNAUTHORIZED":
        return {
          title: t("errorBannerUnauthorizedTitle"),
          message: t("errorBannerUnauthorized"),
        };
      default:
        return null;
    }
  }

  // Check if a field error is field-specific (not global)
  function isFieldSpecificError(categoryId: string): boolean {
    const code = fieldErrorCodes[categoryId];
    if (!code) return false;
    return !GLOBAL_ERROR_CODES.has(code);
  }

  // Save status indicator for a field
  function StatusIcon({ categoryId }: { categoryId: string }) {
    const s = fieldStatus[categoryId];
    if (s === "saving") return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />;
    if (s === "saved") return <Check className="h-3 w-3 text-primary shrink-0" />;
    if (s === "error") return <span className="text-[10px] font-bold text-error shrink-0" aria-hidden="true">!</span>;
    return null;
  }

  // Determine effective global error: proactive warnings take priority, then server errors
  const effectiveGlobalError: ErrorCode | null = proactiveBackfillWarning
    ? "BACKFILL_LIMIT_EXCEEDED"
    : proactiveFutureDateWarning
      ? "FUTURE_DATE"
      : globalError;

  const globalErrorInfo = effectiveGlobalError ? getGlobalErrorInfo(effectiveGlobalError) : null;
  const showGlobalBanner = globalErrorInfo && !globalErrorDismissed;

  // For proactive warnings, use a special message
  const proactiveMessage = proactiveBackfillWarning
    ? t("errorBannerBackfillProactive", { period: getBackfillPeriodLabel() })
    : null;

  return (
    <div className="space-y-4">
      {/* Global error banner */}
      {showGlobalBanner && (
        <AlertExtended
          variant="error"
          title={globalErrorInfo.title}
          onDismiss={() => setGlobalErrorDismissed(true)}
        >
          {proactiveMessage ?? globalErrorInfo.message}
        </AlertExtended>
      )}

      {/* Number fields — compact inline strips in a shared card */}
      {numberCategories.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden divide-y divide-border/30">
          {numberCategories.map((cat) => {
            const name = locale === "en" ? cat.name.en : cat.name.de;
            const val = values[cat.id];
            const needsDecimals = cat.unit === "kg";
            const inputStep = needsDecimals ? 0.1 : 1;
            const hasError = fieldStatus[cat.id] === "error";
            const showFieldError = hasError && isFieldSpecificError(cat.id);

            return (
              <div key={cat.id} className="px-4 py-3 transition-colors focus-within:bg-muted/30">
                <div className={cn(
                  "flex items-center justify-between",
                  hasError && "rounded-md"
                )}>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={cn(
                      "text-sm font-medium",
                      hasError ? "text-error" : "text-muted-foreground"
                    )}>{name}</span>
                    <StatusIcon categoryId={cat.id} />
                  </div>
                  <NumberInput
                    inline
                    unit={cat.unit}
                    value={val?.numericValue ?? null}
                    onChange={(v) => setFieldValue(cat.id, v, null, "blur")}
                    onBlur={() => handleBlurSave(cat.id)}
                    min={cat.minValue ?? undefined}
                    max={cat.maxValue ?? undefined}
                    step={inputStep}
                    hasError={hasError}
                  />
                </div>
                {showFieldError && (
                  <p className="text-[11px] text-error mt-1" role="alert">
                    {t("errorFieldSaveFailed")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Scale fields — dropdowns, 2-col grid on md+ */}
      {scaleCategories.length > 0 && (
      <div className={cn(
        scaleCategories.length > 1 ? "grid gap-4 md:grid-cols-2" : "space-y-4"
      )}>
      {scaleCategories.map((cat) => {
        const name = locale === "en" ? cat.name.en : cat.name.de;
        const val = values[cat.id];
        const hasError = fieldStatus[cat.id] === "error";
        const showFieldError = hasError && isFieldSpecificError(cat.id);
        const minVal = cat.minValue ?? 1;
        const maxVal = cat.maxValue ?? 5;
        const stepCount = maxVal - minVal + 1;
        const steps = Array.from({ length: stepCount }, (_, i) => minVal + i);
        const getStepLabel = (step: number): string | null => {
          if (!cat.scaleLabels) return null;
          const label = cat.scaleLabels[String(step)];
          if (!label) return null;
          return locale === "en" ? label.en : label.de;
        };

        return (
          <div key={cat.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className={cn(
                "text-label",
                hasError ? "text-error" : "text-foreground"
              )}>{name}</Label>
              <StatusIcon categoryId={cat.id} />
            </div>
            <Select
              value={val?.numericValue != null ? String(val.numericValue) : "__none__"}
              onValueChange={(v) => {
                if (v === "__none__") {
                  setFieldValue(cat.id, null, null, "immediate");
                } else {
                  const numVal = parseInt(v, 10);
                  setFieldValue(cat.id, numVal, null, "immediate");
                }
              }}
            >
              <SelectTrigger
                className={hasError ? "border-error focus-visible:ring-error" : undefined}
                aria-label={name}
                aria-invalid={hasError || undefined}
              >
                <SelectValue placeholder={t("selectValue")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-muted-foreground">
                  {t("noSelection")}
                </SelectItem>
                {steps.map((step) => {
                  const label = getStepLabel(step);
                  return (
                    <SelectItem key={step} value={String(step)}>
                      {label ? `${step} — ${label}` : String(step)}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {showFieldError && (
              <p className="text-[11px] text-error" role="alert">
                {t("errorFieldSaveFailed")}
              </p>
            )}
          </div>
        );
      })}
      </div>
      )}

      {/* Text fields */}
      {textCategories.map((cat) => {
        const name = locale === "en" ? cat.name.en : cat.name.de;
        const val = values[cat.id];
        const hasError = fieldStatus[cat.id] === "error";
        const showFieldError = hasError && isFieldSpecificError(cat.id);

        return (
          <div key={cat.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className={cn(
                "text-label",
                hasError ? "text-error" : "text-foreground"
              )}>{name}</Label>
              <StatusIcon categoryId={cat.id} />
            </div>
            <Textarea
                value={val?.textValue ?? ""}
                onChange={(e) =>
                  setFieldValue(cat.id, null, e.target.value, "debounce")
                }
                onBlur={() => handleBlurSave(cat.id)}
                maxLength={cat.maxValue ?? 300}
                rows={3}
                placeholder={t("notePlaceholder")}
                className={hasError ? "border-error focus-visible:ring-error" : undefined}
                aria-invalid={hasError || undefined}
              />
              {showFieldError && (
                <p className="text-[11px] text-error" role="alert">
                  {t("errorFieldSaveFailed")}
                </p>
              )}
              {val?.textValue && (
                <p className="text-[11px] text-muted-foreground text-right">
                  {val.textValue.length}/{cat.maxValue ?? 300}
                </p>
              )}
            </div>
          );
      })}

      {/* Manage categories button */}
      {onManageCategories && (
        <div className="pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onManageCategories}
            iconLeft={<Settings2 className="h-4 w-4" />}
          >
            {t("manageCategories")}
          </Button>
        </div>
      )}
    </div>
  );
}
