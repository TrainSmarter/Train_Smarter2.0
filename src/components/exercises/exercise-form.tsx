"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, AlertTriangle, Sparkles, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TaxonomyMultiSelect } from "./taxonomy-multi-select";
import {
  createExercise,
  updateExercise,
  suggestExerciseDetails,
  optimizeExerciseField,
} from "@/lib/exercises/actions";
import type {
  ExerciseWithTaxonomy,
  TaxonomyEntry,
  ExerciseType,
  TaxonomyType,
} from "@/lib/exercises/types";
import type { AiUsageData } from "@/lib/ai/usage-types";

// Form schema (matches the server schemas but for the form)
const exerciseFormSchema = z.object({
  nameDe: z.string().min(1).max(100),
  nameEn: z.string().min(1).max(100),
  descriptionDe: z.string().max(2000),
  descriptionEn: z.string().max(2000),
  exerciseType: z.enum(["strength", "endurance", "speed", "flexibility"]),
  primaryMuscleGroupIds: z.array(z.string()),
  secondaryMuscleGroupIds: z.array(z.string()),
  equipmentIds: z.array(z.string()),
});

type ExerciseFormValues = z.infer<typeof exerciseFormSchema>;

/** Field names that support single-field AI optimization */
type OptimizableField = "name_de" | "name_en" | "description_de" | "description_en";

/** Maps form field names to server action field names */
const FIELD_MAP: Record<string, OptimizableField> = {
  nameDe: "name_de",
  nameEn: "name_en",
  descriptionDe: "description_de",
  descriptionEn: "description_en",
};

interface ExerciseFormProps {
  /** Existing exercise (for edit mode) */
  exercise?: ExerciseWithTaxonomy | null;
  /** All available muscle groups */
  muscleGroups: TaxonomyEntry[];
  /** All available equipment */
  equipment: TaxonomyEntry[];
  /** All exercises (for duplicate checking) */
  allExercises: ExerciseWithTaxonomy[];
  /** Callback when form is saved successfully */
  onSuccess: () => void;
  /** Callback to cancel editing */
  onCancel: () => void;
  /** Callback when a taxonomy entry is created */
  onTaxonomyCreated: (entry: { name: { de: string; en: string }; type: TaxonomyType }) => void;
  /** If true, show the AI autofill + single-field buttons */
  showAiSuggest?: boolean;
  /** AI usage data for displaying quota (null if not available) */
  usageData?: AiUsageData | null;
}

