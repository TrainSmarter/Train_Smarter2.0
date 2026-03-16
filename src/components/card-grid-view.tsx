"use client";

import * as React from "react";
import { useDroppable } from "@dnd-kit/core";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { DroppableTeamCard } from "@/components/droppable-team-card";
import { DraggableAthleteCard } from "@/components/draggable-athlete-card";
import type { TeamListItem } from "@/lib/teams/types";
import type { AthleteListItem } from "@/lib/athletes/types";
import type { OrganisationSortOption } from "@/lib/teams/types";

interface CardGridViewProps {
  teams: TeamListItem[];
  athletes: AthleteListItem[];
  teamAthleteMap: Record<string, string | null>;
  sortOption: OrganisationSortOption;
  teamNameMap: Record<string, string>;
  showAthletesFirst?: boolean;
  onResendInvite?: (connectionId: string) => void;
  resendingId?: string | null;
  onWithdrawInvite?: (connectionId: string) => void;
  withdrawingId?: string | null;
}

export function CardGridView({
  teams,
  athletes,
  teamAthleteMap,
  sortOption,
  teamNameMap,
  showAthletesFirst = false,
  onResendInvite,
  resendingId,
  onWithdrawInvite,
  withdrawingId,
}: CardGridViewProps) {
  const t = useTranslations("teams");
  const [expandedTeamId, setExpandedTeamId] = React.useState<string | null>(null);

  // Split athletes by team assignment
  const unassignedAthletes = athletes.filter(
    (a) => !teamAthleteMap[a.id]
  );

  const getTeamAthletes = (teamId: string) =>
    athletes.filter((a) => teamAthleteMap[a.id] === teamId);

  // Droppable for the "unassigned" zone
  const { isOver: isOverUnassigned, setNodeRef: unassignedRef } = useDroppable({
    id: "unassigned",
    data: { type: "unassigned" },
  });

  const teamCards = teams.map((team) => (
    <DroppableTeamCard
      key={team.id}
      team={team}
      athletes={getTeamAthletes(team.id)}
      isExpanded={expandedTeamId === team.id}
      onToggleExpand={() =>
        setExpandedTeamId((prev) => (prev === team.id ? null : team.id))
      }
      onResendInvite={onResendInvite}
      resendingId={resendingId}
      onWithdrawInvite={onWithdrawInvite}
      withdrawingId={withdrawingId}
    />
  ));

  const athleteCards = unassignedAthletes.map((athlete) => (
    <DraggableAthleteCard
      key={athlete.id}
      athlete={athlete}
      teamName={
        teamAthleteMap[athlete.id]
          ? teamNameMap[teamAthleteMap[athlete.id]!]
          : null
      }
      onResendInvite={onResendInvite}
      isResending={resendingId === athlete.connectionId}
      onWithdrawInvite={onWithdrawInvite}
      isWithdrawing={withdrawingId === athlete.connectionId}
    />
  ));

  // Assigned athletes (not in unassigned, not shown in team accordion)
  const assignedNotExpanded = athletes.filter(
    (a) =>
      teamAthleteMap[a.id] &&
      teamAthleteMap[a.id] !== expandedTeamId
  );

  const teamsSection = teams.length > 0 ? (
    <section aria-label={t("tabTeams")} key="teams">
      {(unassignedAthletes.length > 0 || assignedNotExpanded.length > 0) && (
        <h2 className="text-h5 text-muted-foreground mb-3">
          {t("tabTeams")} ({teams.length})
        </h2>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {teamCards}
      </div>
    </section>
  ) : null;

  const unassignedSection = unassignedAthletes.length > 0 ? (
    <section aria-label={t("unassigned")} key="unassigned">
      <h2 className="text-h5 text-muted-foreground mb-3">
        {t("unassigned")} ({unassignedAthletes.length})
      </h2>
      <div
        ref={unassignedRef}
        className={cn(
          "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 rounded-lg p-1 transition-colors",
          isOverUnassigned && "ring-2 ring-primary/50 bg-primary/5"
        )}
      >
        {athleteCards}
      </div>
    </section>
  ) : null;

  const assignedSection = assignedNotExpanded.length > 0 && teams.length > 0 ? (
    <section aria-label={t("tabAthletes")} key="assigned">
      <h2 className="text-h5 text-muted-foreground mb-3">
        {t("tabAthletes")} ({assignedNotExpanded.length})
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {assignedNotExpanded.map((athlete) => (
          <DraggableAthleteCard
            key={athlete.id}
            athlete={athlete}
            teamName={teamNameMap[teamAthleteMap[athlete.id]!]}
            onResendInvite={onResendInvite}
            isResending={resendingId === athlete.connectionId}
            onWithdrawInvite={onWithdrawInvite}
            isWithdrawing={withdrawingId === athlete.connectionId}
          />
        ))}
      </div>
    </section>
  ) : null;

  return (
    <div className="space-y-6">
      {showAthletesFirst ? (
        <>
          {unassignedSection}
          {assignedSection}
          {teamsSection}
        </>
      ) : (
        <>
          {teamsSection}
          {unassignedSection}
          {assignedSection}
        </>
      )}
    </div>
  );
}
