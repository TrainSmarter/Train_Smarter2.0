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
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import type { AthleteTrendData } from "@/lib/feedback/types";

/** Chart color palette from design system (--chart-1 through --chart-8) */
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
  /** All available trend data */
  trendData: AthleteTrendData[];
  /** Additional classes */
  className?: string;
}

export function UnifiedTrendChart({
  trendData,
  className,
}: UnifiedTrendChartProps) {
  const t = useTranslations("feedback");
  const locale = useLocale();
  const isMobile = useIsMobile();

  // Track which categories are toggled on (default: first 2)
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

  // Stable color assignment per category
  const colorMap = React.useMemo(() => {
    const map = new Map<string, string>();
    trendData.forEach((td, i) => {
      map.set(td.categoryId, CHART_COLORS[i % CHART_COLORS.length]);
    });
    return map;
  }, [trendData]);

  const getName = (td: AthleteTrendData) =>
    locale === "en" ? td.categoryName.en : td.categoryName.de;

  // Active trends in selection order (for axis assignment)
  const activeTrends = React.useMemo(() => {
    const ordered: AthleteTrendData[] = [];
    // Preserve insertion order from the Set
    for (const id of activeIds) {
      const td = trendData.find((t) => t.categoryId === id);
      if (td) ordered.push(td);
    }
    return ordered;
  }, [activeIds, trendData]);

  // Build unified chart data: merge all active categories by date
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

  // Assign axes: first 2 active → left side, next 2 → right side
  // Each category gets its own yAxisId for independent scaling
  const axisConfig = React.useMemo(() => {
    const config: Array<{
      td: AthleteTrendData;
      yAxisId: string;
      orientation: "left" | "right";
      color: string;
      axisIndex: number; // 0-based position on its side
    }> = [];

    let leftCount = 0;
    let rightCount = 0;

    activeTrends.forEach((td, i) => {
      const color = colorMap.get(td.categoryId)!;
      if (i < 2) {
        config.push({
          td,
          yAxisId: `axis-${td.categoryId}`,
          orientation: "left",
          color,
          axisIndex: leftCount++,
        });
      } else {
        config.push({
          td,
          yAxisId: `axis-${td.categoryId}`,
          orientation: "right",
          color,
          axisIndex: rightCount++,
        });
      }
    });

    return config;
  }, [activeTrends, colorMap]);

  const chartHeight = isMobile ? 260 : 380;

  // Count axes per side
  const hasRightAxes = axisConfig.some((a) => a.orientation === "right");
  const leftAxisCount = axisConfig.filter((a) => a.orientation === "left").length;
  const rightAxisCount = axisConfig.filter((a) => a.orientation === "right").length;

  if (trendData.length === 0) {
    return (
      <div className={cn("flex items-center justify-center rounded-lg border border-dashed p-8", className)}>
        <p className="text-sm text-muted-foreground">{t("noTrendData")}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Toggle chips */}
      <div className="flex flex-wrap gap-1.5">
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
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all",
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
              {!isActive && (
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: isFull ? undefined : color, opacity: isFull ? 0.3 : 1 }}
                />
              )}
              {name}
              {td.unit && !isActive && (
                <span className="text-muted-foreground/60">({td.unit})</span>
              )}
            </button>
          );
        })}
        {activeIds.size >= MAX_ACTIVE && (
          <span className="text-[11px] text-muted-foreground self-center ml-1">
            {t("maxCategories", { max: MAX_ACTIVE })}
          </span>
        )}
      </div>

      {/* Chart */}
      {activeTrends.length === 0 ? (
        <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
          <p className="text-sm text-muted-foreground">{t("selectCategories")}</p>
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
          <p className="text-sm text-muted-foreground">{t("noTrendData")}</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-3 sm:p-4">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <ComposedChart
              data={chartData}
              margin={{
                top: 8,
                right: hasRightAxes ? 8 : 16,
                bottom: isMobile ? 4 : 8,
                left: 4,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />

              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={isMobile ? "preserveStartEnd" : 0}
                angle={isMobile ? -30 : 0}
                textAnchor={isMobile ? "end" : "middle"}
                height={isMobile ? 40 : 30}
              />

              {/* Individual Y-axes — each category gets its own scale */}
              {axisConfig.map((axis) => {
                const isScale = axis.td.categoryType === "scale";
                // Offset axes on the same side so they don't overlap
                const axisWidth = isMobile ? 35 : 45;
                const offset = axis.axisIndex * (axisWidth + 4);
                const sameCount = axis.orientation === "left" ? leftAxisCount : rightAxisCount;

                return (
                  <YAxis
                    key={axis.yAxisId}
                    yAxisId={axis.yAxisId}
                    orientation={axis.orientation}
                    tick={{
                      fontSize: 10,
                      fill: axis.color,
                    }}
                    axisLine={false}
                    tickLine={false}
                    width={axisWidth}
                    domain={isScale ? [0, "auto"] : ["auto", "auto"]}
                    allowDecimals={!isScale}
                    // Offset second axis on each side
                    {...(sameCount > 1 && axis.axisIndex > 0
                      ? {
                          mirror: true,
                          tickMargin: offset,
                        }
                      : {})}
                    label={
                      axis.td.unit && !isMobile
                        ? {
                            value: axis.td.unit,
                            angle: axis.orientation === "left" ? -90 : 90,
                            position: axis.orientation === "left" ? "insideLeft" : "insideRight",
                            offset: -5,
                            style: { fontSize: 10, fill: axis.color, textAnchor: "middle" },
                          }
                        : undefined
                    }
                  />
                );
              })}

              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                  fontSize: "12px",
                  padding: "8px 12px",
                }}
                labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                formatter={(value: number, name: string) => {
                  // Find the matching trend to get the unit
                  const td = activeTrends.find(
                    (t) => `${getName(t)}${t.unit ? ` (${t.unit})` : ""}` === name
                  );
                  const unit = td?.unit ?? "";
                  return [`${value} ${unit}`.trim(), name];
                }}
              />

              {/* Render series — each with its own yAxisId */}
              {axisConfig.map((axis) => {
                const { td, yAxisId, color } = axis;
                const name = getName(td);
                const label = td.unit ? `${name} (${td.unit})` : name;

                if (td.categoryType === "scale") {
                  return (
                    <Bar
                      key={td.categoryId}
                      dataKey={td.categoryId}
                      yAxisId={yAxisId}
                      name={label}
                      fill={color}
                      fillOpacity={0.3}
                      stroke={color}
                      strokeWidth={1}
                      radius={[3, 3, 0, 0]}
                      maxBarSize={16}
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
                    dot={{ r: isMobile ? 2 : 3 }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                );
              })}

              {/* Brush for time-range zoom (desktop only) */}
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
        </div>
      )}
    </div>
  );
}
