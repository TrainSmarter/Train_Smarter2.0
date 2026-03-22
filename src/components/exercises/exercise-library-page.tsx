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
import type {
  ExerciseWithTaxonomy,
  TaxonomyEntry,
  ExerciseType,
} from "@/lib/exercises/types";
import type { ExerciseSourceFilter } from "./exercise-filters";
import type { FilterChip } from "./exercise-filter-chips";

interface ExerciseLibraryPageProps {
  exercises: ExerciseWithTaxonomy[];
  muscleGroups: TaxonomyEntry[];
  equipment: TaxonomyEntry[];
  isPlatformAdmin?: boolean;
}

export function ExerciseLibraryPage({
  exercises,
  muscleGroups,
  equipment,
  isPlatformAdmin = false,
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

  // Local state
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<ExerciseType | "all">("all");
  const [muscleGroupFilter, setMuscleGroupFilter] = React.useState<string[]>([]);
  const [equipmentFilter, setEquipmentFilter] = React.useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = React.useState<ExerciseSourceFilter>("all");
  const [page, setPage] = React.useState(1);

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
  }, [debouncedSearch, categoryFilter, muscleGroupFilter, equipmentFilter, sourceFilter, sort]);

  // Precomputed search index for unified search
  const searchIndex = React.useMemo(
    () =>
      exercises.map((ex) => ({
        exercise: ex,
        searchText: [
          ex.name.de,
          ex.name.en,
          ex.description?.de ?? "",
          ex.description?.en ?? "",
          ...ex.primaryMuscleGroups.flatMap((mg) => [mg.name.de, mg.name.en]),
          ...ex.secondaryMuscleGroups.flatMap((mg) => [mg.name.de, mg.name.en]),
          ...ex.equipment.flatMap((eq) => [eq.name.de, eq.name.en]),
          t(CATEGORY_LABELS[ex.exerciseType]),
        ]
          .join(" ")
          .toLowerCase(),
      })),
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
  }, [searchIndex, debouncedSearch, categoryFilter, sourceFilter, muscleGroupFilter, equipmentFilter, sort, locale]);

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
  const activeFilterCount = [
    categoryFilter !== "all" ? 1 : 0,
    muscleGroupFilter.length > 0 ? 1 : 0,
    equipmentFilter.length > 0 ? 1 : 0,
    sourceFilter !== "all" ? 1 : 0,
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

    return chips;
  }, [categoryFilter, muscleGroupFilter, equipmentFilter, sourceFilter, muscleGroups, equipment, locale, t]);

  function handleClearAllFilters() {
    setCategoryFilter("all");
    setMuscleGroupFilter([]);
    setEquipmentFilter([]);
    setSourceFilter("all");
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
