"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useTypedLocale } from "@/hooks/use-typed-locale";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { ExerciseCard } from "./exercise-card";
import { ExerciseCompactCard } from "./exercise-compact-card";
import { ExerciseFilters } from "./exercise-filters";
import { ExerciseFilterChips } from "./exercise-filter-chips";
import { ExercisePagination } from "./exercise-pagination";
import { ExerciseSlideOver } from "./exercise-slide-over";
import { ExerciseTableView } from "./exercise-table-view";
import { ExerciseToolbar } from "./exercise-toolbar";
import { Link } from "@/i18n/navigation";
import { useExerciseLibraryPreferences } from "@/hooks/use-exercise-library-preferences";
import { CATEGORY_LABELS } from "@/lib/exercises/constants";
import { getDescendantIds } from "@/lib/taxonomy/tree-utils";
import type {
  ExerciseWithTaxonomy,
  ExerciseWithCategories,
  TaxonomyEntry,
  ExerciseType,
} from "@/lib/exercises/types";
import type { DimensionWithNodes } from "@/lib/taxonomy/types";
import type { ExerciseSourceFilter } from "./exercise-filters";
import type { FilterChip } from "./exercise-filter-chips";

interface ExerciseLibraryPageProps {
  exercises: ExerciseWithTaxonomy[];
  muscleGroups: TaxonomyEntry[];
  equipment: TaxonomyEntry[];
  isPlatformAdmin?: boolean;
  /** PROJ-20: Taxonomy dimensions with nodes for hierarchical filtering */
  taxonomyData?: DimensionWithNodes[];
}

