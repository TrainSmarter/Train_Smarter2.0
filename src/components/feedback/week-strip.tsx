"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CheckinEntryValues {
  values: Record<string, { numericValue: number | null; textValue: string | null }>;
}

export interface WeekStripProps {
  /** Currently selected date (ISO string YYYY-MM-DD) */
  selectedDate: string;
  /** Dates that have check-in data (set of ISO date strings) */
  filledDates: Set<string>;
  /** Called when user selects a day */
  onSelectDate: (date: string) => void;
  /** Called when the visible week changes (via arrows), passes Monday ISO date and Sunday ISO date */
  onWeekChange?: (startDate: string, endDate: string) => void;
  /** IDs of categories that are required AND active — used for yellow/green dot logic */
  requiredCategoryIds?: string[];
  /** Full check-in data per date — used with requiredCategoryIds for dot color */
  checkinValues?: Record<string, CheckinEntryValues>;
}

/** Weekday abbreviations per locale (Monday-first, ISO week order) */
const WEEKDAY_ABBR: Record<string, string[]> = {
  de: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
};

/**
 * Returns the Monday of the ISO week containing the given date.
 */
function getMonday(dateStr: string): Date {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay(); // 0=Sun, 1=Mon...6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return monday;
}

/**
 * Format a Date to YYYY-MM-DD (local time, no timezone shift).
 */
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Compute dot color for a given date.
 * - "none": no entries
 * - "green": all required fields filled, OR no required fields and at least one entry
 * - "yellow": has entries but not all required fields filled
 */
function computeDotColor(
  dateStr: string,
  filledDates: Set<string>,
  requiredCategoryIds?: string[],
  checkinValues?: Record<string, CheckinEntryValues>
): "none" | "green" | "yellow" {
  const hasEntry = filledDates.has(dateStr);
  if (!hasEntry) return "none";

  // If no required categories defined, any entry = green (backwards-compatible)
  if (!requiredCategoryIds || requiredCategoryIds.length === 0) return "green";

  // Check if all required categories are filled
  const entry = checkinValues?.[dateStr];
  if (!entry) return "green"; // filledDates says it's filled but no detailed data — assume green

  const allRequiredFilled = requiredCategoryIds.every((catId) => {
    const val = entry.values[catId];
    if (!val) return false;
    // number/scale: numericValue is not null (0 counts as filled)
    return val.numericValue !== null && val.numericValue !== undefined;
  });

  return allRequiredFilled ? "green" : "yellow";
}

export function WeekStrip({
  selectedDate,
  filledDates,
  onSelectDate,
  onWeekChange,
  requiredCategoryIds,
  checkinValues,
}: WeekStripProps) {
  const t = useTranslations("feedback");
  const locale = useLocale();

  const today = toISODate(new Date());
  const dateInputRef = React.useRef<HTMLInputElement>(null);

  // weekStart = Monday of the currently visible week
  const [weekStart, setWeekStart] = React.useState<Date>(() =>
    getMonday(selectedDate)
  );

  // Sync weekStart when selectedDate changes externally
  React.useEffect(() => {
    setWeekStart(getMonday(selectedDate));
  }, [selectedDate]);

  // Build 7 days starting from weekStart (Mon-Sun)
  const days = React.useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return toISODate(d);
    });
  }, [weekStart]);

  const weekdayLabels = WEEKDAY_ABBR[locale] ?? WEEKDAY_ABBR.de;

  // The last day of the visible week
  const lastDay = days[days.length - 1];
  // Cannot go forward past the week containing today
  const canGoForward = lastDay < today;

  const shiftWeek = (direction: -1 | 1) => {
    setWeekStart((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + direction * 7);
      // Notify parent about week change
      if (onWeekChange) {
        const sunday = new Date(next);
        sunday.setDate(next.getDate() + 6);
        onWeekChange(toISODate(next), toISODate(sunday));
      }
      return next;
    });
  };

  return (
    <div
      className="flex items-center gap-1 border-b border-border pb-1"
      role="tablist"
      aria-label={t("weekNavigation")}
    >
      {/* Previous week */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => shiftWeek(-1)}
        aria-label={t("previousWeek")}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Date picker */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => dateInputRef.current?.showPicker()}
        aria-label={t("pickDate")}
      >
        <CalendarDays className="h-4 w-4" />
      </Button>
      <input
        ref={dateInputRef}
        type="date"
        max={today}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          if (e.target.value) {
            onSelectDate(e.target.value);
          }
        }}
      />

      {/* Day cells */}
      <div className="flex flex-1 justify-between">
        {days.map((dateStr, i) => {
          const dayNum = dateStr.split("-")[2].replace(/^0/, "");
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const isFuture = dateStr > today;
          const dotColor = computeDotColor(dateStr, filledDates, requiredCategoryIds, checkinValues);

          return (
            <button
              key={dateStr}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-disabled={isFuture}
              disabled={isFuture}
              onClick={() => onSelectDate(dateStr)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-2 transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected && "border-b-2 border-primary bg-primary/10",
                isToday && "font-semibold",
                isFuture && "pointer-events-none opacity-40",
                !isSelected && !isFuture && "cursor-pointer hover:bg-muted"
              )}
            >
              <span className="text-[11px] uppercase text-muted-foreground">
                {weekdayLabels[i]}
              </span>
              <span className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-sm",
                isToday && !isSelected && "ring-2 ring-primary",
                isToday && isSelected && "ring-2 ring-primary bg-primary/10"
              )}>
                {dayNum}
              </span>
              {/* Entry indicator dot — green=complete, yellow=partial, none=empty */}
              <span
                className={cn(
                  "mt-0.5 h-1.5 w-1.5 rounded-full",
                  dotColor === "green" && "bg-success",
                  dotColor === "yellow" && "bg-warning",
                  dotColor === "none" && "bg-transparent"
                )}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>

      {/* Next week */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => shiftWeek(1)}
        disabled={!canGoForward}
        aria-label={t("nextWeek")}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
