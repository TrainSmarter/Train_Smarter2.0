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
  Legend,
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

  // Track which categories are toggled on (default: first 2, max 3 on mobile)
  const [activeIds, setActiveIds] = React.useState<Set<string>>(() => {
    const initial = new Set<string>();
    const maxDefault = 2;
    for (let i = 0; i < Math.min(trendData.length, maxDefault); i++) {
      initial.add(trendData[i].categoryId);
    }
    return initial;
  });

  const maxActive = isMobile ? 3 : 6;

  function toggleCategory(id: string) {
    setActiveIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < maxActive) {
        next.add(id);
      }
      return next;
    });
  }

  // Build unified chart data: merge all active categories by date
  const activeTrends = trendData.filter((td) => activeIds.has(td.categoryId));

  const chartData = React.useMemo(() => {
    // Collect all dates across active trends
    const dateMap = new Map<string, Record<string, number | null>>();

    for (const trend of activeTrends) {
      for (const point of trend.data) {
        if (!dateMap.has(point.date)) {
          dateMap.set(point.date, {});
        }
        dateMap.get(point.date)![trend.categoryId] = point.value;
      }
    }

    // Sort by date and add formatted label
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

  // Determine which categories need which Y-axis
  // Left axis: number types (kg, kcal, g, etc.)
  // Right axis: scale types (1-5, 1-2, etc.)
  const hasNumberAxis = activeTrends.some((td) => td.categoryType === "number");
  const hasScaleAxis = activeTrends.some((td) => td.categoryType === "scale");

  // Assign colors to categories (stable mapping)
  const colorMap = React.useMemo(() => {
    const map = new Map<string, string>();
    trendData.forEach((td, i) => {
      map.set(td.categoryId, CHART_COLORS[i % CHART_COLORS.length]);
    });
    return map;
  }, [trendData]);

  const getName = (td: AthleteTrendData) =>
    locale === "en" ? td.categoryName.en : td.categoryName.de;

  const chartHeight = isMobile ? 240 : 380;

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

          return (
            <button
              key={td.categoryId}
              type="button"
              onClick={() => toggleCategory(td.categoryId)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all",
                "border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "border-transparent text-white shadow-sm"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              style={isActive ? { backgroundColor: color } : undefined}
              aria-pressed={isActive}
            >
              {!isActive && (
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
              )}
              {name}
              {td.unit && !isActive && (
                <span className="text-muted-foreground/60">({td.unit})</span>
              )}
            </button>
          );
        })}
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
                right: hasScaleAxis ? 8 : 16,
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

              {/* Left Y-axis: number values (kg, kcal, g) */}
              {hasNumberAxis && (
                <YAxis
                  yAxisId="number"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  domain={["auto", "auto"]}
                />
              )}

              {/* Right Y-axis: scale values (0-5, 0-2) */}
              {hasScaleAxis && (
                <YAxis
                  yAxisId="scale"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                  domain={[0, "auto"]}
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

              {!isMobile && <Legend wrapperStyle={{ fontSize: 12 }} />}

              {/* Render series */}
              {activeTrends.map((td) => {
                const color = colorMap.get(td.categoryId)!;
                const yAxisId = td.categoryType === "scale" ? "scale" : "number";
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