export function ExerciseLibraryPage({
  exercises,
  muscleGroups,
  equipment,
  isPlatformAdmin = false,
  taxonomyData,
}: ExerciseLibraryPageProps) {
  const t = useTranslations("exercises");
  const locale = useTypedLocale();

  // Persisted preferences
  const {
    viewMode: persistedViewMode,
    sortOption: sort,
    pageSize,
    filtersExpanded,
    isHydrated,
    setViewMode,
    setSortOption,
    setPageSize,
    setFiltersExpanded,
  } = useExerciseLibraryPreferences();

  // Avoid layout flash: use default "grid" until localStorage is hydrated
  const viewMode = isHydrated ? persistedViewMode : "grid";

  // PROJ-20: Whether hierarchical taxonomy is available
  const hasHierarchicalTaxonomy = !!taxonomyData && taxonomyData.length > 0;

  // Local state
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<ExerciseType | "all">("all");
  const [muscleGroupFilter, setMuscleGroupFilter] = React.useState<string[]>([]);
  const [equipmentFilter, setEquipmentFilter] = React.useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = React.useState<ExerciseSourceFilter>("all");
  const [page, setPage] = React.useState(1);
  // PROJ-20: Dimension-based filters (dimensionId -> selected nodeId or empty)
  const [dimensionFilters, setDimensionFilters] = React.useState<Record<string, string>>({});

  // Slide-over state
  const [slideOverOpen, setSlideOverOpen] = React.useState(false);
  const [selectedExercise, setSelectedExercise] = React.useState<ExerciseWithTaxonomy | null>(null);

  // Debounce search (300ms)
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when filters/search/sort change
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryFilter, muscleGroupFilter, equipmentFilter, sourceFilter, sort, dimensionFilters]);

  // Precomputed search index for unified search
  const searchIndex = React.useMemo(
    () =>
      exercises.map((ex) => {
        const exWithCats = ex as ExerciseWithCategories;
        const categoryNames = (exWithCats.categoryAssignments ?? []).flatMap((ca) => [
          ca.nodeName.de,
          ca.nodeName.en,
        ]);
        return {
          exercise: ex,
          searchText: [
            ex.name.de,
            ex.name.en,
            ex.description?.de ?? "",
            ex.description?.en ?? "",
            ...ex.primaryMuscleGroups.flatMap((mg) => [mg.name.de, mg.name.en]),
            ...ex.secondaryMuscleGroups.flatMap((mg) => [mg.name.de, mg.name.en]),
            ...ex.equipment.flatMap((eq) => [eq.name.de, eq.name.en]),
            ...categoryNames,
            t(CATEGORY_LABELS[ex.exerciseType]),
          ]
            .join(" ")
            .toLowerCase(),
        };
      }),
    [exercises, t]
  );

  // Filter + sort exercises
  const filteredExercises = React.useMemo(() => {
    let result = searchIndex.map((entry) => entry);

    // Unified search (multi-term: "Brust Langhantel" matches both independently)
    if (debouncedSearch) {
      const terms = debouncedSearch.toLowerCase().split(/\s+/).filter(Boolean);
      result = result.filter((entry) =>
        terms.every((term) => entry.searchText.includes(term))
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter((entry) => entry.exercise.exerciseType === categoryFilter);
    }

    // Source filter
    if (sourceFilter === "platform") {
      result = result.filter((entry) => entry.exercise.scope === "global");
    } else if (sourceFilter === "own") {
      result = result.filter((entry) => entry.exercise.scope === "trainer");
    }

    // Muscle group filter
    if (muscleGroupFilter.length > 0) {
      result = result.filter((entry) =>
        muscleGroupFilter.some(
          (mgId) =>
            entry.exercise.primaryMuscleGroups.some((mg) => mg.id === mgId) ||
            entry.exercise.secondaryMuscleGroups.some((mg) => mg.id === mgId)
        )
      );
    }

    // Equipment filter
    if (equipmentFilter.length > 0) {
      result = result.filter((entry) =>
        equipmentFilter.some((eqId) =>
          entry.exercise.equipment.some((eq) => eq.id === eqId)
        )
      );
    }

    // PROJ-20: Dimension-based filters (subtree matching)
    if (hasHierarchicalTaxonomy && taxonomyData) {
      for (const [dimId, selectedNodeId] of Object.entries(dimensionFilters)) {
        if (!selectedNodeId) continue;
        const dimensionData = taxonomyData.find((d) => d.dimension.id === dimId);
        if (!dimensionData) continue;
        // Get the selected node + all its descendants
        const matchingIds = new Set([
          selectedNodeId,
          ...getDescendantIds(selectedNodeId, dimensionData.nodes),
        ]);
        result = result.filter((entry) => {
          const exWithCats = entry.exercise as ExerciseWithCategories;
          if (!exWithCats.categoryAssignments) return false;
          return exWithCats.categoryAssignments.some(
            (ca) => ca.dimensionId === dimId && matchingIds.has(ca.nodeId)
          );
        });
      }
    }

    // Extract exercises from search entries
    let sorted = result.map((entry) => entry.exercise);

    // Sort
    switch (sort) {
      case "az":
        sorted.sort((a, b) => a.name[locale].localeCompare(b.name[locale]));
        break;
      case "za":
        sorted.sort((a, b) => b.name[locale].localeCompare(a.name[locale]));
        break;
      case "newest":
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "oldest":
        sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "category":
        sorted.sort((a, b) => {
          const catCmp = a.exerciseType.localeCompare(b.exerciseType);
          if (catCmp !== 0) return catCmp;
          return a.name[locale].localeCompare(b.name[locale]);
        });
        break;
    }

    return sorted;
  }, [searchIndex, debouncedSearch, categoryFilter, sourceFilter, muscleGroupFilter, equipmentFilter, sort, locale, dimensionFilters, hasHierarchicalTaxonomy, taxonomyData]);

  // Pagination
  const totalPages = Math.ceil(filteredExercises.length / pageSize);

  // Clamp page if exercises shrink (e.g. after deletion)
  React.useEffect(() => {
    if (page > totalPages && totalPages > 0) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedExercises = filteredExercises.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Active filter count
  const activeDimensionFilterCount = Object.values(dimensionFilters).filter(Boolean).length;
  const activeFilterCount = [
    categoryFilter !== "all" ? 1 : 0,
    muscleGroupFilter.length > 0 ? 1 : 0,
    equipmentFilter.length > 0 ? 1 : 0,
    sourceFilter !== "all" ? 1 : 0,
    activeDimensionFilterCount,
  ].reduce((sum, v) => sum + v, 0);

  // Filter chips
  const filterChips: FilterChip[] = React.useMemo(() => {
    const chips: FilterChip[] = [];

    if (categoryFilter !== "all") {
      chips.push({
        id: `category-${categoryFilter}`,
        label: t(CATEGORY_LABELS[categoryFilter]),
        onRemove: () => setCategoryFilter("all"),
      });
    }

    for (const mgId of muscleGroupFilter) {
      const mg = muscleGroups.find((m) => m.id === mgId);
      if (mg) {
        chips.push({
          id: `muscle-${mgId}`,
          label: mg.name[locale] || mg.name.de,
          onRemove: () =>
            setMuscleGroupFilter((prev) => prev.filter((id) => id !== mgId)),
        });
      }
    }

    for (const eqId of equipmentFilter) {
      const eq = equipment.find((e) => e.id === eqId);
      if (eq) {
        chips.push({
          id: `equipment-${eqId}`,
          label: eq.name[locale] || eq.name.de,
          onRemove: () =>
            setEquipmentFilter((prev) => prev.filter((id) => id !== eqId)),
        });
      }
    }

    if (sourceFilter !== "all") {
      chips.push({
        id: `source-${sourceFilter}`,
        label: sourceFilter === "platform" ? t("sourcePlatform") : t("sourceOwn"),
        onRemove: () => setSourceFilter("all"),
      });
    }

    // PROJ-20: Dimension filter chips
    if (hasHierarchicalTaxonomy && taxonomyData) {
      for (const [dimId, selectedNodeId] of Object.entries(dimensionFilters)) {
        if (!selectedNodeId) continue;
        const dimensionData = taxonomyData.find((d) => d.dimension.id === dimId);
        if (!dimensionData) continue;
        const node = dimensionData.nodes.find((n) => n.id === selectedNodeId);
        if (!node) continue;
        chips.push({
          id: `dim-${dimId}-${selectedNodeId}`,
          label: `${dimensionData.dimension.name[locale]}: ${node.name[locale]}`,
          onRemove: () =>
            setDimensionFilters((prev) => {
              const next = { ...prev };
              delete next[dimId];
              return next;
            }),
        });
      }
    }

    return chips;
  }, [categoryFilter, muscleGroupFilter, equipmentFilter, sourceFilter, muscleGroups, equipment, locale, t, dimensionFilters, hasHierarchicalTaxonomy, taxonomyData]);

  function handleClearAllFilters() {
    setCategoryFilter("all");
    setMuscleGroupFilter([]);
    setEquipmentFilter([]);
    setSourceFilter("all");
    setDimensionFilters({});
  }

  function handleExerciseClick(exercise: ExerciseWithTaxonomy) {
    setSelectedExercise(exercise);
    setSlideOverOpen(true);
  }

  function handleActionComplete() {
    setSlideOverOpen(false);
    setSelectedExercise(null);
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setPage(1);
  }

  const hasAnyExercises = exercises.length > 0;
  const hasResults = filteredExercises.length > 0;

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h1 text-foreground">{t("title")}</h1>
          <p className="mt-1 text-body-lg text-muted-foreground">
            {t("subtitle", { count: exercises.length })}
          </p>
        </div>
        <Button asChild>
          <Link href="/training/exercises/new">
            <Plus className="h-4 w-4" />
            {t("newExercise")}
          </Link>
        </Button>
      </div>

      {/* Toolbar: search + filter toggle + view switcher */}
      <ExerciseToolbar
        search={search}
        onSearchChange={setSearch}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        filtersExpanded={filtersExpanded}
        onFiltersExpandedChange={setFiltersExpanded}
        activeFilterCount={activeFilterCount}
      />

      {/* Collapsible Filters */}
      {filtersExpanded && (
        <ExerciseFilters
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          muscleGroupFilter={muscleGroupFilter}
          onMuscleGroupFilterChange={setMuscleGroupFilter}
          equipmentFilter={equipmentFilter}
          onEquipmentFilterChange={setEquipmentFilter}
          sourceFilter={sourceFilter}
          onSourceFilterChange={setSourceFilter}
          sort={sort}
          onSortChange={setSortOption}
          muscleGroups={muscleGroups}
          equipmentEntries={equipment}
          taxonomyData={taxonomyData}
          dimensionFilters={dimensionFilters}
          onDimensionFilterChange={(dimId, nodeId) =>
            setDimensionFilters((prev) => {
              if (!nodeId) {
                const next = { ...prev };
                delete next[dimId];
                return next;
              }
              return { ...prev, [dimId]: nodeId };
            })
          }
          isPlatformAdmin={isPlatformAdmin}
        />
      )}

      {/* Active Filter Chips */}
      <ExerciseFilterChips chips={filterChips} onClearAll={handleClearAllFilters} />

      {/* Results Info */}
      {hasAnyExercises && (
        <p className="text-sm text-muted-foreground">
          {filteredExercises.length < exercises.length
            ? t("resultCount", {
                filtered: filteredExercises.length,
                total: exercises.length,
              })
            : t("resultCountAll", { total: exercises.length })}
        </p>
      )}

      {/* Empty State: No exercises at all */}
      {!hasAnyExercises && (
        <EmptyState
          className="mt-12"
          icon="&#127947;"
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Button asChild>
              <Link href="/training/exercises/new">
                <Plus className="h-4 w-4" />
                {t("newExercise")}
              </Link>
            </Button>
          }
        />
      )}

      {/* Empty State: No search/filter results */}
      {hasAnyExercises && !hasResults && (
        <EmptyState
          className="mt-12"
          icon="&#128269;"
          title={t("emptySearchTitle")}
          description={t("emptySearchDescription")}
        />
      )}

      {/* Grid View */}
      {hasResults && viewMode === "grid" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedExercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onClick={() => handleExerciseClick(exercise)}
            />
          ))}
        </div>
      )}

      {/* Table View */}
      {hasResults && viewMode === "table" && (
        <ExerciseTableView
          exercises={paginatedExercises}
          sort={sort}
          onSortChange={setSortOption}
          onExerciseClick={handleExerciseClick}
        />
      )}

      {/* Compact View */}
      {hasResults && viewMode === "compact" && (
        <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {paginatedExercises.map((exercise) => (
            <ExerciseCompactCard
              key={exercise.id}
              exercise={exercise}
              onClick={() => handleExerciseClick(exercise)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {hasResults && (
        <ExercisePagination
          currentPage={page}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
      )}

      {/* Quick-Preview Slide-Over */}
      <ExerciseSlideOver
        open={slideOverOpen}
        onOpenChange={setSlideOverOpen}
        exercise={selectedExercise}
        allExercises={exercises}
        onActionComplete={handleActionComplete}
        isPlatformAdmin={isPlatformAdmin}
      />
    </div>
  );
}
