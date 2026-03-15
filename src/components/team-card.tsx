"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Users } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { TeamListItem } from "@/lib/teams/types";

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface TeamCardProps {
  team: TeamListItem;
}

export function TeamCard({ team }: TeamCardProps) {
  const t = useTranslations("teams");

  return (
    <Link
      href={{ pathname: "/organisation/teams/[id]", params: { id: team.id } }}
      className="block focus:outline-none"
      aria-label={`${team.name} — ${t("trainerCount", { count: team.trainerCount })} · ${t("athleteCount", { count: team.athleteCount })}`}
    >
      <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12 shrink-0">
              {team.logoUrl && (
                <AvatarImage src={team.logoUrl} alt={team.name} />
              )}
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {getInitials(team.name)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-body font-medium text-foreground">
                {team.name}
              </h3>

              {team.description && (
                <p className="mt-0.5 line-clamp-2 text-body-sm text-muted-foreground">
                  {team.description}
                </p>
              )}

              <div className="mt-2 flex items-center gap-2">
                <Badge variant="outline" size="sm" className="gap-1">
                  <Users className="h-3 w-3" />
                  {t("trainerCount", { count: team.trainerCount })} ·{" "}
                  {t("athleteCount", { count: team.athleteCount })}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
