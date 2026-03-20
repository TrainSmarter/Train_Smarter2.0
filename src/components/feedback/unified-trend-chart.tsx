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
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Maximize2,
  Settings2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

/** Width per axis — Recharts uses this for position calc + spacing between stacked axes */
const AXIS_WIDTH = 35;

/** Format numbers compactly for narrow axes: 14000→14k, 2200→2.2k, 150→150 */
function formatAxisTick(value: number): string {
  if (Math.abs(value) >= 10000) return `${Math.round(value / 1000)}k`;
  if (Math.abs(value) >= 1000) {
    const k = value / 1000;
    return k === Math.floor(k) ? `${k}k` : `${k.toFixed(1)}k`;
  }
  return String(Math.round(value));
}

const STORAGE_KEY = "feedback-chart-axis-settings";

type XRange = "7" | "14" | "30" | "90";

interface AxisSettingsData {
  [categoryId: string]: { min: number; max: number } | null;
}

interface StoredSettings {
  axes: AxisSettingsData;
  xRange: XRange;
}

function loadSettings(): StoredSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        axes: parsed.axes ?? {},
        xRange: parsed.xRange ?? "7",
      };
    }
  } catch {
    // ignore
  }
  return { axes: {}, xRange: "7" };
}

function saveSettings(settings: StoredSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

interface UnifiedTrendChartProps {
  trendData: AthleteTrendData[];
  className?: string;
  /** Callback to open fullscreen view */
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

/** Number input with chevron up/down buttons */
function AxisNumberInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground w-8 shrink-0">
        {label}
      </span>
      <div className="flex items-center border rounded-md">
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) onChange(v);
          }}
          className="w-16 px-1.5 py-1 text-xs text-center bg-transparent focus:outline-none tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          aria-label={label}
        />
        <div className="flex flex-col border-l">
          <button
            type="button"
            onClick={() => onChange(value + 1)}
            className="px-1 py-0 hover:bg-muted transition-colors"
            aria-label={`${label} +1`}
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => onChange(value - 1)}
            className="px-1 py-0 hover:bg-muted transition-colors border-t"
            aria-label={`${label} -1`}
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Settings panel content (shared between desktop inline and mobile sheet) */
function SettingsPanelContent({
  activeTrends,
  colorMap,
  getName,
  axisOverrides,
  autoRanges,
  xRange,
  onAxisChange,
  onXRangeChange,
  onResetAll,
  t,
}: {
  activeTrends: AthleteTrendData[];
  colorMap: Map<string, string>;
  getName: (td: AthleteTrendData) => string;
  axisOverrides: AxisSettingsData;
  autoRanges: Map<string, { min: number; max: number }>;
  xRange: XRange;
  onAxisChange: (
    categoryId: string,
    field: "min" | "max",
    value: number
  ) => void;
  onXRangeChange: (range: XRange) => void;
  onResetAll: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const hasManualOverrides = activeTrends.some(
    (td) => axisOverrides[td.categoryId] != null
  );

  const xRangeOptions: { value: XRange; labelKey: string }[] = [
    { value: "7", labelKey: "days7" },
    { value: "14", labelKey: "days14" },
    { value: "30", labelKey: "days30" },
    { value: "90", labelKey: "days90" },
  ];

  return (
    <div className="space-y-4">
      {/* X-axis time range */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">
          {t("timeRange")}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {xRangeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onXRangeChange(opt.value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                xRange === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {t(opt.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Per-category axis settings */}
      {activeTrends.map((td) => {
        const color = colorMap.get(td.categoryId)!;
        const name = getName(td);
        const autoRange = autoRanges.get(td.categoryId) ?? {
          min: 0,
          max: 100,
        };
        const override = axisOverrides[td.categoryId];
        const currentMin = override?.min ?? autoRange.min;
        const currentMax = override?.max ?? autoRange.max;

        return (
          <div key={td.categoryId} className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm font-medium truncate">{name}</span>
            </div>
            <div className="flex items-center gap-3 pl-4">
              <AxisNumberInput
                value={currentMin}
                onChange={(v) => onAxisChange(td.categoryId, "min", v)}
                label={t("axisMin")}
              />
              <AxisNumberInput
                value={currentMax}
                onChange={(v) => onAxisChange(td.categoryId, "max", v)}
                label={t("axisMax")}
              />
            </div>
          </div>
        );
      })}

      {/* Auto reset button */}
      {hasManualOverrides && (
        <Button
          variant="outline"
          size="sm"
          onClick={onResetAll}
          className="w-full"
        >
          {t("axisAutoReset")}
        </Button>
      )}
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

  // Settings panel state
  const [showSettings, setShowSettings] = React.useState(false);
  const [axisOverrides, setAxisOverrides] = React.useState<AxisSettingsData>(
    () => loadSettings().axes
  );
  const [xRange, setXRange] = React.useState<XRange>(
    () => loadSettings().xRange
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
    const leftAxesCount = axisLayout.filter(
      (a) => a.orientation === "left"
    ).length;
    const rightAxesCount = axisLayout.filter(
      (a) => a.orientation === "right"
    ).length;

    // Margins are ADDITIONAL space beyond the YAxis width — keep minimal
    // Recharts: total left space = margin.left + sum of left YAxis widths
    return {
      top: 4,
      right: rightAxesCount > 0 ? 4 : 20,
      bottom: 4,
      left: 4,
    };
  }, [axisLayout, isMobile]);

  const chartHeight = isMobile ? 240 : 360;
  const isSparse = chartData.length < 3;

  // No fixed min width — always use 100% responsive width

  // Recharts handles axis positioning natively with width={AXIS_WIDTH}
  // and margins = count * AXIS_WIDTH. No DOM manipulation needed.

  // Chip scroll state
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

        {/* Independent Y-axis per active category — no unit labels (Change 3) */}
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
            <CustomTooltip
              activeTrends={activeTrends}
              colorMap={colorMap}
              locale={locale}
              getName={getName}
            />
          }
        />

        {/* Series — lines for number types, bars for scale types */}
        {(() => {
          const scaleCount = activeTrends.filter((td) => td.categoryType === "scale").length;
          const totalBarWidth = 20; // constant total width for all bars combined
          const barSize = scaleCount > 0 ? Math.floor(totalBarWidth / scaleCount) : totalBarWidth;

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
    <SettingsPanelContent
      activeTrends={activeTrends}
      colorMap={colorMap}
      getName={getName}
      axisOverrides={axisOverrides}
      autoRanges={autoRanges}
      xRange={xRange}
      onAxisChange={handleAxisChange}
      onXRangeChange={handleXRangeChange}
      onResetAll={handleResetAll}
      t={t}
    />
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
            const chipLabel = td.unit ? `${name} (${td.unit})` : name;
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
