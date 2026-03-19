"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CheckinForm } from "./checkin-form";
import { WeekStrip } from "./week-strip";
import { UnifiedTrendChart } from "./unified-trend-chart";
import { StreakBadge } from "./streak-badge";
import { CategoryManager } from "./category-manager";
import { loadWeekCheckins } from "@/lib/feedback/actions";
import { computeStreak } from "@/lib/feedback/dot-color";
import type {
  ActiveCategory,
  BackfillMode,
  CheckinEntry,
  AthleteTrendData,
} from "@/lib/feedback/types";

interface AthleteCheckinPageProps {
  /** Active categories for this athlete */
  categories: ActiveCategory[];
  /** Check-ins for the initial week, keyed by date (ISO string) */
  weekCheckins: Record<string, CheckinEntry>;
  /** Whether the athlete can see their analysis charts */
  canSeeAnalysis: boolean;
  /** Current streak */
  streak: number;
  /** Trend data for charts (only loaded if canSeeAnalysis) */
  trendData: AthleteTrendData[];
  /** Backfill mode controlling how far back entries can be made */
  backfillMode: BackfillMode;
  /** Whether athlete has body_wellness_data consent */
  hasBodyWellnessConsent: boolean;
  /** ISO date of the Monday of the initial week */
  initialWeekStart: string;
  /** IDs of categories that are required AND active for this athlete */
  requiredCategoryIds?: string[];
}

export function AthleteCheckinPage({
  categories,
  weekCheckins,
  canSeeAnalysis,
  streak,
  trendData,
  backfillMode,
  hasBodyWellnessConsent,
  initialWeekStart,
  requiredCategoryIds,
}: AthleteCheckinPageProps) {
  const t = useTranslations("feedback");
  const [showCategoryManager, setShowCategoryManager] = React.useState(false);
  const [showFullscreenChart, setShowFullscreenChart] = React.useState(false);

  // Today's date
  const today = new Date().toISOString().split("T")[0];

  // Selected date: default to today
  const [selectedDate, setSelectedDate] = React.useState(today);

  // Local cache of all loaded check-ins (date -> CheckinEntry)
  const [checkins, setCheckins] = React.useState<Record<string, CheckinEntry>>(
    weekCheckins
  );

  // Local trend data state — updated optimistically on save
  const [localTrendData, setLocalTrendData] =
    React.useState<AthleteTrendData[]>(trendData);

  // Track which weeks have been loaded to avoid re-fetching + suppress red flash
  const [loadedWeekStarts, setLoadedWeekStarts] = React.useState<Set<string>>(
    () => new Set([initialWeekStart])
  );

  // Derived: set of dates that have data (for WeekStrip dots)
  const filledDates = React.useMemo(
    () => new Set(Object.keys(checkins)),
    [checkins]
  );

  // Current check-in for selected date
  const currentCheckin = checkins[selectedDate] ?? null;

  // Handle week navigation — load new week's check-ins if not already cached
  async function handleWeekChange(startDate: string, endDate: string) {
    if (loadedWeekStarts.has(startDate)) return;

    try {
      const newCheckins = await loadWeekCheckins(startDate, endDate);
      setLoadedWeekStarts((prev) => new Set([...prev, startDate]));
      setCheckins((prev) => ({ ...prev, ...newCheckins }));
    } catch (err) {
      console.error("Failed to load week check-ins:", err);
    }
  }

  // Handle field saved — update local cache + trend chart
  function handleFieldSaved(
    categoryId: string,
    numericValue: number | null,
    textValue: string | null
  ) {
    setCheckins((prev) => {
      const existing = prev[selectedDate];
      const updatedValues = {
        ...(existing?.values ?? {}),
        [categoryId]: { numericValue, textValue },
      };

      return {
        ...prev,
        [selectedDate]: {
          id: existing?.id ?? crypto.randomUUID(),
          date: selectedDate,
          values: updatedValues,
          createdAt: existing?.createdAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
    });

    // Update trend chart if the category exists in trend data
    if (numericValue !== null) {
      setLocalTrendData((prev) =>
        prev.map((td) => {
          if (td.categoryId !== categoryId) return td;

          const existingIdx = td.data.findIndex(
            (dp) => dp.date === selectedDate
          );
          const updatedData =
            existingIdx >= 0
              ? td.data.map((dp, i) =>
                  i === existingIdx ? { ...dp, value: numericValue } : dp
                )
              : [...td.data, { date: selectedDate, value: numericValue }].sort(
                  (a, b) => a.date.localeCompare(b.date)
                );

          return { ...td, data: updatedData };
        })
      );
    }
  }

  // Compute streak client-side from checkin data (updates live on save)
  const liveStreak = React.useMemo(
    () => computeStreak(checkins, requiredCategoryIds, today),
    [checkins, requiredCategoryIds, today]
  );

  const showTrends = canSeeAnalysis && localTrendData.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <h1 className="text-h1 text-foreground">{t("checkinTitle")}</h1>
          <p className="text-body-lg text-muted-foreground">
            {t("checkinSubtitle")}
          </p>
        </div>
        {liveStreak > 0 && <StreakBadge streak={liveStreak} className="mt-1" />}
      </div>

      {/* DSGVO consent warning */}
      {!hasBodyWellnessConsent && (
        <div className="rounded-lg border border-warning/50 bg-warning/10 p-4">
          <p className="text-sm text-warning-foreground">
            {t("consentRevoked")}
          </p>
        </div>
      )}

      {/* Main content: 2-column on desktop when trends are visible */}
      {hasBodyWellnessConsent && (
        <div
          className={cn(
            "gap-6",
            showTrends
              ? "lg:grid lg:grid-cols-[1fr_1fr] xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
              : ""
          )}
        >
          {/* Left column: Week Strip + Check-in Form */}
          <div>
            <WeekStrip
              selectedDate={selectedDate}
              filledDates={filledDates}
              onSelectDate={setSelectedDate}
              onWeekChange={handleWeekChange}
              requiredCategoryIds={requiredCategoryIds}
              checkinValues={checkins}
              loadedWeekStarts={loadedWeekStarts}
            />
            <div className="mt-4 rounded-lg border bg-card p-5">
              <CheckinForm
                key={selectedDate}
                categories={categories}
                date={selectedDate}
                existingValues={currentCheckin?.values}
                onFieldSaved={handleFieldSaved}
                onManageCategories={() => setShowCategoryManager(true)}
                backfillMode={backfillMode}
              />
            </div>
          </div>

          {/* Right column: Unified Trend Chart (sticky centered on desktop) */}
          {showTrends && (
            <div className="mt-6 lg:mt-0">
              <div className="lg:sticky lg:top-[max(1.5rem,calc(50vh-250px))]">
                <h2 className="text-h3 text-foreground mb-3">{t("myTrends")}</h2>
                <UnifiedTrendChart
                  trendData={localTrendData}
                  onExpand={() => setShowFullscreenChart(true)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fullscreen Chart Dialog */}
      {showTrends && (
        <Dialog open={showFullscreenChart} onOpenChange={setShowFullscreenChart}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-5xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
            <DialogHeader>
              <DialogTitle>{t("myTrends")}</DialogTitle>
            </DialogHeader>
            <div className="min-w-0 w-full">
              <UnifiedTrendChart trendData={localTrendData} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Category Manager Dialog */}
      <Dialog open={showCategoryManager} onOpenChange={setShowCategoryManager}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              {t("manageCategories")}
            </DialogTitle>
          </DialogHeader>
          <CategoryManager categories={categories} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
