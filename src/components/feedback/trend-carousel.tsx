"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { TrendChart } from "./trend-chart";
import type { AthleteTrendData } from "@/lib/feedback/types";

interface TrendCarouselProps {
  trendData: AthleteTrendData[];
}

export function TrendCarousel({ trendData }: TrendCarouselProps) {
  const t = useTranslations("feedback");
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);

  // Track scroll position to update active dot
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function handleScroll() {
      if (!el) return;
      const scrollLeft = el.scrollLeft;
      const itemWidth = el.offsetWidth;
      const index = Math.round(scrollLeft / itemWidth);
      setActiveIndex(index);
    }

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  if (trendData.length === 0) return null;

  return (
    <div className="md:hidden">
      {/* Scrollable container */}
      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory overflow-x-auto gap-3 pb-3 scrollbar-none"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {trendData.map((td) => (
          <div
            key={td.categoryId}
            className="snap-center shrink-0 w-[85vw] rounded-lg border bg-card p-4"
          >
            <TrendChart data={td} height={180} />
          </div>
        ))}
      </div>

      {/* Scroll indicator: dots + swipe hint */}
      <div className="flex items-center justify-center gap-3 mt-2">
        {/* Dots */}
        <div className="flex items-center gap-1.5">
          {trendData.map((td, i) => (
            <button
              key={td.categoryId}
              type="button"
              onClick={() => {
                scrollRef.current?.children[i]?.scrollIntoView({
                  behavior: "smooth",
                  block: "nearest",
                  inline: "center",
                });
              }}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === activeIndex
                  ? "w-4 bg-primary"
                  : "w-1.5 bg-muted-foreground/30"
              )}
              aria-label={`Chart ${i + 1}`}
            />
          ))}
        </div>

        {/* Swipe hint (only on first view, fades after first scroll) */}
        {activeIndex === 0 && trendData.length > 1 && (
          <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground animate-pulse">
            {t("swipeForMore")}
            <ChevronRight className="h-3 w-3" />
          </span>
        )}
      </div>
    </div>
  );
}
