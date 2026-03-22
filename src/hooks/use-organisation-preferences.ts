"use client";

import { useState, useSyncExternalStore, useCallback } from "react";
import type {
  OrganisationViewMode,
  OrganisationSortOption,
  OrganisationPreferences,
} from "@/lib/teams/types";

const STORAGE_KEY = "organisation-view-prefs";

const DEFAULT_PREFS: OrganisationPreferences = {
  viewMode: "grid",
  sortOption: "teams-first",
};

function writePrefs(prefs: OrganisationPreferences): void {
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

/**
 * Manages persisted user preferences for the organisation unified view.
 * Reads/writes to localStorage key "organisation-view-prefs".
 */
export function useOrganisationPreferences() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const prefs = parsePrefs(raw);

  const setViewMode = useCallback(
    (viewMode: OrganisationViewMode) => {
      const next = { ...prefs, viewMode };
      writePrefs(next);
      notifyListeners();
    },
    [prefs]
  );

  const setSortOption = useCallback(
    (sortOption: OrganisationSortOption) => {
      const next = { ...prefs, sortOption };
      writePrefs(next);
      notifyListeners();
    },
    [prefs]
  );

  // isHydrated is always true on client after first render with useSyncExternalStore
  const isHydrated = typeof window !== "undefined";

  return {
    viewMode: prefs.viewMode,
    sortOption: prefs.sortOption,
    setViewMode,
    setSortOption,
    isHydrated,
  };
}

function parsePrefs(raw: string): OrganisationPreferences {
  try {
    const parsed = JSON.parse(raw);
    const validViews: OrganisationViewMode[] = ["grid", "table", "kanban"];
    const validSorts: OrganisationSortOption[] = [
      "teams-first",
      "athletes-first",
      "name-asc",
      "name-desc",
      "status",
    ];
    return {
      viewMode: validViews.includes(parsed.viewMode)
        ? parsed.viewMode
        : DEFAULT_PREFS.viewMode,
      sortOption: validSorts.includes(parsed.sortOption)
        ? parsed.sortOption
        : DEFAULT_PREFS.sortOption,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}
