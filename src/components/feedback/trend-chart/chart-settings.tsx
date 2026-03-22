"use client";

import { useTranslations } from "next-intl";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AthleteTrendData } from "@/lib/feedback/types";

export type XRange = "7" | "14" | "30" | "90";

export interface AxisSettingsData {
  [categoryId: string]: { min: number; max: number } | null;
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

interface ChartSettingsProps {
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
}

/** Settings panel content (shared between desktop inline and mobile sheet) */
export function ChartSettings({
  activeTrends,
  colorMap,
  getName,
  axisOverrides,
  autoRanges,
  xRange,
  onAxisChange,
  onXRangeChange,
  onResetAll,
}: ChartSettingsProps) {
  const t = useTranslations("feedback");
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