export function ExerciseForm({
  exercise,
  muscleGroups,
  equipment,
  allExercises,
  onSuccess,
  onCancel,
  onTaxonomyCreated,
  showAiSuggest = false,
  usageData: initialUsageData = null,
}: ExerciseFormProps) {
  const t = useTranslations("exercises");
  const tCommon = useTranslations("common");
  const locale = useLocale() as "de" | "en";
  const [isSaving, setIsSaving] = React.useState(false);
  const [isAiLoading, setIsAiLoading] = React.useState(false);
  const [highlightedFields, setHighlightedFields] = React.useState<Set<string>>(new Set());

  // Track AI usage client-side (updated after each call)
  const [usageData, setUsageData] = React.useState<AiUsageData | null>(initialUsageData);

  // Single-field optimization state
  const [optimizingField, setOptimizingField] = React.useState<string | null>(null);
  // Undo state: stores previous values before AI optimization
  const [undoValues, setUndoValues] = React.useState<Map<string, string>>(new Map());

  const isEditMode = !!exercise;

  const form = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseFormSchema),
    defaultValues: {
      nameDe: exercise?.name.de ?? "",
      nameEn: exercise?.name.en ?? "",
      descriptionDe: exercise?.description?.de ?? "",
      descriptionEn: exercise?.description?.en ?? "",
      exerciseType: exercise?.exerciseType ?? "strength",
      primaryMuscleGroupIds: exercise?.primaryMuscleGroups.map((mg) => mg.id) ?? [],
      secondaryMuscleGroupIds: exercise?.secondaryMuscleGroups.map((mg) => mg.id) ?? [],
      equipmentIds: exercise?.equipment.map((eq) => eq.id) ?? [],
    },
  });

  const watchNameDe = form.watch("nameDe");
  const watchNameEn = form.watch("nameEn");

  // Check for duplicate names
  const hasDuplicate = React.useMemo(() => {
    if (!watchNameDe && !watchNameEn) return false;
    return allExercises.some((ex) => {
      if (exercise && ex.id === exercise.id) return false;
      if (ex.scope !== "trainer") return false;
      return (
        (watchNameDe && ex.name.de.toLowerCase() === watchNameDe.toLowerCase()) ||
        (watchNameEn && ex.name.en.toLowerCase() === watchNameEn.toLowerCase())
      );
    });
  }, [watchNameDe, watchNameEn, allExercises, exercise]);

  // Derived: is the rate limit reached?
  const isRateLimited = usageData
    ? !usageData.isUnlimited && usageData.used >= usageData.limit
    : false;

  // Format the period end date for display
  const resetDateFormatted = React.useMemo(() => {
    if (!usageData?.periodEnd) return "";
    return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(usageData.periodEnd));
  }, [usageData?.periodEnd, locale]);

  /** Increment local usage count after a successful AI call */
  function incrementUsage() {
    setUsageData((prev) => {
      if (!prev) return prev;
      return { ...prev, used: prev.used + 1 };
    });
  }

  // AI autofill handler
  async function handleAiSuggest() {
    const currentNameDe = form.getValues("nameDe");
    const currentNameEn = form.getValues("nameEn");
    const nameForAi = locale === "de" ? currentNameDe : currentNameEn;

    if (!nameForAi?.trim()) {
      toast.error(t("aiSuggestNoName"));
      return;
    }

    setIsAiLoading(true);
    try {
      const result = await suggestExerciseDetails(nameForAi.trim(), locale);
      if (!result.success || !result.data) {
        // Handle specific error types
        if (result.error === "RATE_LIMIT_EXCEEDED") {
          toast.error(t("aiRateLimitExceeded"));
        } else if (result.error === "API_KEY_NOT_CONFIGURED" || result.error === "PROVIDER_NOT_AVAILABLE") {
          toast.error(t("aiServiceUnavailable"));
        } else {
          toast.error(t("aiSuggestError"));
        }
        return;
      }

      const suggestion = result.data;
      const filled = new Set<string>();

      // Only fill empty fields — never overwrite user input
      if (locale === "de" && !form.getValues("nameEn") && suggestion.nameTranslation) {
        form.setValue("nameEn", suggestion.nameTranslation);
        filled.add("nameEn");
      }
      if (locale === "en" && !form.getValues("nameDe") && suggestion.nameTranslation) {
        form.setValue("nameDe", suggestion.nameTranslation);
        filled.add("nameDe");
      }
      if (!form.getValues("descriptionDe") && suggestion.descriptionDe) {
        form.setValue("descriptionDe", suggestion.descriptionDe);
        filled.add("descriptionDe");
      }
      if (!form.getValues("descriptionEn") && suggestion.descriptionEn) {
        form.setValue("descriptionEn", suggestion.descriptionEn);
        filled.add("descriptionEn");
      }
      const currentType = form.getValues("exerciseType");
      if ((!currentType || currentType === "strength") && suggestion.exerciseType && suggestion.exerciseType !== currentType) {
        form.setValue("exerciseType", suggestion.exerciseType as ExerciseType);
        filled.add("exerciseType");
      }
      if (form.getValues("primaryMuscleGroupIds").length === 0 && suggestion.primaryMuscleGroupIds.length > 0) {
        form.setValue("primaryMuscleGroupIds", suggestion.primaryMuscleGroupIds);
        filled.add("primaryMuscleGroupIds");
      }
      if (form.getValues("secondaryMuscleGroupIds").length === 0 && suggestion.secondaryMuscleGroupIds.length > 0) {
        form.setValue("secondaryMuscleGroupIds", suggestion.secondaryMuscleGroupIds);
        filled.add("secondaryMuscleGroupIds");
      }
      if (form.getValues("equipmentIds").length === 0 && suggestion.equipmentIds.length > 0) {
        form.setValue("equipmentIds", suggestion.equipmentIds);
        filled.add("equipmentIds");
      }

      // Show highlight animation for 1 second
      setHighlightedFields(filled);
      setTimeout(() => setHighlightedFields(new Set()), 1000);

      incrementUsage();
      toast.success(t("aiSuggestSuccess"));
    } catch {
      toast.error(t("aiSuggestError"));
    } finally {
      setIsAiLoading(false);
    }
  }

  // Single-field optimization handler
  async function handleOptimizeField(formFieldName: string) {
    const serverFieldName = FIELD_MAP[formFieldName];
    if (!serverFieldName) return;

    const exerciseName = form.getValues("nameDe") || form.getValues("nameEn");
    if (!exerciseName?.trim()) {
      toast.error(t("aiSuggestNoName"));
      return;
    }

    const currentValue = form.getValues(formFieldName as keyof ExerciseFormValues) as string;

    setOptimizingField(formFieldName);
    try {
      const result = await optimizeExerciseField(
        serverFieldName,
        currentValue || "",
        exerciseName.trim(),
        locale
      );

      if (!result.success || !result.data) {
        if (result.error === "RATE_LIMIT_EXCEEDED") {
          toast.error(t("aiRateLimitExceeded"));
        } else if (result.error === "API_KEY_NOT_CONFIGURED" || result.error === "PROVIDER_NOT_AVAILABLE") {
          toast.error(t("aiServiceUnavailable"));
        } else {
          toast.error(t("aiOptimizeError"));
        }
        return;
      }

      // Store current value for undo (before overwriting)
      setUndoValues((prev) => new Map(prev).set(formFieldName, currentValue));

      // Set the optimized value
      form.setValue(formFieldName as keyof ExerciseFormValues, result.data as never);

      // Highlight the field
      setHighlightedFields(new Set([formFieldName]));
      setTimeout(() => setHighlightedFields(new Set()), 1000);

      incrementUsage();
      toast.success(t("aiOptimizeSuccess"));
    } catch {
      toast.error(t("aiOptimizeError"));
    } finally {
      setOptimizingField(null);
    }
  }

  // Undo a single-field optimization
  function handleUndo(formFieldName: string) {
    const previousValue = undoValues.get(formFieldName);
    if (previousValue !== undefined) {
      form.setValue(formFieldName as keyof ExerciseFormValues, previousValue as never);
      setUndoValues((prev) => {
        const next = new Map(prev);
        next.delete(formFieldName);
        return next;
      });
    }
  }

  async function onSubmit(values: ExerciseFormValues) {
    setIsSaving(true);
    // Clear undo state on save
    setUndoValues(new Map());
    try {
      const payload = {
        name: { de: values.nameDe, en: values.nameEn },
        description: values.descriptionDe || values.descriptionEn
          ? { de: values.descriptionDe || "", en: values.descriptionEn || "" }
          : null,
        exerciseType: values.exerciseType,
        primaryMuscleGroupIds: values.primaryMuscleGroupIds,
        secondaryMuscleGroupIds: values.secondaryMuscleGroupIds,
        equipmentIds: values.equipmentIds,
      };

      let result;
      if (isEditMode && exercise) {
        result = await updateExercise({ id: exercise.id, ...payload });
      } else {
        result = await createExercise(payload);
      }

      if (result.success) {
        toast.success(t("saveSuccess"));
        onSuccess();
      } else {
        toast.error(t("errorGeneric"));
      }
    } catch {
      toast.error(t("errorGeneric"));
    } finally {
      setIsSaving(false);
    }
  }

  /** Returns a ring class if the field was just AI-filled */
  function aiHighlight(field: string) {
    return highlightedFields.has(field)
      ? "ring-2 ring-secondary/60 transition-all duration-500"
      : "";
  }

  // Show AI button when showAiSuggest is true and at least one name field is filled
  const canShowAiButton = showAiSuggest && (!!watchNameDe || !!watchNameEn);
  // Disable AI button if rate limited
  const isAiButtonDisabled = !canShowAiButton || isAiLoading || isSaving || isRateLimited;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      {/* AI Suggest Toolbar */}
      {showAiSuggest && (
        <div className="space-y-2">
          <div className="flex items-center gap-3 rounded-md border border-secondary/30 bg-secondary/5 p-3">
            <Sparkles className="h-5 w-5 shrink-0 text-secondary" />
            <p className="flex-1 text-sm text-muted-foreground">
              {isAiLoading ? t("aiSuggestLoading") : t("aiSuggest")}
            </p>
            {isRateLimited ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        {t("aiSuggest")}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    {t("aiLimitReached", {
                      limit: usageData?.limit ?? 0,
                      resetDate: resetDateFormatted,
                    })}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isAiButtonDisabled}
                onClick={handleAiSuggest}
              >
                {isAiLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {t("aiSuggest")}
              </Button>
            )}
          </div>

          {/* Usage counter */}
          {usageData && (
            <p className="text-xs text-muted-foreground pl-1">
              {usageData.isUnlimited
                ? t("aiUsageUnlimited")
                : t("aiUsageCount", {
                    used: usageData.used,
                    limit: usageData.limit,
                  })}
            </p>
          )}
        </div>
      )}

      {/* Name DE */}
      <div className="space-y-1.5">
        <Label htmlFor="nameDe">{t("nameDe")} *</Label>
        <div className="flex items-center gap-1.5">
          <Input
            id="nameDe"
            {...form.register("nameDe")}
            maxLength={100}
            aria-invalid={!!form.formState.errors.nameDe}
            className={`flex-1 ${aiHighlight("nameDe")}`}
          />
          {showAiSuggest && (
            <FieldAiActions
              fieldName="nameDe"
              isOptimizing={optimizingField === "nameDe"}
              isDisabled={isAiLoading || isSaving || isRateLimited || !canShowAiButton}
              hasUndo={undoValues.has("nameDe")}
              onOptimize={() => handleOptimizeField("nameDe")}
              onUndo={() => handleUndo("nameDe")}
              optimizeLabel={t("aiOptimize")}
              undoLabel={t("aiOptimizeUndo")}
              rateLimitedTooltip={
                isRateLimited
                  ? t("aiLimitReached", {
                      limit: usageData?.limit ?? 0,
                      resetDate: resetDateFormatted,
                    })
                  : undefined
              }
            />
          )}
        </div>
        {form.formState.errors.nameDe && (
          <p className="text-caption text-error">{form.formState.errors.nameDe.message}</p>
        )}
      </div>

      {/* Name EN */}
      <div className="space-y-1.5">
        <Label htmlFor="nameEn">{t("nameEn")} *</Label>
        <div className="flex items-center gap-1.5">
          <Input
            id="nameEn"
            {...form.register("nameEn")}
            maxLength={100}
            aria-invalid={!!form.formState.errors.nameEn}
            className={`flex-1 ${aiHighlight("nameEn")}`}
          />
          {showAiSuggest && (
            <FieldAiActions
              fieldName="nameEn"
              isOptimizing={optimizingField === "nameEn"}
              isDisabled={isAiLoading || isSaving || isRateLimited || !canShowAiButton}
              hasUndo={undoValues.has("nameEn")}
              onOptimize={() => handleOptimizeField("nameEn")}
              onUndo={() => handleUndo("nameEn")}
              optimizeLabel={t("aiOptimize")}
              undoLabel={t("aiOptimizeUndo")}
              rateLimitedTooltip={
                isRateLimited
                  ? t("aiLimitReached", {
                      limit: usageData?.limit ?? 0,
                      resetDate: resetDateFormatted,
                    })
                  : undefined
              }
            />
          )}
        </div>
        {form.formState.errors.nameEn && (
          <p className="text-caption text-error">{form.formState.errors.nameEn.message}</p>
        )}
      </div>

      {/* Duplicate Warning */}
      {hasDuplicate && (
        <div className="flex items-center gap-2 rounded-md border border-warning/50 bg-warning/10 p-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
          <p className="text-sm text-warning-foreground">{t("duplicateWarning")}</p>
        </div>
      )}

      {/* Description DE */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="descriptionDe">{t("descriptionDe")}</Label>
          {showAiSuggest && (
            <FieldAiActions
              fieldName="descriptionDe"
              isOptimizing={optimizingField === "descriptionDe"}
              isDisabled={isAiLoading || isSaving || isRateLimited || !canShowAiButton}
              hasUndo={undoValues.has("descriptionDe")}
              onOptimize={() => handleOptimizeField("descriptionDe")}
              onUndo={() => handleUndo("descriptionDe")}
              optimizeLabel={t("aiOptimize")}
              undoLabel={t("aiOptimizeUndo")}
              rateLimitedTooltip={
                isRateLimited
                  ? t("aiLimitReached", {
                      limit: usageData?.limit ?? 0,
                      resetDate: resetDateFormatted,
                    })
                  : undefined
              }
            />
          )}
        </div>
        <Textarea
          id="descriptionDe"
          {...form.register("descriptionDe")}
          maxLength={2000}
          rows={3}
          className={aiHighlight("descriptionDe")}
        />
      </div>

      {/* Description EN */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="descriptionEn">{t("descriptionEn")}</Label>
          {showAiSuggest && (
            <FieldAiActions
              fieldName="descriptionEn"
              isOptimizing={optimizingField === "descriptionEn"}
              isDisabled={isAiLoading || isSaving || isRateLimited || !canShowAiButton}
              hasUndo={undoValues.has("descriptionEn")}
              onOptimize={() => handleOptimizeField("descriptionEn")}
              onUndo={() => handleUndo("descriptionEn")}
              optimizeLabel={t("aiOptimize")}
              undoLabel={t("aiOptimizeUndo")}
              rateLimitedTooltip={
                isRateLimited
                  ? t("aiLimitReached", {
                      limit: usageData?.limit ?? 0,
                      resetDate: resetDateFormatted,
                    })
                  : undefined
              }
            />
          )}
        </div>
        <Textarea
          id="descriptionEn"
          {...form.register("descriptionEn")}
          maxLength={2000}
          rows={3}
          className={aiHighlight("descriptionEn")}
        />
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label>{t("category")} *</Label>
        <Select
          value={form.watch("exerciseType")}
          onValueChange={(v) => form.setValue("exerciseType", v as ExerciseType)}
        >
          <SelectTrigger aria-label={t("selectCategory")}>
            <SelectValue placeholder={t("selectCategory")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="strength">{t("strength")}</SelectItem>
            <SelectItem value="endurance">{t("endurance")}</SelectItem>
            <SelectItem value="speed">{t("speed")}</SelectItem>
            <SelectItem value="flexibility">{t("flexibility")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Primary Muscle Groups */}
      <div className="space-y-1.5">
        <Label>{t("primaryMuscleGroupsLabel")}</Label>
        <TaxonomyMultiSelect
          entries={muscleGroups}
          selectedIds={form.watch("primaryMuscleGroupIds")}
          onSelectionChange={(ids) => form.setValue("primaryMuscleGroupIds", ids)}
          taxonomyType="muscle_group"
          placeholder={t("selectItems")}
          onEntryCreated={onTaxonomyCreated}
        />
      </div>

      {/* Secondary Muscle Groups */}
      <div className="space-y-1.5">
        <Label>{t("secondaryMuscleGroupsLabel")}</Label>
        <TaxonomyMultiSelect
          entries={muscleGroups}
          selectedIds={form.watch("secondaryMuscleGroupIds")}
          onSelectionChange={(ids) => form.setValue("secondaryMuscleGroupIds", ids)}
          taxonomyType="muscle_group"
          placeholder={t("selectItems")}
          onEntryCreated={onTaxonomyCreated}
        />
      </div>

      {/* Equipment */}
      <div className="space-y-1.5">
        <Label>{t("equipmentLabel")}</Label>
        <TaxonomyMultiSelect
          entries={equipment}
          selectedIds={form.watch("equipmentIds")}
          onSelectionChange={(ids) => form.setValue("equipmentIds", ids)}
          taxonomyType="equipment"
          placeholder={t("selectItems")}
          onEntryCreated={onTaxonomyCreated}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {tCommon("cancel")}
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {tCommon("save")}
        </Button>
      </div>
    </form>
  );
}

// ── Subcomponent: Field AI Actions (Sparkles + Undo buttons) ────────

interface FieldAiActionsProps {
  fieldName: string;
  isOptimizing: boolean;
  isDisabled: boolean;
  hasUndo: boolean;
  onOptimize: () => void;
  onUndo: () => void;
  optimizeLabel: string;
  undoLabel: string;
  rateLimitedTooltip?: string;
}

function FieldAiActions({
  fieldName,
  isOptimizing,
  isDisabled,
  hasUndo,
  onOptimize,
  onUndo,
  optimizeLabel,
  undoLabel,
  rateLimitedTooltip,
}: FieldAiActionsProps) {
  return (
    <div className="flex items-center gap-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-secondary hover:text-secondary hover:bg-secondary/10"
              disabled={isDisabled || isOptimizing}
              onClick={onOptimize}
              aria-label={`${optimizeLabel} ${fieldName}`}
            >
              {isOptimizing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {rateLimitedTooltip ?? optimizeLabel}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {hasUndo && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={onUndo}
                aria-label={`${undoLabel} ${fieldName}`}
              >
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{undoLabel}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
