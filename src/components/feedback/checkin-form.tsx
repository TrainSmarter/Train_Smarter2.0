"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { CalendarDays, Check, Settings2 } from "lucide-react";
import { toast } from "sonner";

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
import { saveCheckin } from "@/lib/feedback/actions";
import type { ActiveCategory } from "@/lib/feedback/types";

interface CheckinFormProps {
  /** Active categories for this athlete */
  categories: ActiveCategory[];
  /** Date for which the check-in is being filled */
  date: string;
  /** Pre-existing values if editing */
  existingValues?: Record<string, { numericValue: number | null; textValue: string | null }>;
  /** Maximum days back allowed for backfill */
  backfillDays: number;
  /** Callback after successful save, receives the saved values */
  onSaved?: (savedValues: Record<string, { numericValue: number | null; textValue: string | null }>) => void;
  /** Link/callback to open category manager */
  onManageCategories?: () => void;
}

export function CheckinForm({
  categories,
  date,
  existingValues,
  backfillDays,
  onSaved,
  onManageCategories,
}: CheckinFormProps) {
  const t = useTranslations("feedback");
  const locale = useLocale();
  const [saving, setSaving] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState(date);
  const [values, setValues] = React.useState<
    Record<string, { numericValue: number | null; textValue: string | null }>
  >(existingValues ?? {});
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const isEditing = !!existingValues;

  // Generate date options for backfill
  const dateOptions = React.useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const today = new Date();
    for (let i = 0; i <= backfillDays; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split("T")[0];
      const label =
        i === 0
          ? t("today")
          : i === 1
            ? t("yesterday")
            : d.toLocaleDateString(locale === "en" ? "en-US" : "de-AT", {
                weekday: "short",
                day: "numeric",
                month: "short",
              });
      options.push({ value: iso, label });
    }
    return options;
  }, [backfillDays, locale, t]);

  function setFieldValue(
    categoryId: string,
    numericValue: number | null,
    textValue: string | null
  ) {
    setValues((prev) => ({
      ...prev,
      [categoryId]: { numericValue, textValue },
    }));
    // Clear error on change
    if (errors[categoryId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[categoryId];
        return next;
      });
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    for (const cat of categories) {
      if (!cat.isActive) continue;
      const val = values[cat.id];

      if (cat.isRequired) {
        if (cat.type === "number" && (val?.numericValue == null)) {
          newErrors[cat.id] = t("errorRequired");
        } else if (cat.type === "scale" && (val?.numericValue == null)) {
          newErrors[cat.id] = t("errorRequired");
        } else if (cat.type === "text" && (!val?.textValue?.trim())) {
          newErrors[cat.id] = t("errorRequired");
        }
      }

      if (cat.type === "number" && val?.numericValue != null) {
        if (cat.minValue != null && val.numericValue < cat.minValue) {
          newErrors[cat.id] = t("errorMin", { min: cat.minValue });
        }
        if (cat.maxValue != null && val.numericValue > cat.maxValue) {
          newErrors[cat.id] = t("errorMax", { max: cat.maxValue });
        }
      }

      if (cat.type === "text" && val?.textValue) {
        if (cat.maxValue != null && val.textValue.length > cat.maxValue) {
          newErrors[cat.id] = t("errorMaxLength", { max: cat.maxValue });
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = Object.entries(values)
        .filter(([, v]) => v.numericValue != null || v.textValue != null)
        .map(([categoryId, v]) => ({
          categoryId,
          numericValue: v.numericValue ?? undefined,
          textValue: v.textValue ?? undefined,
        }));

      const result = await saveCheckin(selectedDate, payload);
      if (result.success) {
        toast.success(t("checkinSaved"));
        onSaved?.(values);
      } else {
        toast.error(t("checkinError"));
      }
    } catch {
      toast.error(t("checkinError"));
    } finally {
      setSaving(false);
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Date selector (for backfill) */}
      <div className="flex items-center gap-3">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <Select value={selectedDate} onValueChange={setSelectedDate}>
          <SelectTrigger className="w-[200px]" aria-label={t("selectDate")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {dateOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Dynamic fields */}
      <div className="space-y-5">
        {activeCategories.map((cat) => {
          const name = locale === "en" ? cat.name.en : cat.name.de;
          const val = values[cat.id];
          const error = errors[cat.id];

          if (cat.type === "number") {
            return (
              <NumberInput
                key={cat.id}
                label={name}
                unit={cat.unit}
                value={val?.numericValue ?? null}
                onChange={(v) => setFieldValue(cat.id, v, null)}
                min={cat.minValue ?? undefined}
                max={cat.maxValue ?? undefined}
                required={cat.isRequired}
                error={error}
                placeholder={
                  cat.minValue != null && cat.maxValue != null
                    ? `${cat.minValue}–${cat.maxValue}`
                    : undefined
                }
              />
            );
          }

          if (cat.type === "scale") {
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
                  min={cat.minValue ?? 1}
                  max={cat.maxValue ?? 5}
                  value={val?.numericValue ?? null}
                  onChange={(v) => setFieldValue(cat.id, v, null)}
                  labels={cat.scaleLabels}
                  ariaLabel={name}
                  hasError={!!error}
                />
                {error && (
                  <p className="text-body-sm text-error" role="alert">
                    {error}
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
                  onChange={(e) => setFieldValue(cat.id, null, e.target.value)}
                  maxLength={cat.maxValue ?? 300}
                  rows={3}
                  placeholder={t("notePlaceholder")}
                  className={error ? "border-error focus-visible:ring-error" : undefined}
                  aria-invalid={!!error || undefined}
                />
                {val?.textValue && (
                  <p className="text-[11px] text-muted-foreground text-right">
                    {val.textValue.length}/{cat.maxValue ?? 300}
                  </p>
                )}
                {error && (
                  <p className="text-body-sm text-error" role="alert">
                    {error}
                  </p>
                )}
              </div>
            );
          }

          return null;
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        {onManageCategories && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onManageCategories}
            iconLeft={<Settings2 className="h-4 w-4" />}
          >
            {t("manageCategories")}
          </Button>
        )}
        <Button
          type="submit"
          loading={saving}
          iconLeft={<Check className="h-4 w-4" />}
          className="ml-auto"
        >
          {isEditing ? t("updateCheckin") : t("saveCheckin")}
        </Button>
      </div>
    </form>
  );
}
