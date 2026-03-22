"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useTypedLocale } from "@/hooks/use-typed-locale";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaxonomyMultiSelect } from "./taxonomy-multi-select";
import type { TaxonomyEntry, ExerciseType } from "@/lib/exercises/types";
import type { DimensionWithNodes, CategoryNode } from "@/lib/taxonomy/types";
import { buildTree, filterTreeForTrainer, flattenTree } from "@/lib/taxonomy/tree-utils";
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
  /** PROJ-20: Taxonomy data for hierarchical dimension filters */
  taxonomyData?: DimensionWithNodes[];
  /** PROJ-20: Current dimension filter values */
  dimensionFilters?: Record<string, string>;
  /** PROJ-20: Callback when dimension filter changes */
  onDimensionFilterChange?: (dimensionId: string, nodeId: string) => void;
  /** PROJ-20: Whether user is platform admin */
  isPlatformAdmin?: boolean;
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
  taxonomyData,
  dimensionFilters,
  onDimensionFilterChange,
  isPlatformAdmin = false,
}: ExerciseFiltersProps) {
  const t = useTranslations("exercises");
  const tCommon = useTranslations("common");
  const locale = useTypedLocale();

  const hasHierarchicalTaxonomy = !!taxonomyData && taxonomyData.length > 0;

  // PROJ-20: Build flat visible node lists per dimension for the Select dropdowns
  const dimensionFilterOptions = React.useMemo(() => {
    if (!taxonomyData) return [];
    return taxonomyData.map((dw) => {
      const tree = buildTree(dw.nodes);
      const filtered = filterTreeForTrainer(tree, isPlatformAdmin);
      const flatVisible = flattenTree(filtered);
      return {
        dimension: dw.dimension,
        nodes: flatVisible,
      };
    });
  }, [taxonomyData, isPlatformAdmin]);

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

      {/* PROJ-20: Hierarchical dimension filters */}
      {hasHierarchicalTaxonomy && dimensionFilterOptions.map((dimOpt) => (
        <Select
          key={dimOpt.dimension.id}
          value={dimensionFilters?.[dimOpt.dimension.id] ?? "all"}
          onValueChange={(v) =>
            onDimensionFilterChange?.(dimOpt.dimension.id, v === "all" ? "" : v)
          }
        >
          <SelectTrigger
            className="w-[200px]"
            aria-label={dimOpt.dimension.name[locale]}
          >
            <SelectValue placeholder={dimOpt.dimension.name[locale]} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAll")}</SelectItem>
            {dimOpt.nodes.map((node) => (
              <SelectItem key={node.id} value={node.id}>
                {node.depth > 0 ? `${"  ".repeat(node.depth)}${node.name[locale]}` : node.name[locale]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}

      {/* Legacy flat filters (when no hierarchical taxonomy) */}
      {!hasHierarchicalTaxonomy && (
        <>
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
        </>
      )}

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
