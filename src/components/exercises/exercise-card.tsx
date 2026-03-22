"use client";

import { useTranslations } from "next-intl";
import { useTypedLocale } from "@/hooks/use-typed-locale";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ExerciseWithTaxonomy, ExerciseWithCategories } from "@/lib/exercises/types";
import { CATEGORY_LABELS } from "@/lib/exercises/constants";

interface ExerciseCardProps {
  exercise: ExerciseWithTaxonomy;
  onClick: () => void;
}

export function ExerciseCard({ exercise, onClick }: ExerciseCardProps) {
  const t = useTranslations("exercises");
  const locale = useTypedLocale();

  const name = exercise.name[locale];
  const description = exercise.description?.[locale];
  const isGlobal = exercise.scope === "global";
  const maxTags = 3;

  // PROJ-20: Check for hierarchical category assignments
  const exWithCats = exercise as ExerciseWithCategories;
  const hasCategoryAssignments = exWithCats.categoryAssignments && exWithCats.categoryAssignments.length > 0;

  return (
    <Card
      className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      tabIndex={0}
      role="button"
      aria-label={name}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <CardContent className="p-4">
        {/* Name + Source Badge Row */}
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-body font-medium text-foreground">
              {name}
            </h3>
          </div>
          <Badge
            variant={isGlobal ? "primary" : "secondary"}
            size="sm"
            className="shrink-0"
          >
            {isGlobal ? t("platform") : t("own")}
          </Badge>
        </div>

        {/* Description Preview */}
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
            {description}
          </p>
        )}

        {/* Tags Row */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {/* Category Badge */}
          <Badge variant="gray" size="sm">
            {t(CATEGORY_LABELS[exercise.exerciseType])}
          </Badge>

          {/* PROJ-20: Hierarchical category breadcrumbs */}
          {hasCategoryAssignments && (
            <>
              {exWithCats.categoryAssignments.slice(0, maxTags).map((ca) => {
                // Build a compact breadcrumb from the path segments
                const pathSegments = ca.nodePath.split(".");
                const displayPath = pathSegments.length > 2
                  ? `${pathSegments[0]} > ... > ${pathSegments[pathSegments.length - 1]}`
                  : ca.nodeName[locale];
                return (
                  <Badge key={ca.nodeId} variant="outline" size="sm" title={ca.nodePath}>
                    {ca.nodeName[locale]}
                  </Badge>
                );
              })}
              {exWithCats.categoryAssignments.length > maxTags && (
                <Badge variant="outline" size="sm">
                  {t("moreItems", { count: exWithCats.categoryAssignments.length - maxTags })}
                </Badge>
              )}
            </>
          )}

          {/* Legacy flat taxonomy tags (when no hierarchical assignments) */}
          {!hasCategoryAssignments && (
            <>
              {/* Primary Muscle Group Tags */}
              {exercise.primaryMuscleGroups.slice(0, maxTags).map((mg) => (
                <Badge key={mg.id} variant="outline" size="sm">
                  {mg.name[locale]}
                </Badge>
              ))}
              {exercise.primaryMuscleGroups.length > maxTags && (
                <Badge variant="outline" size="sm">
                  {t("moreItems", { count: exercise.primaryMuscleGroups.length - maxTags })}
                </Badge>
              )}

              {/* Equipment Tags */}
              {exercise.equipment.slice(0, 2).map((eq) => (
                <Badge key={eq.id} variant="info" size="sm">
                  {eq.name[locale]}
                </Badge>
              ))}
              {exercise.equipment.length > 2 && (
                <Badge variant="info" size="sm">
                  {t("moreItems", { count: exercise.equipment.length - 2 })}
                </Badge>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
