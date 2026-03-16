"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";
import type { AthleteTrendData } from "@/lib/feedback/types";

interface TrendChartProps {
  /** Trend data for one category */
  data: AthleteTrendData;
  /** Chart height in px */
  height?: number;
  /** Whether to show as a mini-chart (compact, no axes labels) */
  compact?: boolean;
  /** Additional classes */
  className?: string;
}

export function TrendChart({
  data,
  height = 200,
  compact = false,
  className,
}: TrendChartProps) {
  const t = useTranslations("feedback");
  const locale = useLocale();
  const name = locale === "en" ? data.categoryName.en : data.categoryName.de;

  const chartData = data.data
    .filter((d) => d.value !== null)
    .map((d) => ({
      date: d.date,
      value: d.value,
      label: new Date(d.date).toLocaleDateString(
        locale === "en" ? "en-US" : "de-AT",
        { day: "numeric", month: "short" }
      ),
    }));

  if (chartData.length === 0) {
    return (
      <div className={cn("flex items-center justify-center rounded-lg border border-dashed p-8", className)}>
        <p className="text-sm text-muted-foreground">{t("noDataForCategory", { name })}</p>
      </div>
    );
  }

  const isScale = data.categoryType === "scale";

  return (
    <div className={cn("space-y-2", className)}>
      {!compact && (
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">{name}</h4>
          {data.unit && (
            <span className="text-xs text-muted-foreground">{data.unit}</span>
          )}
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        {isScale ? (
          <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: compact ? 0 : 4 }}>
            {!compact && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
            <XAxis
              dataKey="label"
              tick={compact ? false : { fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            {!compact && (
              <YAxis
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
            )}
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--card))",
                fontSize: "12px",
              }}
            />
            <Bar
              dataKey="value"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
            />
          </BarChart>
        ) : (
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: compact ? 0 : 4 }}>
            {!compact && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
            <XAxis
              dataKey="label"
              tick={compact ? false : { fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            {!compact && (
              <YAxis
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={40}
                domain={["auto", "auto"]}
              />
            )}
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--card))",
                fontSize: "12px",
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={!compact}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
