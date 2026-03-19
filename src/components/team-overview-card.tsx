"use client";

import { useTranslations } from "next-intl";
import { Users } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { AthleteTeamInfo } from "@/lib/teams/types";
import { getNameInitials } from "@/lib/utils";

interface TeamOverviewCardProps {
  teams: AthleteTeamInfo[];
}

export function TeamOverviewCard({ teams }: TeamOverviewCardProps) {
  const t = useTranslations("teams");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("athleteDashboardTitle")}</CardTitle>
        <CardDescription>
          {teams.length === 0
            ? t("athleteDashboardEmpty")
            : t("subtitle", { count: teams.length })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {teams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <Users className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-body-sm text-muted-foreground">
              {t("athleteDashboardEmpty")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {teams.map((team) => (
              <div
                key={team.id}
                className="flex items-center gap-3 rounded-md p-2"
              >
                <Avatar className="h-8 w-8 shrink-0">
                  {team.logoUrl && (
                    <AvatarImage src={team.logoUrl} alt={team.name} />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                    {getNameInitials(team.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm font-medium text-foreground">
                    {team.name}
                  </p>
                  <p className="text-caption text-muted-foreground">
                    {t("trainerCount", { count: team.trainerCount })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
