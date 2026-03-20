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

/** Axis width for each Y-axis */
const AXIS_WIDTH = 42;

interface UnifiedTrendChartProps {
  trendData: AthleteTrendData[];
  className?: string;
  /** Callback to open fullscreen view — renders expand button inside chart area */
  onExpand?: () => void;
}

/** Custom tooltip that shows colored dots + category name + value + unit */
function CustomTooltip({
  active,
  payload,
  label,
  activeTrends,
  colorMap,
  locale,
  getName,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number | null }>;
  label?: string;
  activeTrends: AthleteTrendData[];
  colorMap: Map<string, string>;
  locale: string;
  getName: (td: AthleteTrendData) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="rounded-lg border bg-card px-3 py-2 shadow-md"
      style={{ fontSize: "12px" }}
    >
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((entry) => {
        const td = activeTrends.find((t) => t.categoryId === entry.dataKey);
        if (!td || entry.value === null || entry.value === undefined)
          return null;
        const color = colorMap.get(td.categoryId)!;
        const name = getName(td);
        const formatted =
          typeof entry.value === "number"
            ? entry.value.toLocaleString(
                locale === "en" ? "en-US" : "de-AT"
              )
            : entry.value;
        return (
          <div
            key={entry.dataKey}
            className="flex items-center gap-2 py-0.5"
          >
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-muted-foreground">{name}</span>
            <span className="ml-auto font-medium tabular-nums pl-3">
              {formatted}
              {td.unit ? ` ${td.unit}` : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
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

  const getName = React.useCallback(
    (td: AthleteTrendData) =>
      locale === "en" ? td.categoryName.en : td.categoryName.de,
    [locale]
  );

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

  // Compute axis layout: alternating left/right, with offsets for 3rd/4th
  const axisLayout = React.useMemo(() => {
    return activeTrends.map((td, index) => {
      const color = colorMap.get(td.categoryId)!;
      const isScale = td.categoryType === "scale";
      // 0 → left, 1 → right, 2 → left (outer), 3 → right (outer)
      const orientation: "left" | "right" =
        index % 2 === 0 ? "left" : "right";
      const isOuter = index >= 2;

      return {
        categoryId: td.categoryId,
        categoryType: td.categoryType,
        unit: td.unit,
        color,
        orientation,
        isOuter,
        isScale,
        domain: isScale
          ? ([0, "dataMax + 1"] as [number, string])
          : (["auto", "auto"] as [string, string]),
      };
    });
  }, [activeTrends, colorMap]);

  // Dynamic margins based on number of axes
  const chartMargins = React.useMemo(() => {
    const leftAxes = axisLayout.filter((a) => a.orientation === "left").length;
    const rightAxes = axisLayout.filter(
      (a) => a.orientation === "right"
    ).length;

    return {
      top: 8,
      right: rightAxes > 0 ? rightAxes * AXIS_WIDTH : 12,
      bottom: isMobile ? 4 : 8,
      left: leftAxes > 0 ? leftAxes * AXIS_WIDTH : 12,
    };
  }, [axisLayout, isMobile]);

  const chartHeight = isMobile ? 240 : 360;
  const isSparse = chartData.length < 3;

  // Minimum chart width for mobile scrolling: ensure all axes fit
  const minChartWidth = React.useMemo(() => {
    if (!isMobile) return undefined;
    const axisCount = activeTrends.length;
    if (axisCount <= 2) return undefined; // fits fine
    // For 3-4 axes on mobile, ensure minimum width
    return Math.max(480, 280 + axisCount * AXIS_WIDTH * 2);
  }, [isMobile, activeTrends.length]);

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
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border border-dashed p-8",
          className
        )}
      >
        <p className="text-sm text-muted-foreground">{t("noTrendData")}</p>
      </div>
    );
  }

  function scrollChips(direction: -1 | 1) {
    chipsRef.current?.scrollBy({ left: direction * 200, behavior: "smooth" });
  }

  const chartContent = (
    <ResponsiveContainer
      width={minChartWidth ?? "100%"}
      height={chartHeight}
    >
      <ComposedChart data={chartData} margin={chartMargins}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />

        <XAxis
          dataKey="label"
          tick={{ fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval={isMobile ? "preserveStartEnd" : "preserveEnd"}
          angle={chartData.length > 14 && isMobile ? -30 : 0}
          textAnchor={
            chartData.length > 14 && isMobile ? "end" : "middle"
          }
          height={chartData.length > 14 && isMobile ? 40 : 30}
        />

        {/* Independent Y-axis per active category */}
        {axisLayout.map((axis) => (
          <YAxis
            key={axis.categoryId}
            yAxisId={axis.categoryId}
            orientation={axis.orientation}
            tick={{ fill: axis.color, fontSize: 10 }}
            axisLine={{ stroke: axis.color, strokeWidth: 1.5 }}
            tickLine={{ stroke: axis.color }}
            width={AXIS_WIDTH}
            domain={axis.domain}
            allowDecimals={!axis.isScale}
            label={
              axis.unit
                ? {
                    value: axis.unit,
                    angle: axis.orientation === "left" ? -90 : 90,
                    position:
                      axis.orientation === "left"
                        ? "insideLeft"
                        : "insideRight",
                    fill: axis.color,
                    fontSize: 10,
                    dy: -10,
                  }
                : undefined
            }
          />
        ))}

        <Tooltip
          content={
            <CustomTooltip
              activeTrends={activeTrends}
              colorMap={colorMap}
              locale={locale}
              getName={getName}
            />
          }
        />

        {/* Series */}
        {activeTrends.map((td) => {
          const color = colorMap.get(td.categoryId)!;
          const name = getName(td);
          const label = td.unit ? `${name} (${td.unit})` : name;
          const dotSize =
            chartData.length < 7 ? 4 : isMobile ? 2 : 3;

          if (td.categoryType === "scale") {
            return (
              <Bar
                key={td.categoryId}
                dataKey={td.categoryId}
                yAxisId={td.categoryId}
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
              yAxisId={td.categoryId}
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
  );

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
                    backgroundColor: isActive
                      ? "rgba(255,255,255,0.6)"
                      : isFull
                        ? "transparent"
                        : color,
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
          <p className="text-sm text-muted-foreground">
            {t("selectCategories")}
          </p>
        </div>
      ) : isSparse ? (
        /* Too few data points — show values as summary instead of empty chart */
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-3">
            {t("tooFewDataPoints")}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {activeTrends.map((td) => {
              const color = colorMap.get(td.categoryId)!;
              const name = getName(td);
              const lastPoint = td.data
                .filter((d) => d.value !== null)
                .at(-1);
              return (
                <div key={td.categoryId} className="text-center">
                  <span className="text-[11px] text-muted-foreground block">
                    {name}
                  </span>
                  <span
                    className="text-xl font-semibold tabular-nums"
                    style={{ color }}
                  >
                    {lastPoint?.value ?? "\u2013"}
                  </span>
                  {td.unit && (
                    <span className="text-xs text-muted-foreground ml-1">
                      {td.unit}
                    </span>
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
              className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-md border bg-card/90 backdrop-blur-sm shadow-sm hover:bg-muted transition-colors"
              aria-label={t("expandChart")}
            >
              <Maximize2 className="h-4 w-4 text-foreground" />
            </button>
          )}

          {/* Horizontally scrollable wrapper for mobile when 3-4 axes active */}
          {minChartWidth ? (
            <div
              className="overflow-x-auto -mx-3 px-3 sm:-mx-4 sm:px-4"
              style={{ scrollbarWidth: "thin" }}
            >
              {chartContent}
            </div>
          ) : (
            chartContent
          )}

          {/* Color legend below chart */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 px-1">
            {activeTrends.map((td) => {
              const color = colorMap.get(td.categoryId)!;
              const name = getName(td);
              return (
                <div
                  key={td.categoryId}
                  className="flex items-center gap-1.5"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-[11px] text-muted-foreground">
                    {name}
                    {td.unit ? ` (${td.unit})` : ""}
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
