"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CardExtended, CardContent } from "@/components/card-extended";
import type { MonitoringAthleteSummary } from "@/lib/feedback/types";

interface MonitoringTrendViewProps {
  athletes: MonitoringAthleteSummary[];
  timeRange: string;
}

/**
 * Trend overview per athlete.
 * Shows weight, compliance, and streak as compact trend indicators.
 * Full charts with real data are available in the detail view.
 */
export function MonitoringTrendView({
  athletes,
}: MonitoringTrendViewProps) {
  const t = useTranslations("feedback");

  if (athletes.length === 0) {
    return (
      <p className="text-center py-8 text-muted-foreground">
        {t("noAthletes")}
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {athletes.map((athlete) => {
        const weightTrend = athlete.weightTrend;
        const TrendIcon =
          weightTrend === null
            ? Minus
            : weightTrend > 0
              ? TrendingUp
              : weightTrend < 0
                ? TrendingDown
                : Minus;
        const trendColor =
          weightTrend === null
            ? "text-muted-foreground"
            : Math.abs(weightTrend) > 2
              ? "text-warning"
              : "text-muted-foreground";

        return (
          <Link
            key={athlete.athleteId}
            href={{
              pathname: "/feedback/[athleteId]",
              params: { athleteId: athlete.athleteId },
            }}
            className="block focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
          >
            <CardExtended variant="hover">
              <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-center gap-2 mb-4">
                  <Avatar className="h-8 w-8 shrink-0">
                    {athlete.avatarUrl && (
                      <AvatarImage
                        src={athlete.avatarUrl}
                        alt={`${athlete.firstName} ${athlete.lastName}`}
                      />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {athlete.firstName.charAt(0)}
                      {athlete.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-medium truncate">
                    {athlete.firstName} {athlete.lastName}
                  </p>
                </div>

                {/* Trend Indicators */}
                <div className="space-y-2">
                  {/* Weight */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {t("columnWeight")}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {athlete.latestWeight != null ? (
                        <>
                          <span className="text-sm font-medium">
                            {athlete.latestWeight} kg
                          </span>
                          <TrendIcon className={`h-3.5 w-3.5 ${trendColor}`} />
                          {weightTrend != null && (
                            <span className={`text-xs ${trendColor}`}>
                              {weightTrend > 0 ? "+" : ""}
                              {weightTrend} kg
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>

                  {/* Compliance */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {t("statsCompliance")}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(athlete.complianceRate, 100)}%`,
                            backgroundColor:
                              athlete.complianceRate >= 70
                                ? "hsl(var(--success))"
                                : athlete.complianceRate >= 50
                                  ? "hsl(var(--warning))"
                                  : "hsl(var(--error))",
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium w-8 text-right">
                        {athlete.complianceRate}%
                      </span>
                    </div>
                  </div>

                  {/* Streak */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {t("columnStreak")}
                    </span>
                    <Badge
                      variant={athlete.streak > 0 ? "default" : "outline"}
                      size="sm"
                    >
                      {t("streakDays", { count: athlete.streak })}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </CardExtended>
          </Link>
        );
      })}
    </div>
  );
}
