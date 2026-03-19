"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Brush,
} from "recharts";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import type { AthleteTrendData } from "@/lib/feedback/types";

/** Chart color palette from design system */
const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
  "hsl(var(--chart-7))",
  "hsl(var(--chart-8))",
];

const MAX_ACTIVE = 4;

interface UnifiedTrendChartProps {
  trendData: AthleteTrendData[];
  className?: string;
  /** Callback to open fullscreen view — renders expand button inside chart area */
  onExpand?: () => void;
}

export function UnifiedTrendChart({
  trendData,
  className,
  onExpand,
}: UnifiedTrendChartProps) {
  const t = useTranslations("feedback");
  const locale = useLocale();
  const isMobile = useIsMobile();

  const [activeIds, setActiveIds] = React.useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (let i = 0; i < Math.min(trendData.length, 2); i++) {
      initial.add(trendData[i].categoryId);
    }
    return initial;
  });

  function toggleCategory(id: string) {
    setActiveIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_ACTIVE) {
        next.add(id);
      }
      return next;
    });
  }

  // Stable color assignment
  const colorMap = React.useMemo(() => {
    const map = new Map<string, string>();
    trendData.forEach((td, i) => {
      map.set(td.categoryId, CHART_COLORS[i % CHART_COLORS.length]);
    });
    return map;
  }, [trendData]);

  const getName = (td: AthleteTrendData) =>
    locale === "en" ? td.categoryName.en : td.categoryName.de;

  const activeTrends = React.useMemo(() => {
    const ordered: AthleteTrendData[] = [];
    for (const id of activeIds) {
      const td = trendData.find((t) => t.categoryId === id);
      if (td) ordered.push(td);
    }
    return ordered;
  }, [activeIds, trendData]);

  // Build unified chart data
  const chartData = React.useMemo(() => {
    const dateMap = new Map<string, Record<string, number | null>>();
    for (const trend of activeTrends) {
      for (const point of trend.data) {
        if (!dateMap.has(point.date)) {
          dateMap.set(point.date, {});
        }
        dateMap.get(point.date)![trend.categoryId] = point.value;
      }
    }
    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({
        date,
        label: new Date(date).toLocaleDateString(
          locale === "en" ? "en-US" : "de-AT",
          { day: "numeric", month: "short" }
        ),
        ...values,
      }));
  }, [activeTrends, locale]);

  // Two shared axes: "number" (left) and "scale" (right)
  const hasNumberAxis = activeTrends.some((td) => td.categoryType === "number");
  const hasScaleAxis = activeTrends.some((td) => td.categoryType === "scale");

  const chartHeight = isMobile ? 240 : 360;
  const isSparse = chartData.length < 3;

  // Chip scroll state — must be declared before any early returns (React hooks rules)
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

  if (trendData.length === 0) {
    return (
      <div className={cn("flex items-center justify-center rounded-lg border border-dashed p-8", className)}>
        <p className="text-sm text-muted-foreground">{t("noTrendData")}</p>
      </div>
    );
  }

  function scrollChips(direction: -1 | 1) {
    chipsRef.current?.scrollBy({ left: direction * 200, behavior: "smooth" });
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Toggle chips — scrollable row with arrows on desktop */}
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
            const isFull = !isActive && activeIds.size >= MAX_ACTIVE;

            return (
              <button
                key={td.categoryId}
                type="button"
                onClick={() => toggleCategory(td.categoryId)}
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
                    backgroundColor: isActive ? "rgba(255,255,255,0.6)" : isFull ? "transparent" : color,
                    opacity: isFull ? 0.3 : 1,
                  }}
                />
                {name}
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

      {/* No categories selected */}
      {activeTrends.length === 0 ? (
        <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
          <p className="text-sm text-muted-foreground">{t("selectCategories")}</p>
        </div>
      ) : isSparse ? (
        /* Too few data points — show values as summary instead of empty chart */
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-3">{t("tooFewDataPoints")}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {activeTrends.map((td) => {
              const color = colorMap.get(td.categoryId)!;
              const name = getName(td);
              const lastPoint = td.data.filter((d) => d.value !== null).at(-1);
              return (
                <div key={td.categoryId} className="text-center">
                  <span className="text-[11px] text-muted-foreground block">{name}</span>
                  <span className="text-xl font-semibold tabular-nums" style={{ color }}>
                    {lastPoint?.value ?? "–"}
                  </span>
                  {td.unit && (
                    <span className="text-xs text-muted-foreground ml-1">{td.unit}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Chart with data */
        <div className="relative rounded-lg border bg-card p-3 sm:p-4">
          {/* Expand button — top-right inside chart area */}
          {onExpand && (
            <button
              type="button"
              onClick={onExpand}
              className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-md bg-card/80 backdrop-blur-sm hover:bg-muted transition-colors"
              aria-label={t("expandChart")}
            >
              <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
          <ResponsiveContainer width="100%" height={chartHeight}>
            <ComposedChart
              data={chartData}
              margin={{
                top: 8,
                right: hasScaleAxis ? 4 : 12,
                bottom: isMobile ? 4 : 8,
                left: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />

              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={isMobile ? "preserveStartEnd" : "preserveEnd"}
                angle={chartData.length > 14 && isMobile ? -30 : 0}
                textAnchor={chartData.length > 14 && isMobile ? "end" : "middle"}
                height={chartData.length > 14 && isMobile ? 40 : 30}
              />

              {/* Left Y-axis: numeric values (shared for all number types) */}
              {hasNumberAxis && (
                <YAxis
                  yAxisId="number"
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={38}
                  domain={["auto", "auto"]}
                />
              )}

              {/* Right Y-axis: scale values (shared, 0-based) */}
              {hasScaleAxis && (
                <YAxis
                  yAxisId="scale"
                  orientation="right"
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                  domain={[0, "dataMax + 1"]}
                  allowDecimals={false}
                />
              )}

              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                  fontSize: "12px",
                  padding: "8px 12px",
                }}
                labelStyle={{ fontWeight: 600, marginBottom: 4 }}
              />

              {/* Series */}
              {activeTrends.map((td) => {
                const color = colorMap.get(td.categoryId)!;
                const yAxisId = td.categoryType === "scale" ? "scale" : "number";
                const name = getName(td);
                const label = td.unit ? `${name} (${td.unit})` : name;
                const dotSize = chartData.length < 7 ? 4 : isMobile ? 2 : 3;

                if (td.categoryType === "scale") {
                  return (
                    <Bar
                      key={td.categoryId}
                      dataKey={td.categoryId}
                      yAxisId={yAxisId}
                      name={label}
                      fill={color}
                      fillOpacity={0.25}
                      stroke={color}
                      strokeWidth={1}
                      radius={[3, 3, 0, 0]}
                      maxBarSize={20}
                    />
                  );
                }

                return (
                  <Line
                    key={td.categoryId}
                    type="monotone"
                    dataKey={td.categoryId}
                    yAxisId={yAxisId}
                    name={label}
                    stroke={color}
                    strokeWidth={2}
                    dot={{ r: dotSize, fill: color }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                );
              })}

              {/* Brush zoom (desktop, >14 points) */}
              {!isMobile && chartData.length > 14 && (
                <Brush
                  dataKey="label"
                  height={24}
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--muted))"
                  travellerWidth={8}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>

          {/* Color legend below chart */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 px-1">
            {activeTrends.map((td) => {
              const color = colorMap.get(td.categoryId)!;
              const name = getName(td);
              return (
                <div key={td.categoryId} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-[11px] text-muted-foreground">
                    {name}{td.unit ? ` (${td.unit})` : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
