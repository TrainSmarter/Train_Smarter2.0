"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CardExtended, CardContent } from "@/components/card-extended";
import { StreakBadge } from "./streak-badge";
import { cn } from "@/lib/utils";
import type { MonitoringAthleteSummary, TrafficLight } from "@/lib/feedback/types";

interface MonitoringCardGridProps {
  athletes: MonitoringAthleteSummary[];
}

const trafficLightStyles: Record<TrafficLight, { border: string; dot: string }> = {
  green: {
    border: "border-l-success",
    dot: "bg-success",
  },
  yellow: {
    border: "border-l-warning",
    dot: "bg-warning",
  },
  red: {
    border: "border-l-error",
    dot: "bg-error",
  },
};

export function MonitoringCardGrid({ athletes }: MonitoringCardGridProps) {
  const t = useTranslations("feedback");
  const locale = useLocale();

  if (athletes.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {athletes.map((athlete) => {
        const tl = trafficLightStyles[athlete.trafficLight];

        return (
          <Link
            key={athlete.athleteId}
            href={{
              pathname: "/feedback/[athleteId]",
              params: { athleteId: athlete.athleteId },
            }}
            className="block focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
          >
            <CardExtended
              variant="hover"
              className={cn("border-l-4", tl.border)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">
                        {athlete.firstName} {athlete.lastName}
                      </p>
                      <div className={cn("h-2.5 w-2.5 shrink-0 rounded-full", tl.dot)} />
                    </div>
                    {athlete.teamName && (
                      <p className="text-xs text-muted-foreground truncate">
                        {athlete.teamName}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {athlete.todayCheckinStatus === "complete" ? (
                        <Badge variant="success" size="sm">
                          {t("checkedIn")}
                        </Badge>
                      ) : athlete.todayCheckinStatus === "partial" ? (
                        <Badge variant="warning" size="sm">
                          {t("partialCheckin")}
                        </Badge>
                      ) : (
                        <Badge variant="error" size="sm">
                          {t("noCheckin")}
                        </Badge>
                      )}
                      <StreakBadge streak={athlete.streak} />
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      {athlete.latestWeight != null && (
                        <span>
                          {athlete.latestWeight} kg
                          {athlete.weightTrend != null && (
                            <span
                              className={cn(
                                "ml-1",
                                athlete.weightTrend > 0
                                  ? "text-error"
                                  : athlete.weightTrend < 0
                                    ? "text-success"
                                    : ""
                              )}
                            >
                              {athlete.weightTrend > 0 ? "+" : ""}
                              {athlete.weightTrend.toFixed(1)}
                            </span>
                          )}
                        </span>
                      )}
                      <span>{athlete.complianceRate}% {t("compliance")}</span>
                    </div>
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
