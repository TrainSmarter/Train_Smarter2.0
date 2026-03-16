"use client";

import { useTranslations } from "next-intl";
import {
  LayoutGrid,
  Table2,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Grid3X3,
  Rss,
  Trophy,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { MonitoringViewMode } from "@/lib/feedback/types";

interface MonitoringViewSwitcherProps {
  value: MonitoringViewMode;
  onChange: (mode: MonitoringViewMode) => void;
}

const views: {
  mode: MonitoringViewMode;
  icon: typeof LayoutGrid;
  labelKey: string;
  phase: 1 | 2;
}[] = [
  { mode: "card-grid", icon: LayoutGrid, labelKey: "viewCardGrid", phase: 1 },
  { mode: "table", icon: Table2, labelKey: "viewTable", phase: 1 },
  { mode: "alert", icon: AlertTriangle, labelKey: "viewAlert", phase: 1 },
  { mode: "trend", icon: TrendingUp, labelKey: "viewTrend", phase: 1 },
  { mode: "calendar", icon: Calendar, labelKey: "viewCalendar", phase: 2 },
  { mode: "heatmap", icon: Grid3X3, labelKey: "viewHeatmap", phase: 2 },
  { mode: "feed", icon: Rss, labelKey: "viewFeed", phase: 2 },
  { mode: "ranking", icon: Trophy, labelKey: "viewRanking", phase: 2 },
];

export function MonitoringViewSwitcher({
  value,
  onChange,
}: MonitoringViewSwitcherProps) {
  const t = useTranslations("feedback");

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="inline-flex items-center rounded-md border bg-muted p-0.5"
        role="radiogroup"
        aria-label={t("viewSwitcherLabel")}
      >
        {views.map(({ mode, icon: Icon, labelKey, phase }) => {
          const isPhase2 = phase === 2;
          const isActive = value === mode;
          const label = t(labelKey);

          return (
            <Tooltip key={mode}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  role="radio"
                  aria-checked={isActive}
                  aria-label={label}
                  aria-disabled={isPhase2}
                  disabled={isPhase2}
                  className={cn(
                    "h-8 w-8 p-0 transition-colors",
                    isActive
                      ? "bg-background text-foreground shadow-sm hover:bg-background"
                      : "text-muted-foreground hover:text-foreground",
                    isPhase2 && "opacity-40"
                  )}
                  onClick={() => !isPhase2 && onChange(mode)}
                >
                  {isPhase2 ? (
                    <div className="relative">
                      <Icon className="h-3.5 w-3.5" />
                      <Lock className="absolute -bottom-0.5 -right-0.5 h-2 w-2" />
                    </div>
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {label}
                  {isPhase2 && ` (${t("comingSoon")})`}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
