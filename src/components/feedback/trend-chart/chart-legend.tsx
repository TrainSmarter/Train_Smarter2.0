"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AthleteTrendData } from "@/lib/feedback/types";

interface ChartLegendProps {
  trendData: AthleteTrendData[];
  activeIds: Set<string>;
  colorMap: Map<string, string>;
  maxActive: number;
  getName: (td: AthleteTrendData) => string;
  onToggle: (id: string) => void;
}

/** Scrollable chip row for toggling trend categories */
export function ChartLegend({
  trendData,
  activeIds,
  colorMap,
  maxActive,
  getName,
  onToggle,
}: ChartLegendProps) {
  const t = useTranslations("feedback");
  const chipsRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const updateScrollState = React.useCallback(() => {
    const el = chipsRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  React.useEffect(() => {
    updateScrollState();
    const el = chipsRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateScrollState, trendData]);

  function scrollChips(direction: -1 | 1) {
    chipsRef.current?.scrollBy({ left: direction * 200, behavior: "smooth" });
  }

  return (
    <div className="relative flex items-center gap-1">
      {/* Left arrow (hidden on mobile, shown when scrollable) */}
      {canScrollLeft && (
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:flex h-7 w-7 shrink-0"
          onClick={() => scrollChips(-1)}
          aria-label={t("scrollChipsLeft")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      <div
        ref={chipsRef}
        className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
        onScroll={updateScrollState}
      >
        {trendData.map((td) => {
          const isActive = activeIds.has(td.categoryId);
          const color = colorMap.get(td.categoryId)!;
          const name = getName(td);
          const chipLabel = td.unit ? `${name} (${td.unit})` : name;
          const isFull = !isActive && activeIds.size >= maxActive;

          return (
            <button
              key={td.categoryId}
              type="button"
              onClick={() => onToggle(td.categoryId)}
              disabled={isFull}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all shrink-0",
                "border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "border-transparent text-white shadow-sm"
                  : isFull
                    ? "border-border text-muted-foreground/40 cursor-not-allowed"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              style={isActive ? { backgroundColor: color } : undefined}
              aria-pressed={isActive}
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{
                  backgroundColor: isActive
                    ? "rgba(255,255,255,0.6)"
                    : isFull
                      ? "transparent"
                      : color,
                  opacity: isFull ? 0.3 : 1,
                }}
              />
              {chipLabel}
            </button>
          );
        })}
      </div>

      {/* Right arrow (hidden on mobile, shown when scrollable) */}
      {canScrollRight && (
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:flex h-7 w-7 shrink-0"
          onClick={() => scrollChips(1)}
          aria-label={t("scrollChipsRight")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
