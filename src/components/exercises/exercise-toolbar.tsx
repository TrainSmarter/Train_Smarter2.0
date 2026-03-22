"use client";

import { useTranslations } from "next-intl";
import {
  Search,
  LayoutGrid,
  Table2,
  Grid3X3,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ExerciseViewMode } from "@/hooks/use-exercise-library-preferences";

interface ExerciseToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  viewMode: ExerciseViewMode;
  onViewModeChange: (mode: ExerciseViewMode) => void;
  filtersExpanded: boolean;
  onFiltersExpandedChange: (expanded: boolean) => void;
  activeFilterCount: number;
}

const VIEW_MODES = [
  { value: "grid" as const, icon: LayoutGrid, labelKey: "viewGrid" as const },
  { value: "table" as const, icon: Table2, labelKey: "viewTable" as const },
  {
    value: "compact" as const,
    icon: Grid3X3,
    labelKey: "viewCompact" as const,
  },
];

export function ExerciseToolbar({
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
  filtersExpanded,
  onFiltersExpandedChange,
  activeFilterCount,
}: ExerciseToolbarProps) {
  const t = useTranslations("exercises");
  const tCommon = useTranslations("common");

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      {/* Unified Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("searchUnifiedPlaceholder")}
          aria-label={tCommon("search")}
          className="pl-9"
        />
      </div>

      <div className="flex items-center gap-2">
        {/* Filter Toggle Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onFiltersExpandedChange(!filtersExpanded)}
          aria-expanded={filtersExpanded}
          className="gap-1.5"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>
            {activeFilterCount > 0
              ? t("filtersCount", { count: activeFilterCount })
              : t("filtersToggle")}
          </span>
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {/* View Mode Switcher */}
        <div
          role="radiogroup"
          aria-label={t("viewSwitcher")}
          className="inline-flex items-center rounded-md border bg-muted p-0.5"
        >
          {VIEW_MODES.map(({ value, icon: Icon, labelKey }) => {
            const isActive = viewMode === value;
            return (
              <button
                key={value}
                role="radio"
                aria-checked={isActive}
                aria-label={t(labelKey)}
                onClick={() => onViewModeChange(value)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t(labelKey)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
