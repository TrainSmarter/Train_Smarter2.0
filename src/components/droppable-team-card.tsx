"use client";

import { useDroppable } from "@dnd-kit/core";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronDown, Users, ExternalLink, UserPlus } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { DraggableAthleteCard } from "@/components/draggable-athlete-card";
import type { TeamListItem } from "@/lib/teams/types";
import type { AthleteListItem } from "@/lib/athletes/types";

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface DroppableTeamCardProps {
  team: TeamListItem;
  athletes: AthleteListItem[];
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function DroppableTeamCard({
  team,
  athletes,
  isExpanded,
  onToggleExpand,
}: DroppableTeamCardProps) {
  const t = useTranslations("teams");
  const { isOver, setNodeRef } = useDroppable({
    id: `team-${team.id}`,
    data: {
      type: "team",
      team,
    },
  });

  return (
    <div ref={setNodeRef}>
      <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
        <Card
          className={cn(
            "transition-all duration-200",
            isOver && "ring-2 ring-primary ring-offset-2 bg-primary/5"
          )}
        >
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
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-body font-medium text-foreground">
                    {team.name}
                  </h3>
                  <Link
                    href={`/organisation/teams/${team.id}`}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={`${team.name} — Details`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {team.description && (
                  <p className="mt-0.5 line-clamp-1 text-body-sm text-muted-foreground">
                    {team.description}
                  </p>
                )}

                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="outline" size="sm" className="gap-1">
                    <Users className="h-3 w-3" />
                    {t("trainerCount", { count: team.trainerCount })} ·{" "}
                    {t("athleteCount", { count: athletes.length })}
                  </Badge>
                </div>
              </div>

              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 h-8 w-8 p-0"
                  aria-label={isExpanded ? t("collapseTeam") : t("expandTeam")}
                >
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      isExpanded && "rotate-180"
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardContent>
        </Card>

        <CollapsibleContent>
          {athletes.length > 0 ? (
            <div className="mt-1.5 space-y-1.5 pl-4 border-l-2 border-primary/20 ml-6">
              {athletes.map((athlete) => (
                <DraggableAthleteCard
                  key={athlete.id}
                  athlete={athlete}
                  teamName={null}
                />
              ))}
            </div>
          ) : (
            <div className="mt-1.5 pl-4 border-l-2 border-muted ml-6">
              <p className="py-3 text-body-sm text-muted-foreground italic">
                {t("athleteCount", { count: 0 })}
              </p>
            </div>
          )}
          <div className="mt-2 ml-6 pl-4">
            <Link
              href={`/organisation/teams/${team.id}`}
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="outline"
                size="sm"
                iconLeft={<UserPlus className="h-3.5 w-3.5" />}
              >
                {t("assignAthletes")}
              </Button>
            </Link>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
