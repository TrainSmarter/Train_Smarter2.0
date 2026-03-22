"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useTypedLocale } from "@/hooks/use-typed-locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2,
  AlertTriangle,
  Sparkles,
  Undo2,
  Type,
  FileText,
  Tags,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import { HierarchicalMultiSelect } from "@/components/taxonomy/hierarchical-multi-select";
import {
  createExercise,
  updateExercise,
  suggestExerciseDetails,
  optimizeExerciseField,
} from "@/lib/exercises/actions";
import type {
  ExerciseWithTaxonomy,
  ExerciseWithCategories,
  TaxonomyEntry,
  ExerciseType,
  TaxonomyType,
} from "@/lib/exercises/types";
import type { CategoryDimension, CategoryNode, DimensionWithNodes } from "@/lib/taxonomy/types";
import type { AiUsageData } from "@/lib/ai/usage-types";

// Form schema (matches the server schemas but for the form)
const exerciseFormSchema = z.object({
  nameDe: z.string().min(1, { message: "required" }).max(100),
  nameEn: z.string().min(1, { message: "required" }).max(100),
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

/** Form field names that can be AI-optimized (text fields only) */
type OptimizableFormField = "nameDe" | "nameEn" | "descriptionDe" | "descriptionEn";

/** Maps form field names to server action field names */
const FIELD_MAP: Record<OptimizableFormField, OptimizableField> = {
  nameDe: "name_de",
  nameEn: "name_en",
  descriptionDe: "description_de",
  descriptionEn: "description_en",
};

/** Type guard to check if a string is an optimizable form field */
function isOptimizableFormField(field: string): field is OptimizableFormField {
  return field in FIELD_MAP;
}

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
  /** PROJ-20: Taxonomy dimensions with nodes for hierarchical selectors */
  taxonomyData?: DimensionWithNodes[];
  /** PROJ-20: Whether user is platform admin (for taxonomy visibility) */
  isPlatformAdmin?: boolean;
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
  taxonomyData,
  isPlatformAdmin = false,
}: ExerciseFormProps) {
  const t = useTranslations("exercises");
  const tCommon = useTranslations("common");
  const locale = useTypedLocale();
  const [isSaving, setIsSaving] = React.useState(false);
  const [isAiLoading, setIsAiLoading] = React.useState(false);
  const [highlightedFields, setHighlightedFields] = React.useState<Set<string>>(new Set());

  // PROJ-20: Whether hierarchical taxonomy is available
  const hasHierarchicalTaxonomy = !!taxonomyData && taxonomyData.length > 0;

  // PROJ-20: Category assignments state (dimensionId -> nodeId[])
  const [categoryAssignments, setCategoryAssignments] = React.useState<Record<string, string[]>>(
    () => {
      // Initialize from exercise if it has category assignments
      const exerciseWithCats = exercise as ExerciseWithCategories | undefined;
      if (exerciseWithCats?.categoryAssignments && exerciseWithCats.categoryAssignments.length > 0) {
        const map: Record<string, string[]> = {};
        for (const ca of exerciseWithCats.categoryAssignments) {
          if (!map[ca.dimensionId]) {
            map[ca.dimensionId] = [];
          }
          map[ca.dimensionId].push(ca.nodeId);
        }
        return map;
      }
      return {};
    }
  );

  // Track AI usage client-side (updated after each call)
  const [usageData, setUsageData] = React.useState<AiUsageData | null>(initialUsageData);

  // Timer ref for highlight cleanup (prevents memory leak)
  const highlightTimerRef = React.useRef<ReturnType<typeof setTimeout>>(null);

  React.useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  // Single-field optimization state
  const [optimizingFields, setOptimizingFields] = React.useState<Set<string>>(new Set());
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
      const isTypeDirty = form.formState.dirtyFields.exerciseType;
      if (!isTypeDirty && suggestion.exerciseType && suggestion.exerciseType !== currentType) {
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

      // PROJ-20: Apply hierarchical category assignments from AI
      if (suggestion.categoryAssignments && hasHierarchicalTaxonomy && taxonomyData) {
        // Build a slug->dimensionId map for mapping AI response to form state
        const slugToDimId = new Map<string, string>();
        for (const dw of taxonomyData) {
          slugToDimId.set(dw.dimension.slug, dw.dimension.id);
        }

        for (const [slug, nodeIds] of Object.entries(suggestion.categoryAssignments)) {
          const dimId = slugToDimId.get(slug);
          if (!dimId) continue;

          // Only fill if the dimension has no selections yet
          const current = categoryAssignments[dimId] ?? [];
          if (current.length === 0 && nodeIds.length > 0) {
            setCategoryAssignments((prev) => ({
              ...prev,
              [dimId]: nodeIds,
            }));
            filled.add(`category_${dimId}`);
          }
        }
      }

      // Show highlight animation for 1 second
      setHighlightedFields(filled);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = setTimeout(() => setHighlightedFields(new Set()), 1000);

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
    if (!isOptimizableFormField(formFieldName)) return;
    const serverFieldName = FIELD_MAP[formFieldName];

    const exerciseName = form.getValues("nameDe") || form.getValues("nameEn");
    if (!exerciseName?.trim()) {
      toast.error(t("aiSuggestNoName"));
      return;
    }

    const currentValue = form.getValues(formFieldName) as string;

    setOptimizingFields(prev => new Set(prev).add(formFieldName));
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
      form.setValue(formFieldName, result.data);

      // Highlight the field
      setHighlightedFields(new Set([formFieldName]));
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = setTimeout(() => setHighlightedFields(new Set()), 1000);

      incrementUsage();
      toast.success(t("aiOptimizeSuccess"));
    } catch {
      toast.error(t("aiOptimizeError"));
    } finally {
      setOptimizingFields(prev => { const next = new Set(prev); next.delete(formFieldName); return next; });
    }
  }

  // Undo a single-field optimization
  function handleUndo(formFieldName: string) {
    if (!isOptimizableFormField(formFieldName)) return;
    const previousValue = undoValues.get(formFieldName);
    if (previousValue !== undefined) {
      form.setValue(formFieldName, previousValue);
      setUndoValues((prev) => {
        const next = new Map(prev);
        next.delete(formFieldName);
        return next;
      });
    }
  }

  // PROJ-20: Get dimensions relevant to the selected exercise type
  const watchExerciseType = form.watch("exerciseType");
  const relevantDimensions = React.useMemo(() => {
    if (!taxonomyData) return [];
    return taxonomyData.filter((d) => {
      // Cross-cutting dimensions (exerciseType = null) + type-specific
      if (!d.dimension.exerciseType) return true;
      return d.dimension.exerciseType === watchExerciseType;
    });
  }, [taxonomyData, watchExerciseType]);

  // PROJ-20: Update category assignment for a specific dimension
  function handleCategoryChange(dimensionId: string, nodeIds: string[]) {
    setCategoryAssignments((prev) => ({
      ...prev,
      [dimensionId]: nodeIds,
    }));
  }

  async function onSubmit(values: ExerciseFormValues) {
    if (isSaving) return;
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
        // PROJ-20: Include hierarchical category assignments
        ...(hasHierarchicalTaxonomy ? { categoryAssignments } : {}),
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

  // Shared AI action props
  const sharedAiProps = {
    isDisabled: isAiLoading || isSaving || isRateLimited || !canShowAiButton,
    optimizeLabel: t("aiOptimize"),
    undoLabel: t("aiOptimizeUndo"),
    rateLimitedTooltip: isRateLimited
      ? t("aiLimitReached", {
          limit: usageData?.limit ?? 0,
          resetDate: resetDateFormatted,
        })
      : undefined,
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* AI Suggest Toolbar */}
      {showAiSuggest && (
        <div className="mb-6 space-y-2">
          <div className="flex items-center gap-3 rounded-lg border border-secondary/30 bg-secondary/5 p-3">
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

      {/* ── 2-Column Layout: Main Content + Sidebar ── */}
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* ── Main Content Column ── */}
        <div className="space-y-8">
          {/* ── Section: Names ── */}
          <section aria-labelledby="section-names">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Type className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 id="section-names" className="text-body-lg font-semibold text-foreground">
                  {t("sectionNames")}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t("sectionNamesHint")}
                </p>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4 sm:p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Name DE */}
                <div className="space-y-1.5">
                  <Label htmlFor="nameDe">{t("nameDe")} *</Label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      id="nameDe"
                      {...form.register("nameDe")}
                      maxLength={100}
                      aria-invalid={!!form.formState.errors.nameDe}
                      aria-describedby={form.formState.errors.nameDe ? "nameDe-error" : undefined}
                      className={`flex-1 ${aiHighlight("nameDe")}`}
                    />
                    {showAiSuggest && (
                      <FieldAiActions
                        fieldName="nameDe"
                        isOptimizing={optimizingFields.has("nameDe")}
                        hasUndo={undoValues.has("nameDe")}
                        onOptimize={() => handleOptimizeField("nameDe")}
                        onUndo={() => handleUndo("nameDe")}
                        {...sharedAiProps}
                      />
                    )}
                  </div>
                  {form.formState.errors.nameDe && (
                    <p id="nameDe-error" className="text-caption text-error">
                      {form.formState.errors.nameDe.message === "required"
                        ? t("validationRequired")
                        : form.formState.errors.nameDe.message}
                    </p>
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
                      aria-describedby={form.formState.errors.nameEn ? "nameEn-error" : undefined}
                      className={`flex-1 ${aiHighlight("nameEn")}`}
                    />
                    {showAiSuggest && (
                      <FieldAiActions
                        fieldName="nameEn"
                        isOptimizing={optimizingFields.has("nameEn")}
                        hasUndo={undoValues.has("nameEn")}
                        onOptimize={() => handleOptimizeField("nameEn")}
                        onUndo={() => handleUndo("nameEn")}
                        {...sharedAiProps}
                      />
                    )}
                  </div>
                  {form.formState.errors.nameEn && (
                    <p id="nameEn-error" className="text-caption text-error">
                      {form.formState.errors.nameEn.message === "required"
                        ? t("validationRequired")
                        : form.formState.errors.nameEn.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Duplicate Warning */}
              {hasDuplicate && (
                <div className="mt-4 flex items-center gap-2 rounded-md border border-warning/50 bg-warning/10 p-3">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
                  <p className="text-sm text-warning-foreground">{t("duplicateWarning")}</p>
                </div>
              )}
            </div>
          </section>

          {/* ── Section: Descriptions ── */}
          <section aria-labelledby="section-description">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 id="section-description" className="text-body-lg font-semibold text-foreground">
                  {t("sectionDescription")}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t("sectionDescriptionHint")}
                </p>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4 sm:p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Description DE */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="descriptionDe">{t("descriptionDe")}</Label>
                    {showAiSuggest && (
                      <FieldAiActions
                        fieldName="descriptionDe"
                        isOptimizing={optimizingFields.has("descriptionDe")}
                        hasUndo={undoValues.has("descriptionDe")}
                        onOptimize={() => handleOptimizeField("descriptionDe")}
                        onUndo={() => handleUndo("descriptionDe")}
                        {...sharedAiProps}
                      />
                    )}
                  </div>
                  <Textarea
                    id="descriptionDe"
                    {...form.register("descriptionDe")}
                    maxLength={2000}
                    rows={5}
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
                        isOptimizing={optimizingFields.has("descriptionEn")}
                        hasUndo={undoValues.has("descriptionEn")}
                        onOptimize={() => handleOptimizeField("descriptionEn")}
                        onUndo={() => handleUndo("descriptionEn")}
                        {...sharedAiProps}
                      />
                    )}
                  </div>
                  <Textarea
                    id="descriptionEn"
                    {...form.register("descriptionEn")}
                    maxLength={2000}
                    rows={5}
                    className={aiHighlight("descriptionEn")}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ── Sidebar: Classification (sticky on desktop) ── */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <section aria-labelledby="section-classification">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Tags className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 id="section-classification" className="text-body-lg font-semibold text-foreground">
                  {t("sectionClassification")}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t("sectionClassificationHint")}
                </p>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4 sm:p-5 space-y-5">
              {/* Category */}
              <div className="space-y-1.5">
                <Label>{t("category")} *</Label>
                <Select
                  value={form.watch("exerciseType")}
                  onValueChange={(v) => form.setValue("exerciseType", v as ExerciseType)}
                >
                  <SelectTrigger
                    aria-label={t("selectCategory")}
                    className={aiHighlight("exerciseType")}
                  >
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

              <Separator />

              {/* PROJ-20: Hierarchical dimension selectors (when taxonomy data available) */}
              {hasHierarchicalTaxonomy && relevantDimensions.map((dw) => (
                <div key={dw.dimension.id} className="space-y-1.5">
                  <Label>{dw.dimension.name[locale]}</Label>
                  <HierarchicalMultiSelect
                    dimensionId={dw.dimension.id}
                    nodes={dw.nodes}
                    selectedNodeIds={categoryAssignments[dw.dimension.id] ?? []}
                    onChange={(ids) => handleCategoryChange(dw.dimension.id, ids)}
                    isAdmin={isPlatformAdmin}
                    locale={locale}
                    label={dw.dimension.name[locale]}
                    placeholder={t("selectCategories")}
                  />
                </div>
              ))}

              {/* Legacy flat selectors (when no hierarchical taxonomy available) */}
              {!hasHierarchicalTaxonomy && (
                <>
                  {/* Primary Muscle Groups */}
                  <div className="space-y-1.5">
                    <Label>{t("primaryMuscleGroupsLabel")}</Label>
                    <div className={aiHighlight("primaryMuscleGroupIds")}>
                      <TaxonomyMultiSelect
                        entries={muscleGroups}
                        selectedIds={form.watch("primaryMuscleGroupIds")}
                        onSelectionChange={(ids) => form.setValue("primaryMuscleGroupIds", ids)}
                        taxonomyType="muscle_group"
                        placeholder={t("selectItems")}
                        onEntryCreated={onTaxonomyCreated}
                      />
                    </div>
                  </div>

                  {/* Secondary Muscle Groups */}
                  <div className="space-y-1.5">
                    <Label>{t("secondaryMuscleGroupsLabel")}</Label>
                    <div className={aiHighlight("secondaryMuscleGroupIds")}>
                      <TaxonomyMultiSelect
                        entries={muscleGroups}
                        selectedIds={form.watch("secondaryMuscleGroupIds")}
                        onSelectionChange={(ids) => form.setValue("secondaryMuscleGroupIds", ids)}
                        taxonomyType="muscle_group"
                        placeholder={t("selectItems")}
                        onEntryCreated={onTaxonomyCreated}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Equipment */}
                  <div className="space-y-1.5">
                    <Label>{t("equipmentLabel")}</Label>
                    <div className={aiHighlight("equipmentIds")}>
                      <TaxonomyMultiSelect
                        entries={equipment}
                        selectedIds={form.watch("equipmentIds")}
                        onSelectionChange={(ids) => form.setValue("equipmentIds", ids)}
                        taxonomyType="equipment"
                        placeholder={t("selectItems")}
                        onEntryCreated={onTaxonomyCreated}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        </aside>
      </div>

      {/* ── Actions Bar ── */}
      <div className="mt-8 flex items-center justify-end gap-3 border-t pt-5">
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
