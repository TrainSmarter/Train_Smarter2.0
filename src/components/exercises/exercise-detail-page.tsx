"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useTypedLocale } from "@/hooks/use-typed-locale";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Pencil,
  Trash2,
  Video,
  AlertTriangle,
  Info,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/modal";
import { ExerciseForm } from "./exercise-form";
import { deleteExercise, cloneExercise } from "@/lib/exercises/actions";
import { Link, useRouter } from "@/i18n/navigation";
import type {
  ExerciseWithTaxonomy,
  TaxonomyEntry,
  TaxonomyType,
} from "@/lib/exercises/types";
import { CATEGORY_LABELS } from "@/lib/exercises/constants";
import type { AiUsageData } from "@/lib/ai/usage-types";

interface ExerciseDetailPageProps {
  /** Existing exercise (null for create mode) */
  exercise: ExerciseWithTaxonomy | null;
  /** All available muscle groups */
  muscleGroups: TaxonomyEntry[];
  /** All available equipment */
  equipment: TaxonomyEntry[];
  /** All exercises (for duplicate checking in form) */
  allExercises: ExerciseWithTaxonomy[];
  /** Whether to show AI suggestion features */
  showAiSuggest?: boolean;
  /** AI usage data for displaying quota */
  usageData?: AiUsageData | null;
  /** Whether the current user is a platform admin */
  isPlatformAdmin?: boolean;
}

export function ExerciseDetailPage({
  exercise,
  muscleGroups,
  equipment,
  allExercises,
  showAiSuggest = false,
  usageData = null,
  isPlatformAdmin = false,
}: ExerciseDetailPageProps) {
  const t = useTranslations("exercises");
  const tCommon = useTranslations("common");
  const locale = useTypedLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const isCreateMode = !exercise;
  const initialEditMode = searchParams.get("edit") === "true";

  const [isEditing, setIsEditing] = React.useState(
    isCreateMode || initialEditMode
  );
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isCloning, setIsCloning] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState(false);

  const isGlobal = exercise?.scope === "global";
  const canEdit = !isGlobal || isPlatformAdmin;
  const canDelete = !isGlobal || isPlatformAdmin;
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
        router.push("/training/exercises");
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
        router.push("/training/exercises");
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
    if (isCreateMode) {
      toast.success(t("exerciseCreated"));
      router.push("/training/exercises");
    } else {
      toast.success(t("exerciseUpdated"));
      setIsEditing(false);
      router.refresh();
    }
  }

  function handleFormCancel() {
    if (isCreateMode) {
      router.push("/training/exercises");
    } else {
      setIsEditing(false);
    }
  }

  function handleTaxonomyCreated(
    _entry: { name: { de: string; en: string }; type: TaxonomyType }
  ) {
    // Page will be revalidated by server action
  }

  const pageTitle = isCreateMode
    ? t("createExercise")
    : isEditing
      ? t("editExercise")
      : exercise.name[locale];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/training/exercises"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label={t("backToLibrary")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-h2 text-foreground">{pageTitle}</h1>
            {!isCreateMode && !isEditing && (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant={isGlobal ? "primary" : "secondary"}>
                  {isGlobal ? t("platform") : t("own")}
                </Badge>
                <Badge variant="gray">
                  {t(CATEGORY_LABELS[exercise.exerciseType])}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Header Actions */}
        {!isCreateMode && !isEditing && (
          <div className="flex flex-wrap gap-2">
            {/* Edit: own exercises + admin on global */}
            {canEdit && (
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                iconLeft={<Pencil className="h-4 w-4" />}
              >
                {tCommon("edit")}
              </Button>
            )}

            {/* Clone: global exercises for non-admins */}
            {isGlobal && !isPlatformAdmin && (
              <Button
                onClick={handleClone}
                loading={isCloning}
                iconLeft={<Copy className="h-4 w-4" />}
              >
                {t("copyToLibrary")}
              </Button>
            )}

            {/* Delete: own exercises + admin on global */}
            {canDelete && (
              <Button
                variant="destructive"
                onClick={() => setDeleteConfirm(true)}
                iconLeft={<Trash2 className="h-4 w-4" />}
              >
                {tCommon("delete")}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Edit / Create Mode */}
      {isEditing && (
        <Card>
          <CardContent className="pt-6">
            <div className="mx-auto max-w-3xl">
              <ExerciseForm
                exercise={isCreateMode ? null : exercise}
                muscleGroups={muscleGroups}
                equipment={equipment}
                allExercises={allExercises}
                onSuccess={handleFormSuccess}
                onCancel={handleFormCancel}
                onTaxonomyCreated={handleTaxonomyCreated}
                showAiSuggest={showAiSuggest}
                usageData={usageData}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Mode (read-only) */}
      {!isEditing && exercise && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column: Core Info */}
          <div className="space-y-6 lg:col-span-2">
            {/* Read-only hint for global exercises */}
            {isGlobal && (
              <div className="flex items-start gap-2 rounded-md border border-info/30 bg-info/5 p-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                <p className="text-sm text-muted-foreground">
                  {t("readOnlyHint")}
                </p>
              </div>
            )}

            {hasBeenCloned && (
              <div className="flex items-center gap-1.5 text-sm text-warning">
                <AlertTriangle className="h-4 w-4" />
                {t("alreadyCloned")}
              </div>
            )}

            {/* Description Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-body-lg">
                  {t("description")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-body text-foreground whitespace-pre-wrap">
                  {exercise.description?.[locale] || (
                    <span className="italic text-muted-foreground">
                      {t("noDescription")}
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>

            {/* Video Placeholder Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 rounded-md border border-dashed p-6 text-muted-foreground">
                  <Video className="h-5 w-5 shrink-0" />
                  <p className="text-sm">{t("videoPlaceholder")}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Metadata */}
          <div className="space-y-6">
            {/* Primary Muscle Groups */}
            {exercise.primaryMuscleGroups.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-body-lg">
                    {t("primaryMuscles")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {exercise.primaryMuscleGroups.map((mg) => (
                      <Badge key={mg.id} variant="outline">
                        {mg.name[locale]}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Secondary Muscle Groups */}
            {exercise.secondaryMuscleGroups.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-body-lg">
                    {t("secondaryMuscles")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {exercise.secondaryMuscleGroups.map((mg) => (
                      <Badge key={mg.id} variant="outline">
                        {mg.name[locale]}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Equipment */}
            {exercise.equipment.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-body-lg">
                    {t("equipment")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {exercise.equipment.map((eq) => (
                      <Badge key={eq.id} variant="info">
                        {eq.name[locale]}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Source Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-body-lg">{t("source")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={isGlobal ? "primary" : "secondary"}>
                  {isGlobal ? t("platform") : t("own")}
                </Badge>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

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
    </div>
  );
}
