"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { Copy, ExternalLink, Pencil, AlertTriangle, Info } from "lucide-react";
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
import { cloneExercise } from "@/lib/exercises/actions";
import { Link, useRouter } from "@/i18n/navigation";
import type {
  ExerciseWithTaxonomy,
  ExerciseType,
} from "@/lib/exercises/types";

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
  /** The exercise to display */
  exercise: ExerciseWithTaxonomy | null;
  /** All exercises (for clone-check) */
  allExercises: ExerciseWithTaxonomy[];
  /** Callback after successful action */
  onActionComplete: () => void;
}

export function ExerciseSlideOver({
  open,
  onOpenChange,
  exercise,
  allExercises,
  onActionComplete,
}: ExerciseSlideOverProps) {
  const t = useTranslations("exercises");
  const tCommon = useTranslations("common");
  const locale = useLocale() as "de" | "en";
  const router = useRouter();
  const [isCloning, setIsCloning] = React.useState(false);

  const isGlobal = exercise?.scope === "global";
  const hasBeenCloned = exercise
    ? allExercises.some(
        (ex) => ex.clonedFrom === exercise.id && ex.scope === "trainer"
      )
    : false;

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

  function handleEditClick() {
    if (!exercise) return;
    onOpenChange(false);
    router.push({
      pathname: "/training/exercises/[id]",
      params: { id: exercise.id },
      query: { edit: "true" },
    });
  }

  const title = exercise ? exercise.name[locale] : t("exerciseDetail");

  return (
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

        {/* Detail Mode (read-only) */}
        {exercise && (
          <div className="space-y-5">
            {/* Source + Category Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={isGlobal ? "primary" : "secondary"}>
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

            {/* Actions */}
            <div className="flex flex-col gap-2">
              {/* Navigation: Open Detail Page */}
              <Button
                variant="outline"
                className="w-full justify-start"
                asChild
              >
                <Link
                  href={{
                    pathname: "/training/exercises/[id]",
                    params: { id: exercise.id },
                  }}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t("openDetail")}
                </Link>
              </Button>

              {isGlobal ? (
                <>
                  <Button
                    onClick={handleClone}
                    loading={isCloning}
                    className="w-full justify-start"
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
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleEditClick}
                  iconLeft={<Pencil className="h-4 w-4" />}
                >
                  {tCommon("edit")}
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
