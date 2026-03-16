"use client";

import { useSyncExternalStore, useCallback } from "react";
import type {
  MonitoringViewMode,
  MonitoringTimeRange,
  FeedbackPreferences,
} from "@/lib/feedback/types";

const STORAGE_KEY = "feedback-monitoring-prefs";

const DEFAULT_PREFS: FeedbackPreferences = {
  viewMode: "card-grid",
  timeRange: "30",
  filterTeam: "all",
  filterStatus: "all",
};

const VALID_VIEWS: MonitoringViewMode[] = [
  "card-grid",
  "table",
  "alert",
  "trend",
  "calendar",
  "heatmap",
  "feed",
  "ranking",
];

const VALID_TIME_RANGES: MonitoringTimeRange[] = ["7", "30", "90"];

function readPrefs(): FeedbackPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return {
      viewMode: VALID_VIEWS.includes(parsed.viewMode)
        ? parsed.viewMode
        : DEFAULT_PREFS.viewMode,
      timeRange: VALID_TIME_RANGES.includes(parsed.timeRange)
        ? parsed.timeRange
        : DEFAULT_PREFS.timeRange,
      filterTeam:
        typeof parsed.filterTeam === "string"
          ? parsed.filterTeam
          : DEFAULT_PREFS.filterTeam,
      filterStatus:
        typeof parsed.filterStatus === "string"
          ? parsed.filterStatus
          : DEFAULT_PREFS.filterStatus,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function writePrefs(prefs: FeedbackPreferences): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage full or blocked
  }
}

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

function parsePrefs(raw: string): FeedbackPreferences {
  try {
    const parsed = JSON.parse(raw);
    return {
      viewMode: VALID_VIEWS.includes(parsed.viewMode)
        ? parsed.viewMode
        : DEFAULT_PREFS.viewMode,
      timeRange: VALID_TIME_RANGES.includes(parsed.timeRange)
        ? parsed.timeRange
        : DEFAULT_PREFS.timeRange,
      filterTeam:
        typeof parsed.filterTeam === "string"
          ? parsed.filterTeam
          : DEFAULT_PREFS.filterTeam,
      filterStatus:
        typeof parsed.filterStatus === "string"
          ? parsed.filterStatus
          : DEFAULT_PREFS.filterStatus,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

/**
 * Manages persisted user preferences for the feedback monitoring dashboard.
 * Reads/writes to localStorage key "feedback-monitoring-prefs".
 */
export function useFeedbackPreferences() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const prefs = parsePrefs(raw);

  const setViewMode = useCallback(
    (viewMode: MonitoringViewMode) => {
      writePrefs({ ...prefs, viewMode });
      notifyListeners();
    },
    [prefs]
  );

  const setTimeRange = useCallback(
    (timeRange: MonitoringTimeRange) => {
      writePrefs({ ...prefs, timeRange });
      notifyListeners();
    },
    [prefs]
  );

  const setFilterTeam = useCallback(
    (filterTeam: string) => {
      writePrefs({ ...prefs, filterTeam });
      notifyListeners();
    },
    [prefs]
  );

  const setFilterStatus = useCallback(
    (filterStatus: string) => {
      writePrefs({ ...prefs, filterStatus });
      notifyListeners();
    },
    [prefs]
  );

  const isHydrated = typeof window !== "undefined";

  return {
    ...prefs,
    setViewMode,
    setTimeRange,
    setFilterTeam,
    setFilterStatus,
    isHydrated,
  };
}
