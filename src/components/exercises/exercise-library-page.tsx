"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { ExerciseCard } from "./exercise-card";
import { ExerciseFilters } from "./exercise-filters";
import { ExerciseSlideOver } from "./exercise-slide-over";
import type {
  ExerciseWithTaxonomy,
  TaxonomyEntry,
  ExerciseType,
  TaxonomyType,
} from "@/lib/exercises/types";
import type {
  ExerciseViewMode,
  ExerciseSourceFilter,
  ExerciseSortOption,
} from "./exercise-filters";
import { cn } from "@/lib/utils";

interface ExerciseLibraryPageProps {
  exercises: ExerciseWithTaxonomy[];
  muscleGroups: TaxonomyEntry[];
  equipment: TaxonomyEntry[];
}

export function ExerciseLibraryPage({
  exercises: initialExercises,
  muscleGroups: initialMuscleGroups,
  equipment: initialEquipment,
}: ExerciseLibraryPageProps) {
  const t = useTranslations("exercises");
  const locale = useLocale() as "de" | "en";

  // State
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<ExerciseType | "all">("all");
  const [muscleGroupFilter, setMuscleGroupFilter] = React.useState<string[]>([]);
  const [equipmentFilter, setEquipmentFilter] = React.useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = React.useState<ExerciseSourceFilter>("all");
  const [sort, setSort] = React.useState<ExerciseSortOption>("az");
  const [viewMode, setViewMode] = React.useState<ExerciseViewMode>("grid");

  // Slide-over state
  const [slideOverOpen, setSlideOverOpen] = React.useState(false);
  const [slideOverMode, setSlideOverMode] = React.useState<"detail" | "edit" | "create">("detail");
  const [selectedExercise, setSelectedExercise] = React.useState<ExerciseWithTaxonomy | null>(null);

  // Use initial data (server actions revalidate the page on mutations)
  const exercises = initialExercises;
  const muscleGroups = initialMuscleGroups;
  const equipment = initialEquipment;

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Filter + sort exercises
  const filteredExercises = React.useMemo(() => {
    let result = [...exercises];

    // Search (both languages)
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (ex) =>
          ex.name.de.toLowerCase().includes(q) ||
          ex.name.en.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter((ex) => ex.exerciseType === categoryFilter);
    }

    // Source filter
    if (sourceFilter === "platform") {
      result = result.filter((ex) => ex.scope === "global");
    } else if (sourceFilter === "own") {
      result = result.filter((ex) => ex.scope === "trainer");
    }

    // Muscle group filter
    if (muscleGroupFilter.length > 0) {
      result = result.filter((ex) =>
        muscleGroupFilter.some((mgId) =>
          ex.primaryMuscleGroups.some((mg) => mg.id === mgId) ||
          ex.secondaryMuscleGroups.some((mg) => mg.id === mgId)
        )
      );
    }

    // Equipment filter
    if (equipmentFilter.length > 0) {
      result = result.filter((ex) =>
        equipmentFilter.some((eqId) =>
          ex.equipment.some((eq) => eq.id === eqId)
        )
      );
    }

    // Sort
    switch (sort) {
      case "az":
        result.sort((a, b) => a.name[locale].localeCompare(b.name[locale]));
        break;
      case "za":
        result.sort((a, b) => b.name[locale].localeCompare(a.name[locale]));
        break;
      case "newest":
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return result;
  }, [exercises, debouncedSearch, categoryFilter, sourceFilter, muscleGroupFilter, equipmentFilter, sort, locale]);

  const hasAnyExercises = exercises.length > 0;
  const hasResults = filteredExercises.length > 0;

  function handleExerciseClick(exercise: ExerciseWithTaxonomy) {
    setSelectedExercise(exercise);
    setSlideOverMode("detail");
    setSlideOverOpen(true);
  }

  function handleCreateClick() {
    setSelectedExercise(null);
    setSlideOverMode("create");
    setSlideOverOpen(true);
  }

  function handleActionComplete() {
    // Page will be revalidated by server actions
    setSlideOverOpen(false);
    setSelectedExercise(null);
  }

  function handleTaxonomyCreated(_entry: { name: { de: string; en: string }; type: TaxonomyType }) {
    // Page will be revalidated by server action
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h1 text-foreground">{t("title")}</h1>
          <p className="mt-1 text-body-lg text-muted-foreground">
            {t("subtitle", { count: exercises.length })}
          </p>
        </div>
        <Button
          onClick={handleCreateClick}
          iconLeft={<Plus className="h-4 w-4" />}
        >
          {t("newExercise")}
        </Button>
      </div>

      {/* Filters */}
      <ExerciseFilters
        search={search}
        onSearchChange={setSearch}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        muscleGroupFilter={muscleGroupFilter}
        onMuscleGroupFilterChange={setMuscleGroupFilter}
        equipmentFilter={equipmentFilter}
        onEquipmentFilterChange={setEquipmentFilter}
        sourceFilter={sourceFilter}
        onSourceFilterChange={setSourceFilter}
        sort={sort}
        onSortChange={setSort}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        muscleGroups={muscleGroups}
        equipmentEntries={equipment}
      />

      {/* Empty State: No exercises at all */}
      {!hasAnyExercises && (
        <EmptyState
          className="mt-12"
          icon="🏋️"
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Button
              onClick={handleCreateClick}
              iconLeft={<Plus className="h-4 w-4" />}
            >
              {t("newExercise")}
            </Button>
          }
        />
      )}

      {/* Empty State: No search/filter results */}
      {hasAnyExercises && !hasResults && (
        <EmptyState
          className="mt-12"
          icon="🔍"
          title={t("emptySearchTitle")}
          description={t("emptySearchDescription")}
        />
      )}

      {/* Exercise Grid / List */}
      {hasResults && (
        <div
          className={cn(
            viewMode === "grid"
              ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
              : "flex flex-col gap-2"
          )}
        >
          {filteredExercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onClick={() => handleExerciseClick(exercise)}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}

      {/* Slide-Over */}
      <ExerciseSlideOver
        open={slideOverOpen}
        onOpenChange={setSlideOverOpen}
        exercise={selectedExercise}
        mode={slideOverMode}
        onModeChange={setSlideOverMode}
        muscleGroups={muscleGroups}
        equipment={equipment}
        allExercises={exercises}
        onActionComplete={handleActionComplete}
        onTaxonomyCreated={handleTaxonomyCreated}
      />
    </div>
  );
}
