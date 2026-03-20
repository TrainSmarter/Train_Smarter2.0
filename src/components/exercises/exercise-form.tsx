"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, AlertTriangle } from "lucide-react";
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
import { TaxonomyMultiSelect } from "./taxonomy-multi-select";
import { createExercise, updateExercise } from "@/lib/exercises/actions";
import type {
  ExerciseWithTaxonomy,
  TaxonomyEntry,
  ExerciseType,
  TaxonomyType,
} from "@/lib/exercises/types";

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
}

export function ExerciseForm({
  exercise,
  muscleGroups,
  equipment,
  allExercises,
  onSuccess,
  onCancel,
  onTaxonomyCreated,
}: ExerciseFormProps) {
  const t = useTranslations("exercises");
  const tCommon = useTranslations("common");
  const [isSaving, setIsSaving] = React.useState(false);

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

  async function onSubmit(values: ExerciseFormValues) {
    setIsSaving(true);
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

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      {/* Name DE */}
      <div className="space-y-1.5">
        <Label htmlFor="nameDe">{t("nameDe")} *</Label>
        <Input
          id="nameDe"
          {...form.register("nameDe")}
          maxLength={100}
          aria-invalid={!!form.formState.errors.nameDe}
        />
        {form.formState.errors.nameDe && (
          <p className="text-caption text-error">{form.formState.errors.nameDe.message}</p>
        )}
      </div>

      {/* Name EN */}
      <div className="space-y-1.5">
        <Label htmlFor="nameEn">{t("nameEn")} *</Label>
        <Input
          id="nameEn"
          {...form.register("nameEn")}
          maxLength={100}
          aria-invalid={!!form.formState.errors.nameEn}
        />
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
        <Label htmlFor="descriptionDe">{t("descriptionDe")}</Label>
        <Textarea
          id="descriptionDe"
          {...form.register("descriptionDe")}
          maxLength={2000}
          rows={3}
        />
      </div>

      {/* Description EN */}
      <div className="space-y-1.5">
        <Label htmlFor="descriptionEn">{t("descriptionEn")}</Label>
        <Textarea
          id="descriptionEn"
          {...form.register("descriptionEn")}
          maxLength={2000}
          rows={3}
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
