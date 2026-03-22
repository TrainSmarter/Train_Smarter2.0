"use client";

import { useSyncExternalStore, useCallback } from "react";

// ── Types ───────────────────────────────────────────────────────

export type ExerciseViewMode = "grid" | "table" | "compact";
export type ExerciseSortOption = "az" | "za" | "newest" | "oldest" | "category";

export interface ExerciseLibraryPreferences {
  viewMode: ExerciseViewMode;
  sortOption: ExerciseSortOption;
  pageSize: number;
  filtersExpanded: boolean;
}

// ── Storage ─────────────────────────────────────────────────────

const STORAGE_KEY = "exercise-library-prefs";

const DEFAULT_PREFS: ExerciseLibraryPreferences = {
  viewMode: "grid",
  sortOption: "az",
  pageSize: 24,
  filtersExpanded: true,
};

const VALID_VIEWS: ExerciseViewMode[] = ["grid", "table", "compact"];
const VALID_SORTS: ExerciseSortOption[] = ["az", "za", "newest", "oldest", "category"];
const VALID_PAGE_SIZES = [24, 48, 96];

function writePrefs(prefs: ExerciseLibraryPreferences): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage full or blocked — silently ignore
  }
}

// Use a simple subscription pattern for useSyncExternalStore
let listeners: Array<() => void> = [];
function subscribe(callback: () => void) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
}
function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

function getSnapshot(): string {
  if (typeof window === "undefined") return JSON.stringify(DEFAULT_PREFS);
  return localStorage.getItem(STORAGE_KEY) ?? JSON.stringify(DEFAULT_PREFS);
}

function getServerSnapshot(): string {
  return JSON.stringify(DEFAULT_PREFS);
}

function parsePrefs(raw: string): ExerciseLibraryPreferences {
  try {
    const parsed = JSON.parse(raw);
    return {
      viewMode: VALID_VIEWS.includes(parsed.viewMode)
        ? parsed.viewMode
        : DEFAULT_PREFS.viewMode,
      sortOption: VALID_SORTS.includes(parsed.sortOption)
        ? parsed.sortOption
        : DEFAULT_PREFS.sortOption,
      pageSize: VALID_PAGE_SIZES.includes(parsed.pageSize)
        ? parsed.pageSize
        : DEFAULT_PREFS.pageSize,
      filtersExpanded:
        typeof parsed.filtersExpanded === "boolean"
          ? parsed.filtersExpanded
          : DEFAULT_PREFS.filtersExpanded,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

// ── Hook ────────────────────────────────────────────────────────

/**
 * Manages persisted user preferences for the exercise library.
 * Reads/writes to localStorage key "exercise-library-prefs".
 */
export function useExerciseLibraryPreferences() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const prefs = parsePrefs(raw);

  const setViewMode = useCallback((viewMode: ExerciseViewMode) => {
    const current = parsePrefs(getSnapshot());
    writePrefs({ ...current, viewMode });
    notifyListeners();
  }, []);

  const setSortOption = useCallback((sortOption: ExerciseSortOption) => {
    const current = parsePrefs(getSnapshot());
    writePrefs({ ...current, sortOption });
    notifyListeners();
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    const current = parsePrefs(getSnapshot());
    writePrefs({ ...current, pageSize });
    notifyListeners();
  }, []);

  const setFiltersExpanded = useCallback((filtersExpanded: boolean) => {
    const current = parsePrefs(getSnapshot());
    writePrefs({ ...current, filtersExpanded });
    notifyListeners();
  }, []);

  const isHydrated = typeof window !== "undefined";

  return {
    viewMode: prefs.viewMode,
    sortOption: prefs.sortOption,
    pageSize: prefs.pageSize,
    filtersExpanded: prefs.filtersExpanded,
    setViewMode,
    setSortOption,
    setPageSize,
    setFiltersExpanded,
    isHydrated,
  };
}
