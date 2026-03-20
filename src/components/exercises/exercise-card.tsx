"use client";

import { useTranslations, useLocale } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ExerciseWithTaxonomy, ExerciseType } from "@/lib/exercises/types";

interface ExerciseCardProps {
  exercise: ExerciseWithTaxonomy;
  onClick: () => void;
  viewMode: "grid" | "list";
}

const CATEGORY_LABELS: Record<ExerciseType, string> = {
  strength: "strength",
  endurance: "endurance",
  speed: "speed",
  flexibility: "flexibility",
};

export function ExerciseCard({ exercise, onClick, viewMode }: ExerciseCardProps) {
  const t = useTranslations("exercises");
  const locale = useLocale() as "de" | "en";

  const name = exercise.name[locale];
  const isGlobal = exercise.scope === "global";
  const maxTags = viewMode === "grid" ? 3 : 5;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-lg",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        viewMode === "list" && "flex-row"
      )}
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
      <CardContent
        className={cn(
          "p-4",
          viewMode === "list" && "flex items-center gap-4 w-full"
        )}
      >
        {/* Name + Source Badge Row */}
        <div className={cn("flex items-start gap-2", viewMode === "list" && "flex-1 min-w-0")}>
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

        {/* Tags Row */}
        <div className={cn(
          "flex flex-wrap items-center gap-1.5",
          viewMode === "grid" ? "mt-3" : "mt-0 ml-4 shrink-0"
        )}>
          {/* Category Badge */}
          <Badge variant="gray" size="sm">
            {t(CATEGORY_LABELS[exercise.exerciseType])}
          </Badge>

          {/* Primary Muscle Group Tags */}
          {exercise.primaryMuscleGroups.slice(0, maxTags).map((mg) => (
            <Badge key={mg.id} variant="outline" size="sm">
              {mg.name[locale]}
            </Badge>
          ))}
          {exercise.primaryMuscleGroups.length > maxTags && (
            <Badge variant="outline" size="sm">
              +{exercise.primaryMuscleGroups.length - maxTags}
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
              +{exercise.equipment.length - 2}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
