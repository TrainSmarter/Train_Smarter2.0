"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaxonomyMultiSelect } from "./taxonomy-multi-select";
import type { TaxonomyEntry, ExerciseType } from "@/lib/exercises/types";
import type { ExerciseSortOption } from "@/hooks/use-exercise-library-preferences";

export type { ExerciseSortOption };
export type ExerciseSourceFilter = "all" | "platform" | "own";

interface ExerciseFiltersProps {
  /** Category filter */
  categoryFilter: ExerciseType | "all";
  onCategoryFilterChange: (value: ExerciseType | "all") => void;
  /** Muscle group filter (multi-select IDs) */
  muscleGroupFilter: string[];
  onMuscleGroupFilterChange: (ids: string[]) => void;
  /** Equipment filter (multi-select IDs) */
  equipmentFilter: string[];
  onEquipmentFilterChange: (ids: string[]) => void;
  /** Source filter */
  sourceFilter: ExerciseSourceFilter;
  onSourceFilterChange: (value: ExerciseSourceFilter) => void;
  /** Sort option */
  sort: ExerciseSortOption;
  onSortChange: (value: ExerciseSortOption) => void;
  /** Available muscle groups for filter */
  muscleGroups: TaxonomyEntry[];
  /** Available equipment for filter */
  equipmentEntries: TaxonomyEntry[];
}

export function ExerciseFilters({
  categoryFilter,
  onCategoryFilterChange,
  muscleGroupFilter,
  onMuscleGroupFilterChange,
  equipmentFilter,
  onEquipmentFilterChange,
  sourceFilter,
  onSourceFilterChange,
  sort,
  onSortChange,
  muscleGroups,
  equipmentEntries,
}: ExerciseFiltersProps) {
  const t = useTranslations("exercises");
  const tCommon = useTranslations("common");

  return (
    <div className="flex flex-wrap gap-2">
      {/* Category filter */}
      <Select
        value={categoryFilter}
        onValueChange={(v) => onCategoryFilterChange(v as ExerciseType | "all")}
      >
        <SelectTrigger className="w-[160px]" aria-label={t("filterCategory")}>
          <SelectValue placeholder={t("filterCategory")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filterAll")}</SelectItem>
          <SelectItem value="strength">{t("strength")}</SelectItem>
          <SelectItem value="endurance">{t("endurance")}</SelectItem>
          <SelectItem value="speed">{t("speed")}</SelectItem>
          <SelectItem value="flexibility">{t("flexibility")}</SelectItem>
        </SelectContent>
      </Select>

      {/* Muscle group filter (multi-select) */}
      <div className="w-[200px]">
        <TaxonomyMultiSelect
          entries={muscleGroups}
          selectedIds={muscleGroupFilter}
          onSelectionChange={onMuscleGroupFilterChange}
          taxonomyType="muscle_group"
          placeholder={t("filterMuscleGroup")}
          allowCreate={false}
        />
      </div>

      {/* Equipment filter (multi-select) */}
      <div className="w-[200px]">
        <TaxonomyMultiSelect
          entries={equipmentEntries}
          selectedIds={equipmentFilter}
          onSelectionChange={onEquipmentFilterChange}
          taxonomyType="equipment"
          placeholder={t("filterEquipment")}
          allowCreate={false}
        />
      </div>

      {/* Source filter */}
      <Select
        value={sourceFilter}
        onValueChange={(v) => onSourceFilterChange(v as ExerciseSourceFilter)}
      >
        <SelectTrigger className="w-[140px]" aria-label={t("filterSource")}>
          <SelectValue placeholder={t("filterSource")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("sourceAll")}</SelectItem>
          <SelectItem value="platform">{t("sourcePlatform")}</SelectItem>
          <SelectItem value="own">{t("sourceOwn")}</SelectItem>
        </SelectContent>
      </Select>

      {/* Sort */}
      <Select
        value={sort}
        onValueChange={(v) => onSortChange(v as ExerciseSortOption)}
      >
        <SelectTrigger className="w-[120px]" aria-label={tCommon("sort")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="az">{t("sortAZ")}</SelectItem>
          <SelectItem value="za">{t("sortZA")}</SelectItem>
          <SelectItem value="newest">{t("sortNewest")}</SelectItem>
          <SelectItem value="oldest">{t("sortOldest")}</SelectItem>
          <SelectItem value="category">{t("sortCategory")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
