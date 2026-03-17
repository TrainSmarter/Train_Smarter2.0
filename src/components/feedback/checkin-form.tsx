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
import { SegmentedControl } from "./segmented-control";
import { NumberInput } from "./number-input";
import { autosaveCheckinField } from "@/lib/feedback/actions";
import { cn } from "@/lib/utils";
import type { ActiveCategory } from "@/lib/feedback/types";

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
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function CheckinForm({
  categories,
  date,
  existingValues,
  onFieldSaved,
  onManageCategories,
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

  // Debounce timers per field
  const debounceTimers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // Per-field saved indicator timeouts
  const savedTimers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Track the previous date to reset values only when navigating to a different day
  const prevDateRef = React.useRef(date);

  // Reset values only when the date changes (not when existingValues update from autosave)
  React.useEffect(() => {
    if (date !== prevDateRef.current) {
      prevDateRef.current = date;
      setValues(computeInitialValues(existingValues));
      setFieldStatus({});
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
        setFieldStatus((prev) => ({ ...prev, [categoryId]: "error" }));
      }
    } catch {
      setFieldStatus((prev) => ({ ...prev, [categoryId]: "error" }));
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

  // Save status indicator for a field
  function StatusIcon({ categoryId }: { categoryId: string }) {
    const s = fieldStatus[categoryId];
    if (s === "saving") return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />;
    if (s === "saved") return <Check className="h-3 w-3 text-primary shrink-0" />;
    if (s === "error") return <span className="text-[10px] text-error shrink-0">!</span>;
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Number fields — compact inline strips in a shared card */}
      {numberCategories.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden divide-y divide-border/30">
          {numberCategories.map((cat) => {
            const name = locale === "en" ? cat.name.en : cat.name.de;
            const val = values[cat.id];
            const needsDecimals = cat.unit === "kg";
            const inputStep = needsDecimals ? 0.1 : 1;

            return (
              <div key={cat.id} className="flex items-center justify-between px-4 py-3 transition-colors focus-within:bg-muted/30">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-sm font-medium text-muted-foreground">{name}</span>
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
                  hasError={fieldStatus[cat.id] === "error"}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Scale fields — dropdowns */}
      {scaleCategories.map((cat) => {
        const name = locale === "en" ? cat.name.en : cat.name.de;
        const val = values[cat.id];
        const hasError = fieldStatus[cat.id] === "error";
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
              <Label className="text-label text-foreground">{name}</Label>
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
          </div>
        );
      })}

      {/* Text fields */}
      {textCategories.map((cat) => {
        const name = locale === "en" ? cat.name.en : cat.name.de;
        const val = values[cat.id];
        const hasError = fieldStatus[cat.id] === "error";

        return (
          <div key={cat.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-label text-foreground">{name}</Label>
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
