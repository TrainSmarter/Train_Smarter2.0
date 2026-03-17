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
  const [values, setValues] = React.useState<
    Record<string, { numericValue: number | null; textValue: string | null }>
  >(existingValues ?? {});
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>("idle");
  const [errorFields, setErrorFields] = React.useState<Set<string>>(new Set());

  // Debounce timers per field
  const debounceTimers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // Track saving count for global status
  const savingCount = React.useRef(0);
  // Saved indicator timeout
  const savedTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset values when date or existingValues change
  React.useEffect(() => {
    setValues(existingValues ?? {});
    setSaveStatus("idle");
    setErrorFields(new Set());
  }, [date, existingValues]);

  // Cleanup timers on unmount
  React.useEffect(() => {
    return () => {
      for (const timer of Object.values(debounceTimers.current)) {
        clearTimeout(timer);
      }
      if (savedTimeout.current) {
        clearTimeout(savedTimeout.current);
      }
    };
  }, []);

  async function doSave(
    categoryId: string,
    numericValue: number | null,
    textValue: string | null
  ) {
    savingCount.current += 1;
    setSaveStatus("saving");

    // Clear any existing saved timeout
    if (savedTimeout.current) {
      clearTimeout(savedTimeout.current);
      savedTimeout.current = null;
    }

    try {
      const result = await autosaveCheckinField(date, categoryId, numericValue, textValue);
      savingCount.current -= 1;

      if (result.success) {
        // Remove from error fields if it was there
        setErrorFields((prev) => {
          const next = new Set(prev);
          next.delete(categoryId);
          return next;
        });
        onFieldSaved?.(categoryId, numericValue, textValue);

        if (savingCount.current === 0) {
          setSaveStatus("saved");
          savedTimeout.current = setTimeout(() => {
            setSaveStatus("idle");
          }, 3000);
        }
      } else {
        if (savingCount.current === 0) {
          setSaveStatus("error");
        }
        setErrorFields((prev) => new Set(prev).add(categoryId));
      }
    } catch {
      savingCount.current -= 1;
      if (savingCount.current === 0) {
        setSaveStatus("error");
      }
      setErrorFields((prev) => new Set(prev).add(categoryId));
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

  return (
    <div className="space-y-6">
      {/* Save status indicator */}
      <div className="flex items-center gap-1.5 h-5">
        {saveStatus === "saving" && (
          <>
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{t("saving")}</span>
          </>
        )}
        {saveStatus === "saved" && (
          <>
            <Check className="h-3 w-3 text-success" />
            <span className="text-xs text-muted-foreground">{t("allChangesSaved")}</span>
          </>
        )}
        {saveStatus === "error" && (
          <span className="text-xs text-error">{t("saveFailed")}</span>
        )}
      </div>

      {/* Dynamic fields */}
      <div className="space-y-5">
        {activeCategories.map((cat) => {
          const name = locale === "en" ? cat.name.en : cat.name.de;
          const val = values[cat.id];
          const hasError = errorFields.has(cat.id);

          if (cat.type === "number") {
            return (
              <NumberInput
                key={cat.id}
                label={name}
                unit={cat.unit}
                value={val?.numericValue ?? null}
                onChange={(v) => setFieldValue(cat.id, v, null, "blur")}
                onBlur={() => handleBlurSave(cat.id)}
                min={cat.minValue ?? undefined}
                max={cat.maxValue ?? undefined}
                required={cat.isRequired}
                error={hasError ? t("saveFailed") : undefined}
                placeholder={
                  cat.minValue != null && cat.maxValue != null
                    ? `${cat.minValue}–${cat.maxValue}`
                    : undefined
                }
              />
            );
          }

          if (cat.type === "scale") {
            const minVal = cat.minValue ?? 1;
            const maxVal = cat.maxValue ?? 5;
            const stepCount = maxVal - minVal + 1;

            // 2 steps: use SegmentedControl, 3+ steps: use Select dropdown
            if (stepCount <= 2) {
              return (
                <div key={cat.id} className="space-y-2">
                  <Label className="text-label text-foreground">
                    {name}
                    {cat.isRequired && (
                      <span className="ml-1 text-error" aria-hidden="true">
                        *
                      </span>
                    )}
                  </Label>
                  <SegmentedControl
                    min={minVal}
                    max={maxVal}
                    value={val?.numericValue ?? null}
                    onChange={(v) => setFieldValue(cat.id, v, null, "immediate")}
                    labels={cat.scaleLabels}
                    ariaLabel={name}
                    hasError={hasError}
                  />
                  {hasError && (
                    <p className="text-body-sm text-error" role="alert">
                      {t("saveFailed")}
                    </p>
                  )}
                </div>
              );
            }

            // 3+ steps: use Select dropdown
            const steps = Array.from({ length: stepCount }, (_, i) => minVal + i);
            const getStepLabel = (step: number): string | null => {
              if (!cat.scaleLabels) return null;
              const label = cat.scaleLabels[String(step)];
              if (!label) return null;
              return locale === "en" ? label.en : label.de;
            };

            const selectedStepLabel = val?.numericValue != null
              ? (() => {
                  const label = getStepLabel(val.numericValue);
                  return label
                    ? `${val.numericValue} — ${label}`
                    : String(val.numericValue);
                })()
              : undefined;

            return (
              <div key={cat.id} className="space-y-2">
                <Label className="text-label text-foreground">
                  {name}
                  {cat.isRequired && (
                    <span className="ml-1 text-error" aria-hidden="true">
                      *
                    </span>
                  )}
                </Label>
                <Select
                  value={val?.numericValue != null ? String(val.numericValue) : undefined}
                  onValueChange={(v) => {
                    const numVal = parseInt(v, 10);
                    setFieldValue(cat.id, numVal, null, "immediate");
                  }}
                >
                  <SelectTrigger
                    className={hasError ? "border-error focus-visible:ring-error" : undefined}
                    aria-label={name}
                  >
                    <SelectValue placeholder={t("selectValue")}>
                      {selectedStepLabel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
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
                {hasError && (
                  <p className="text-body-sm text-error" role="alert">
                    {t("saveFailed")}
                  </p>
                )}
              </div>
            );
          }

          if (cat.type === "text") {
            return (
              <div key={cat.id} className="space-y-2">
                <Label className="text-label text-foreground">
                  {name}
                  {cat.isRequired && (
                    <span className="ml-1 text-error" aria-hidden="true">
                      *
                    </span>
                  )}
                </Label>
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
                {hasError && (
                  <p className="text-body-sm text-error" role="alert">
                    {t("saveFailed")}
                  </p>
                )}
              </div>
            );
          }

          return null;
        })}
      </div>

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
