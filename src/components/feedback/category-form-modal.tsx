"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { Plus, Eye } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { SegmentedControl } from "./segmented-control";
import { NumberInput } from "./number-input";
import { createCategory } from "@/lib/feedback/actions";
import type { CategoryType, ScaleStepLabels } from "@/lib/feedback/types";

interface CategoryFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Whether the trainer is creating a category for an athlete */
  isTrainerView?: boolean;
  /** Target athlete ID when trainer creates category */
  targetAthleteId?: string | null;
}

interface ScaleLabelEntry {
  de: string;
  en: string;
}

export function CategoryFormModal({
  open,
  onOpenChange,
  isTrainerView = false,
  targetAthleteId,
}: CategoryFormModalProps) {
  const t = useTranslations("feedback");
  const locale = useLocale();

  // Form state
  const [nameDe, setNameDe] = React.useState("");
  const [nameEn, setNameEn] = React.useState("");
  const [type, setType] = React.useState<CategoryType>("number");
  const [unit, setUnit] = React.useState("");
  const [minValue, setMinValue] = React.useState<number | null>(null);
  const [maxValue, setMaxValue] = React.useState<number | null>(null);
  const [isRequired, setIsRequired] = React.useState(false);
  const [icon, setIcon] = React.useState("");
  const [scaleLabels, setScaleLabels] = React.useState<
    Record<string, ScaleLabelEntry>
  >({});
  const [saving, setSaving] = React.useState(false);

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      setNameDe("");
      setNameEn("");
      setType("number");
      setUnit("");
      setMinValue(null);
      setMaxValue(null);
      setIsRequired(false);
      setIcon("");
      setScaleLabels({});
    }
  }, [open]);

  // Generate scale labels when min/max change for scale type
  React.useEffect(() => {
    if (type === "scale" && minValue != null && maxValue != null && maxValue >= minValue) {
      setScaleLabels((prev) => {
        const next: Record<string, ScaleLabelEntry> = {};
        for (let i = minValue; i <= maxValue; i++) {
          const key = String(i);
          next[key] = prev[key] ?? { de: "", en: "" };
        }
        return next;
      });
    }
  }, [type, minValue, maxValue]);

  function updateScaleLabel(
    step: string,
    lang: "de" | "en",
    value: string
  ) {
    setScaleLabels((prev) => ({
      ...prev,
      [step]: {
        ...prev[step],
        [lang]: value,
      },
    }));
  }

  // Build preview scale labels in the correct format
  const previewScaleLabels: ScaleStepLabels | null =
    type === "scale" && Object.keys(scaleLabels).length > 0
      ? scaleLabels
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!nameDe.trim() || !nameEn.trim()) return;

    setSaving(true);
    try {
      // Filter out empty scale labels
      let finalScaleLabels: Record<string, { de: string; en: string }> | null =
        null;
      if (type === "scale" && Object.keys(scaleLabels).length > 0) {
        const nonEmpty = Object.entries(scaleLabels).filter(
          ([, v]) => v.de.trim() || v.en.trim()
        );
        if (nonEmpty.length > 0) {
          finalScaleLabels = Object.fromEntries(nonEmpty);
        }
      }

      const result = await createCategory({
        name: { de: nameDe.trim(), en: nameEn.trim() },
        type,
        unit: type === "number" && unit.trim() ? unit.trim() : null,
        minValue: minValue,
        maxValue: maxValue,
        scaleLabels: finalScaleLabels,
        isRequired,
        icon: icon.trim() || null,
        targetAthleteId: isTrainerView ? targetAthleteId : null,
      });

      if (result.success) {
        toast.success(t("categoryCreated"));
        onOpenChange(false);
      } else {
        toast.error(t("categoryCreateError"));
      }
    } catch {
      toast.error(t("categoryCreateError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {t("createCategory")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name DE + EN */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cat-name-de">{t("categoryNameDe")}</Label>
              <Input
                id="cat-name-de"
                value={nameDe}
                onChange={(e) => setNameDe(e.target.value)}
                placeholder={t("categoryNameDePlaceholder")}
                required
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-name-en">{t("categoryNameEn")}</Label>
              <Input
                id="cat-name-en"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder={t("categoryNameEnPlaceholder")}
                required
                maxLength={100}
              />
            </div>
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label>{t("categoryType")}</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as CategoryType)}
            >
              <SelectTrigger aria-label={t("categoryType")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="number">{t("typeNumber")}</SelectItem>
                <SelectItem value="scale">{t("typeScale")}</SelectItem>
                <SelectItem value="text">{t("typeText")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Unit — only for number type */}
          {type === "number" && (
            <div className="space-y-2">
              <Label htmlFor="cat-unit">{t("categoryUnit")}</Label>
              <Input
                id="cat-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder={t("categoryUnitPlaceholder")}
                maxLength={20}
              />
            </div>
          )}

          {/* Min/Max */}
          {(type === "number" || type === "scale") && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cat-min">
                  {type === "scale" ? t("categoryMinSteps") : t("categoryMin")}
                </Label>
                <Input
                  id="cat-min"
                  type="number"
                  value={minValue ?? ""}
                  onChange={(e) =>
                    setMinValue(
                      e.target.value === "" ? null : Number(e.target.value)
                    )
                  }
                  placeholder={type === "scale" ? "1" : "0"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-max">
                  {type === "scale" ? t("categoryMaxSteps") : t("categoryMax")}
                </Label>
                <Input
                  id="cat-max"
                  type="number"
                  value={maxValue ?? ""}
                  onChange={(e) =>
                    setMaxValue(
                      e.target.value === "" ? null : Number(e.target.value)
                    )
                  }
                  placeholder={type === "scale" ? "5" : "100"}
                />
              </div>
            </div>
          )}

          {/* Scale labels */}
          {type === "scale" &&
            minValue != null &&
            maxValue != null &&
            maxValue >= minValue && (
              <div className="space-y-3">
                <Label>{t("categoryScaleLabels")}</Label>
                <div className="space-y-2">
                  {Object.keys(scaleLabels).map((step) => (
                    <div
                      key={step}
                      className="grid grid-cols-[3rem_1fr_1fr] gap-2 items-center"
                    >
                      <span className="text-sm font-medium text-center text-muted-foreground">
                        {step}
                      </span>
                      <Input
                        value={scaleLabels[step]?.de ?? ""}
                        onChange={(e) =>
                          updateScaleLabel(step, "de", e.target.value)
                        }
                        placeholder={`DE: ${t("categoryScaleLabelPlaceholder")}`}
                        maxLength={50}
                      />
                      <Input
                        value={scaleLabels[step]?.en ?? ""}
                        onChange={(e) =>
                          updateScaleLabel(step, "en", e.target.value)
                        }
                        placeholder={`EN: ${t("categoryScaleLabelPlaceholder")}`}
                        maxLength={50}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Required + Icon */}
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="cat-required"
                checked={isRequired}
                onCheckedChange={(checked) =>
                  setIsRequired(checked === true)
                }
              />
              <Label htmlFor="cat-required" className="text-sm">
                {t("categoryRequired")}
              </Label>
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Label htmlFor="cat-icon" className="text-sm shrink-0">
                {t("categoryIcon")}
              </Label>
              <Input
                id="cat-icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder={t("categoryIconPlaceholder")}
                maxLength={50}
                className="max-w-[180px]"
              />
            </div>
          </div>

          {/* Live Preview */}
          <Separator />
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Eye className="h-4 w-4" />
              {t("categoryPreview")}
            </h4>
            <div className="rounded-lg border bg-muted/30 p-4">
              {(nameDe || nameEn) ? (
                <CategoryPreview
                  name={locale === "en" ? (nameEn || nameDe) : (nameDe || nameEn)}
                  type={type}
                  unit={type === "number" && unit ? unit : null}
                  min={minValue}
                  max={maxValue}
                  scaleLabels={previewScaleLabels}
                  isRequired={isRequired}
                  t={t}
                />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  {t("categoryPreviewEmpty")}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              loading={saving}
              disabled={!nameDe.trim() || !nameEn.trim()}
              iconLeft={<Plus className="h-4 w-4" />}
            >
              {t("createCategory")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Live Preview                                                        */
/* ------------------------------------------------------------------ */

interface CategoryPreviewProps {
  name: string;
  type: CategoryType;
  unit: string | null;
  min: number | null;
  max: number | null;
  scaleLabels: ScaleStepLabels | null;
  isRequired: boolean;
  t: ReturnType<typeof useTranslations<"feedback">>;
}

function CategoryPreview({
  name,
  type,
  unit,
  min,
  max,
  scaleLabels,
  isRequired,
  t,
}: CategoryPreviewProps) {
  const [previewNumeric, setPreviewNumeric] = React.useState<number | null>(
    null
  );
  const [previewScale, setPreviewScale] = React.useState<number | null>(null);
  const [previewText, setPreviewText] = React.useState("");

  if (type === "number") {
    return (
      <NumberInput
        label={name}
        unit={unit}
        value={previewNumeric}
        onChange={setPreviewNumeric}
        min={min ?? undefined}
        max={max ?? undefined}
        required={isRequired}
        placeholder={
          min != null && max != null ? `${min}–${max}` : undefined
        }
      />
    );
  }

  if (type === "scale") {
    return (
      <div className="space-y-2">
        <Label className="text-label text-foreground">
          {name}
          {isRequired && (
            <span className="ml-1 text-error" aria-hidden="true">
              *
            </span>
          )}
        </Label>
        <SegmentedControl
          min={min ?? 1}
          max={max ?? 5}
          value={previewScale}
          onChange={setPreviewScale}
          labels={scaleLabels}
          ariaLabel={name}
        />
      </div>
    );
  }

  if (type === "text") {
    return (
      <div className="space-y-2">
        <Label className="text-label text-foreground">
          {name}
          {isRequired && (
            <span className="ml-1 text-error" aria-hidden="true">
              *
            </span>
          )}
        </Label>
        <Textarea
          value={previewText}
          onChange={(e) => setPreviewText(e.target.value)}
          maxLength={max ?? 300}
          rows={3}
          placeholder={t("notePlaceholder")}
        />
      </div>
    );
  }

  return null;
}
