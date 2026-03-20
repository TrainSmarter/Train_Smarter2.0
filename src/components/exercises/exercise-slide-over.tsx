"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { Copy, Pencil, Trash2, Video, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/modal";
import { ExerciseForm } from "./exercise-form";
import { deleteExercise, cloneExercise } from "@/lib/exercises/actions";
import type {
  ExerciseWithTaxonomy,
  TaxonomyEntry,
  ExerciseType,
  TaxonomyType,
} from "@/lib/exercises/types";

type SlideOverMode = "detail" | "edit" | "create";

const CATEGORY_LABELS: Record<ExerciseType, string> = {
  strength: "strength",
  endurance: "endurance",
  speed: "speed",
  flexibility: "flexibility",
};

interface ExerciseSlideOverProps {
  /** Whether the slide-over is open */
  open: boolean;
  /** Callback to close the slide-over */
  onOpenChange: (open: boolean) => void;
  /** The exercise to display (null for create mode) */
  exercise: ExerciseWithTaxonomy | null;
  /** Current mode */
  mode: SlideOverMode;
  /** Callback to switch mode */
  onModeChange: (mode: SlideOverMode) => void;
  /** All available muscle groups */
  muscleGroups: TaxonomyEntry[];
  /** All available equipment */
  equipment: TaxonomyEntry[];
  /** All exercises (for duplicate checking) */
  allExercises: ExerciseWithTaxonomy[];
  /** Callback after successful action */
  onActionComplete: () => void;
  /** Callback when a taxonomy entry is created */
  onTaxonomyCreated: (entry: { name: { de: string; en: string }; type: TaxonomyType }) => void;
}

export function ExerciseSlideOver({
  open,
  onOpenChange,
  exercise,
  mode,
  onModeChange,
  muscleGroups,
  equipment,
  allExercises,
  onActionComplete,
  onTaxonomyCreated,
}: ExerciseSlideOverProps) {
  const t = useTranslations("exercises");
  const tCommon = useTranslations("common");
  const locale = useLocale() as "de" | "en";
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isCloning, setIsCloning] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState(false);

  const isGlobal = exercise?.scope === "global";
  const hasBeenCloned = exercise
    ? allExercises.some(
        (ex) => ex.clonedFrom === exercise.id && ex.scope === "trainer"
      )
    : false;

  async function handleDelete() {
    if (!exercise) return;
    setIsDeleting(true);
    try {
      const result = await deleteExercise(exercise.id);
      if (result.success) {
        toast.success(t("deleteSuccess"));
        setDeleteConfirm(false);
        onOpenChange(false);
        onActionComplete();
      } else {
        toast.error(t("errorGeneric"));
      }
    } catch {
      toast.error(t("errorGeneric"));
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleClone() {
    if (!exercise) return;
    setIsCloning(true);
    try {
      const result = await cloneExercise(exercise.id);
      if (result.success) {
        toast.success(t("cloneSuccess"));
        onOpenChange(false);
        onActionComplete();
      } else {
        toast.error(t("errorGeneric"));
      }
    } catch {
      toast.error(t("errorGeneric"));
    } finally {
      setIsCloning(false);
    }
  }

  function handleFormSuccess() {
    onOpenChange(false);
    onActionComplete();
  }

  const title =
    mode === "create"
      ? t("createExercise")
      : mode === "edit"
        ? t("editExercise")
        : exercise
          ? exercise.name[locale]
          : t("exerciseDetail");

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg overflow-y-auto"
        >
          <SheetHeader className="mb-4">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription className="sr-only">
              {t("exerciseDetail")}
            </SheetDescription>
          </SheetHeader>

          {/* Create / Edit Mode */}
          {(mode === "create" || mode === "edit") && (
            <ExerciseForm
              exercise={mode === "edit" ? exercise : null}
              muscleGroups={muscleGroups}
              equipment={equipment}
              allExercises={allExercises}
              onSuccess={handleFormSuccess}
              onCancel={() => {
                if (mode === "edit" && exercise) {
                  onModeChange("detail");
                } else {
                  onOpenChange(false);
                }
              }}
              onTaxonomyCreated={onTaxonomyCreated}
            />
          )}

          {/* Detail Mode */}
          {mode === "detail" && exercise && (
            <div className="space-y-5">
              {/* Source + Category Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={isGlobal ? "primary" : "secondary"}
                >
                  {isGlobal ? t("platform") : t("own")}
                </Badge>
                <Badge variant="gray">
                  {t(CATEGORY_LABELS[exercise.exerciseType])}
                </Badge>
              </div>

              {/* Read-only hint for global exercises */}
              {isGlobal && (
                <div className="flex items-start gap-2 rounded-md border border-info/30 bg-info/5 p-3">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                  <p className="text-sm text-muted-foreground">
                    {t("readOnlyHint")}
                  </p>
                </div>
              )}

              {/* Description */}
              <div>
                <h4 className="text-body-sm font-medium text-muted-foreground mb-1">
                  {t("description")}
                </h4>
                <p className="text-body text-foreground">
                  {exercise.description?.[locale] || (
                    <span className="italic text-muted-foreground">
                      {t("noDescription")}
                    </span>
                  )}
                </p>
              </div>

              <Separator />

              {/* Primary Muscle Groups */}
              {exercise.primaryMuscleGroups.length > 0 && (
                <div>
                  <h4 className="text-body-sm font-medium text-muted-foreground mb-2">
                    {t("primaryMuscles")}
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {exercise.primaryMuscleGroups.map((mg) => (
                      <Badge key={mg.id} variant="outline">
                        {mg.name[locale]}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Secondary Muscle Groups */}
              {exercise.secondaryMuscleGroups.length > 0 && (
                <div>
                  <h4 className="text-body-sm font-medium text-muted-foreground mb-2">
                    {t("secondaryMuscles")}
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {exercise.secondaryMuscleGroups.map((mg) => (
                      <Badge key={mg.id} variant="outline">
                        {mg.name[locale]}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Equipment */}
              {exercise.equipment.length > 0 && (
                <div>
                  <h4 className="text-body-sm font-medium text-muted-foreground mb-2">
                    {t("equipment")}
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {exercise.equipment.map((eq) => (
                      <Badge key={eq.id} variant="info">
                        {eq.name[locale]}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Video Placeholder */}
              <div className="flex items-center gap-2 rounded-md border border-dashed p-4 text-muted-foreground">
                <Video className="h-5 w-5 shrink-0" />
                <p className="text-sm">{t("videoPlaceholder")}</p>
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {isGlobal ? (
                  <>
                    <Button
                      onClick={handleClone}
                      loading={isCloning}
                      iconLeft={<Copy className="h-4 w-4" />}
                    >
                      {t("copyToLibrary")}
                    </Button>
                    {hasBeenCloned && (
                      <div className="flex items-center gap-1.5 text-sm text-warning">
                        <AlertTriangle className="h-4 w-4" />
                        {t("alreadyCloned")}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => onModeChange("edit")}
                      iconLeft={<Pencil className="h-4 w-4" />}
                    >
                      {tCommon("edit")}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setDeleteConfirm(true)}
                      iconLeft={<Trash2 className="h-4 w-4" />}
                    >
                      {tCommon("delete")}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirm}
        onOpenChange={setDeleteConfirm}
        variant="danger"
        title={t("deleteConfirmTitle")}
        message={t("deleteConfirmMessage")}
        confirmLabel={tCommon("delete")}
        cancelLabel={tCommon("cancel")}
        onConfirm={handleDelete}
        loading={isDeleting}
      />
    </>
  );
}
