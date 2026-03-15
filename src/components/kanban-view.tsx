"use client";

import { useTranslations } from "next-intl";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { KanbanColumn } from "@/components/kanban-column";
import type { TeamListItem } from "@/lib/teams/types";
import type { AthleteListItem } from "@/lib/athletes/types";

interface KanbanViewProps {
  teams: TeamListItem[];
  athletes: AthleteListItem[];
  teamAthleteMap: Record<string, string | null>;
  onInviteAthlete?: () => void;
  showAthletesFirst?: boolean;
}

export function KanbanView({
  teams,
  athletes,
  teamAthleteMap,
  onInviteAthlete,
  showAthletesFirst = false,
}: KanbanViewProps) {
  const t = useTranslations("teams");

  const unassignedAthletes = athletes.filter((a) => !teamAthleteMap[a.id]);
  const getTeamAthletes = (teamId: string) =>
    athletes.filter((a) => teamAthleteMap[a.id] === teamId);

  const teamColumns = teams.map((team) => {
    const teamAthletes = getTeamAthletes(team.id);
    return (
      <KanbanColumn
        key={team.id}
        id={`team-${team.id}`}
        title={team.name}
        athleteCount={teamAthletes.length}
        trainerCount={team.trainerCount}
        athletes={teamAthletes}
      />
    );
  });

  const unassignedColumn = (
    <KanbanColumn
      key="unassigned"
      id="unassigned"
      title={t("unassigned")}
      athleteCount={unassignedAthletes.length}
      athletes={unassignedAthletes}
      isUnassigned
      onInviteAthlete={onInviteAthlete}
    />
  );

  return (
    <ScrollArea className="w-full" type="scroll">
      <div className="flex gap-3 pb-4" style={{ minWidth: "fit-content" }}>
        {showAthletesFirst ? (
          <>
            {unassignedColumn}
            {teamColumns}
          </>
        ) : (
          <>
            {teamColumns}
            {unassignedColumn}
          </>
        )}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
