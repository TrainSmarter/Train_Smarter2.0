"use client";

import type { AthleteTrendData } from "@/lib/feedback/types";

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number | null }>;
  label?: string;
  activeTrends: AthleteTrendData[];
  colorMap: Map<string, string>;
  locale: string;
  getName: (td: AthleteTrendData) => string;
}

/** Custom Recharts tooltip that shows colored dots + category name + value + unit */
export function ChartTooltip({
  active,
  payload,
  label,
  activeTrends,
  colorMap,
  locale,
  getName,
}: ChartTooltipProps) {
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
