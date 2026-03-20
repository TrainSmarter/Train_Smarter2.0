"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { Search, LayoutGrid, List } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { TaxonomyMultiSelect } from "./taxonomy-multi-select";
import type { TaxonomyEntry, ExerciseType } from "@/lib/exercises/types";

export type ExerciseViewMode = "grid" | "list";
export type ExerciseSourceFilter = "all" | "platform" | "own";
export type ExerciseSortOption = "az" | "za" | "newest";

interface ExerciseFiltersProps {
  /** Search query */
  search: string;
  onSearchChange: (value: string) => void;
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
  /** View mode */
  viewMode: ExerciseViewMode;
  onViewModeChange: (mode: ExerciseViewMode) => void;
  /** Available muscle groups for filter */
  muscleGroups: TaxonomyEntry[];
  /** Available equipment for filter */
  equipmentEntries: TaxonomyEntry[];
}

export function ExerciseFilters({
  search,
  onSearchChange,
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
  viewMode,
  onViewModeChange,
  muscleGroups,
  equipmentEntries,
}: ExerciseFiltersProps) {
  const t = useTranslations("exercises");
  const tCommon = useTranslations("common");

  return (
    <div className="space-y-3">
      {/* Row 1: Search + View Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
            aria-label={tCommon("search")}
          />
        </div>
        <div className="flex items-center gap-2">
          {/* View Switcher */}
          <div
            className="inline-flex items-center rounded-md border bg-muted p-0.5"
            role="radiogroup"
            aria-label={t("viewGrid")}
          >
            <Button
              variant="ghost"
              size="sm"
              role="radio"
              aria-checked={viewMode === "grid"}
              aria-label={t("viewGrid")}
              className={cn(
                "h-8 gap-1.5 px-2.5 text-xs font-medium transition-colors",
                viewMode === "grid"
                  ? "bg-background text-foreground shadow-sm hover:bg-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => onViewModeChange("grid")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("viewGrid")}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              role="radio"
              aria-checked={viewMode === "list"}
              aria-label={t("viewList")}
              className={cn(
                "h-8 gap-1.5 px-2.5 text-xs font-medium transition-colors",
                viewMode === "list"
                  ? "bg-background text-foreground shadow-sm hover:bg-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => onViewModeChange("list")}
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("viewList")}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Row 2: Filters */}
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
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
