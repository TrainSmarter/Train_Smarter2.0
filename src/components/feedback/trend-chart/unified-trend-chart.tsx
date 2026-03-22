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
import {
  Maximize2,
  Settings2,
  X,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import type { AthleteTrendData } from "@/lib/feedback/types";

import { ChartTooltip } from "./chart-tooltip";
import { ChartSettings, type XRange, type AxisSettingsData } from "./chart-settings";
import { ChartLegend } from "./chart-legend";
import {
  CHART_COLORS,
  MAX_ACTIVE,
  AXIS_WIDTH,
  formatAxisTick,
  loadSettings,
  saveSettings,
} from "./chart-types";

interface UnifiedTrendChartProps {
  trendData: AthleteTrendData[];
  className?: string;
  /** Callback to open fullscreen view */
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

  // Settings panel state -- load once from localStorage
  const [showSettings, setShowSettings] = React.useState(false);
  const initialSettings = React.useRef(loadSettings());
  const [axisOverrides, setAxisOverrides] = React.useState<AxisSettingsData>(
    initialSettings.current.axes
  );
  const [xRange, setXRange] = React.useState<XRange>(
    initialSettings.current.xRange
  );

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

  // Build unified chart data (all dates)
  const allChartData = React.useMemo(() => {
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

  // Filter chart data by xRange
  const chartData = React.useMemo(() => {
    const days = parseInt(xRange, 10);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    return allChartData.filter((d) => d.date >= cutoffStr);
  }, [allChartData, xRange]);

  // Compute auto min/max ranges for each active category
  const autoRanges = React.useMemo(() => {
    const map = new Map<string, { min: number; max: number }>();
    for (const td of activeTrends) {
      const values = td.data
        .map((d) => d.value)
        .filter((v): v is number => v !== null);
      if (values.length > 0) {
        map.set(td.categoryId, {
          min: Math.floor(Math.min(...values)),
          max: Math.ceil(Math.max(...values)),
        });
      } else {
        map.set(td.categoryId, { min: 0, max: 100 });
      }
    }
    return map;
  }, [activeTrends]);

  // Save settings to localStorage
  function handleAxisChange(
    categoryId: string,
    field: "min" | "max",
    value: number
  ) {
    setAxisOverrides((prev) => {
      const autoRange = autoRanges.get(categoryId) ?? { min: 0, max: 100 };
      const current = prev[categoryId] ?? autoRange;
      const updated = { ...current, [field]: value };
      const next = { ...prev, [categoryId]: updated };
      saveSettings({ axes: next, xRange });
      return next;
    });
  }

  function handleXRangeChange(range: XRange) {
    setXRange(range);
    saveSettings({ axes: axisOverrides, xRange: range });
  }

  function handleResetAll() {
    setAxisOverrides({});
    saveSettings({ axes: {}, xRange });
  }

  // Compute axis layout: alternating left/right, track if outer (2nd on same side)
  const axisLayout = React.useMemo(() => {
    let leftCount = 0;
    let rightCount = 0;

    return activeTrends.map((td, index) => {
      const color = colorMap.get(td.categoryId)!;
      const isScale = td.categoryType === "scale";
      // 0 -> left, 1 -> right, 2 -> left (outer), 3 -> right (outer)
      const orientation: "left" | "right" =
        index % 2 === 0 ? "left" : "right";

      // Track if this is the 2nd axis on its side (outer axis)
      const isOuter = orientation === "left" ? leftCount > 0 : rightCount > 0;
      if (orientation === "left") leftCount++;
      else rightCount++;

      // Determine domain: manual override > scale default > auto
      const override = axisOverrides[td.categoryId];
      let domain: [number | string, number | string];
      if (override) {
        domain = [override.min, override.max];
      } else if (isScale) {
        domain = [0, "dataMax + 1"];
      } else {
        domain = ["auto", "auto"];
      }

      return {
        categoryId: td.categoryId,
        categoryType: td.categoryType,
        unit: td.unit,
        color,
        orientation,
        isOuter,
        domain,
      };
    });
  }, [activeTrends, colorMap, axisOverrides]);

  // Dynamic margins: stack axes from outer edge inward
  const chartMargins = React.useMemo(() => {
    const rightAxesCount = axisLayout.filter(
      (a) => a.orientation === "right"
    ).length;

    return {
      top: 4,
      right: rightAxesCount > 0 ? 4 : 20,
      bottom: 4,
      left: 4,
    };
  }, [axisLayout]);

  const chartHeight = isMobile ? 240 : 360;
  const isSparse = chartData.length < 3;

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

  const chartContent = (
    <ResponsiveContainer
      width="100%"
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
            tick={{ fill: axis.color, fontSize: axis.isOuter ? 9 : 11, dx: axis.orientation === "left" ? -4 : 4 }}
            tickFormatter={formatAxisTick}
            axisLine={{ stroke: axis.color, strokeWidth: 1.5 }}
            tickLine={{ stroke: axis.color, strokeWidth: 0.5 }}
            tickSize={3}
            width={AXIS_WIDTH}
            domain={axis.domain}
            allowDecimals={false}
            tickCount={5}
          />
        ))}

        <Tooltip
          content={
            <ChartTooltip
              activeTrends={activeTrends}
              colorMap={colorMap}
              locale={locale}
              getName={getName}
            />
          }
        />

        {/* Series -- lines for number types, bars for scale types */}
        {(() => {
          const scaleCount = activeTrends.filter((td) => td.categoryType === "scale").length;
          const days = chartData.length;
          const totalBarWidth = days <= 7 ? 32 : days <= 14 ? 20 : days <= 30 ? 12 : 8;
          const barSize = scaleCount > 0 ? Math.max(2, Math.floor(totalBarWidth / scaleCount)) : totalBarWidth;

          return activeTrends.map((td) => {
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
                  fillOpacity={0.35}
                  stroke={color}
                  strokeWidth={1}
                  radius={[2, 2, 0, 0]}
                  barSize={barSize}
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
          });
        })()}

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

  // Settings panel content (reusable for both desktop inline and mobile sheet)
  const settingsContent = (
    <ChartSettings
      activeTrends={activeTrends}
      colorMap={colorMap}
      getName={getName}
      axisOverrides={axisOverrides}
      autoRanges={autoRanges}
      xRange={xRange}
      onAxisChange={handleAxisChange}
      onXRangeChange={handleXRangeChange}
      onResetAll={handleResetAll}
    />
  );

  return (
    <div className={cn("space-y-3", className)}>
      {/* Toggle chips -- scrollable row with arrows */}
      <ChartLegend
        trendData={trendData}
        activeIds={activeIds}
        colorMap={colorMap}
        maxActive={MAX_ACTIVE}
        getName={getName}
        onToggle={toggleCategory}
      />

      {/* No categories selected */}
      {activeTrends.length === 0 ? (
        <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
          <p className="text-sm text-muted-foreground">
            {t("selectCategories")}
          </p>
        </div>
      ) : isSparse ? (
        /* Too few data points -- show values as summary instead of empty chart */
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
        <div className="relative rounded-lg border bg-card py-3 sm:py-4">
          {/* Top-right buttons: settings + expand */}
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowSettings((prev) => !prev)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md border bg-card/90 backdrop-blur-sm shadow-sm hover:bg-muted transition-colors",
                showSettings && "bg-muted"
              )}
              aria-label={t("openSettings")}
            >
              <Settings2 className="h-4 w-4 text-foreground" />
            </button>
            {onExpand && (
              <button
                type="button"
                onClick={onExpand}
                className="flex h-8 w-8 items-center justify-center rounded-md border bg-card/90 backdrop-blur-sm shadow-sm hover:bg-muted transition-colors"
                aria-label={t("expandChart")}
              >
                <Maximize2 className="h-4 w-4 text-foreground" />
              </button>
            )}
          </div>

          {/* Desktop/Tablet: inline settings panel */}
          <div
            className={cn(
              showSettings && !isMobile ? "flex flex-row gap-4" : ""
            )}
          >
            {/* Chart area */}
            <div
              className={cn(
                showSettings && !isMobile
                  ? "min-w-0 w-[calc(100%-280px)]"
                  : ""
              )}
            >
              {chartContent}
            </div>

            {/* Desktop settings panel (hidden on mobile) */}
            {showSettings && !isMobile && (
              <div className="w-[264px] shrink-0 border-l pl-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">
                    {t("axisSettings")}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowSettings(false)}
                    className="flex h-6 w-6 items-center justify-center rounded-sm hover:bg-muted transition-colors"
                    aria-label={t("closeSettings")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {settingsContent}
              </div>
            )}
          </div>

          {/* Mobile: bottom sheet for settings */}
          {isMobile && (
            <Sheet open={showSettings} onOpenChange={setShowSettings}>
              <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>{t("axisSettings")}</SheetTitle>
                  <SheetDescription className="sr-only">
                    {t("axisSettings")}
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-4">{settingsContent}</div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      )}
    </div>
  );
}
