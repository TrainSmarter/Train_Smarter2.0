"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { useTypedLocale } from "@/hooks/use-typed-locale";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ExerciseWithTaxonomy } from "@/lib/exercises/types";
import type { ExerciseSortOption } from "@/hooks/use-exercise-library-preferences";
import { CATEGORY_LABELS } from "@/lib/exercises/constants";

// ── Props ────────────────────────────────────────────────────────

interface ExerciseTableViewProps {
  exercises: ExerciseWithTaxonomy[];
  sort: ExerciseSortOption;
  onSortChange: (sort: ExerciseSortOption) => void;
  onExerciseClick: (exercise: ExerciseWithTaxonomy) => void;
}

// ── Sort Icon Helper ─────────────────────────────────────────────

function SortIcon({
  column,
  activeSort,
}: {
  column: "name" | "category" | "created";
  activeSort: ExerciseSortOption;
}) {
  const isActive =
    (column === "name" && (activeSort === "az" || activeSort === "za")) ||
    (column === "category" && activeSort === "category") ||
    (column === "created" &&
      (activeSort === "newest" || activeSort === "oldest"));

  if (!isActive) {
    return <ChevronsUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50" />;
  }

  const isDescending = activeSort === "za" || activeSort === "oldest";

  return isDescending ? (
    <ChevronDown className="ml-1 h-3.5 w-3.5 text-foreground" />
  ) : (
    <ChevronUp className="ml-1 h-3.5 w-3.5 text-foreground" />
  );
}

// ── Component ────────────────────────────────────────────────────

export function ExerciseTableView({
  exercises,
  sort,
  onSortChange,
  onExerciseClick,
}: ExerciseTableViewProps) {
  const t = useTranslations("exercises");
  const locale = useTypedLocale();

  const handleNameSort = useCallback(() => {
    onSortChange(sort === "az" ? "za" : "az");
  }, [sort, onSortChange]);

  const handleCategorySort = useCallback(() => {
    onSortChange(sort === "category" ? "az" : "category");
  }, [sort, onSortChange]);

  const handleCreatedSort = useCallback(() => {
    onSortChange(sort === "newest" ? "oldest" : "newest");
  }, [sort, onSortChange]);

  const handleRowKeyDown = useCallback(
    (e: React.KeyboardEvent, exercise: ExerciseWithTaxonomy) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onExerciseClick(exercise);
      }
    },
    [onExerciseClick]
  );

  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {/* Name — sortable */}
            <TableHead className="min-w-[200px]">
              <button
                type="button"
                className="inline-flex items-center font-medium hover:text-foreground transition-colors"
                onClick={handleNameSort}
              >
                {t("columnName")}
                <SortIcon column="name" activeSort={sort} />
              </button>
            </TableHead>

            {/* Category — sortable */}
            <TableHead className="w-[130px]">
              <button
                type="button"
                className="inline-flex items-center font-medium hover:text-foreground transition-colors"
                onClick={handleCategorySort}
              >
                {t("columnCategory")}
                <SortIcon column="category" activeSort={sort} />
              </button>
            </TableHead>

            {/* Primary Muscles */}
            <TableHead className="min-w-[200px]">
              {t("columnMuscles")}
            </TableHead>

            {/* Equipment */}
            <TableHead className="min-w-[160px]">
              {t("columnEquipment")}
            </TableHead>

            {/* Source */}
            <TableHead className="w-[100px]">
              {t("columnSource")}
            </TableHead>

            {/* Created — sortable */}
            <TableHead className="w-[120px]">
              <button
                type="button"
                className="inline-flex items-center font-medium hover:text-foreground transition-colors"
                onClick={handleCreatedSort}
              >
                {t("columnCreated")}
                <SortIcon column="created" activeSort={sort} />
              </button>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {exercises.map((exercise) => {
            const name = exercise.name[locale] || exercise.name.de;
            const description = exercise.description?.[locale] || exercise.description?.de || null;
            const visibleMuscles = exercise.primaryMuscleGroups.slice(0, 3);
            const remainingMuscles = exercise.primaryMuscleGroups.length - 3;
            const visibleEquipment = exercise.equipment.slice(0, 2);
            const remainingEquipment = exercise.equipment.length - 2;

            return (
              <TableRow
                key={exercise.id}
                className="cursor-pointer"
                tabIndex={0}
                role="button"
                aria-label={name}
                onClick={() => onExerciseClick(exercise)}
                onKeyDown={(e) => handleRowKeyDown(e, exercise)}
              >
                {/* Name + description preview */}
                <TableCell className="min-w-[200px]">
                  <div>
                    <span className="font-medium">{name}</span>
                    {description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {description}
                      </p>
                    )}
                  </div>
                </TableCell>

                {/* Category */}
                <TableCell className="w-[130px]">
                  <Badge variant="gray" size="sm">
                    {t(CATEGORY_LABELS[exercise.exerciseType])}
                  </Badge>
                </TableCell>

                {/* Primary Muscles */}
                <TableCell className="min-w-[200px]">
                  <div className="flex flex-wrap gap-1">
                    {visibleMuscles.map((muscle) => (
                      <Badge key={muscle.id} variant="outline" size="sm">
                        {muscle.name[locale] || muscle.name.de}
                      </Badge>
                    ))}
                    {remainingMuscles > 0 && (
                      <Badge variant="outline" size="sm">
                        {t("moreItems", { count: remainingMuscles })}
                      </Badge>
                    )}
                  </div>
                </TableCell>

                {/* Equipment */}
                <TableCell className="min-w-[160px]">
                  <div className="flex flex-wrap gap-1">
                    {visibleEquipment.map((eq) => (
                      <Badge key={eq.id} variant="info" size="sm">
                        {eq.name[locale] || eq.name.de}
                      </Badge>
                    ))}
                    {remainingEquipment > 0 && (
                      <Badge variant="outline" size="sm">
                        {t("moreItems", { count: remainingEquipment })}
                      </Badge>
                    )}
                  </div>
                </TableCell>

                {/* Source */}
                <TableCell className="w-[100px]">
                  <Badge
                    variant={exercise.scope === "global" ? "primary" : "secondary"}
                    size="sm"
                  >
                    {exercise.scope === "global" ? t("platform") : t("own")}
                  </Badge>
                </TableCell>

                {/* Created */}
                <TableCell className="w-[120px] text-sm text-muted-foreground">
                  {new Date(exercise.createdAt).toLocaleDateString(
                    locale === "de" ? "de-DE" : "en-US"
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
