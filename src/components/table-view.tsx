"use client";

import * as React from "react";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useTranslations, useFormatter, useNow } from "next-intl";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, Clock, GripVertical, Hourglass, RefreshCw, Undo2, Users, UserPlus } from "lucide-react";
import { Link } from "@/i18n/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { TeamListItem, OrganisationSortOption } from "@/lib/teams/types";
import type { AthleteListItem } from "@/lib/athletes/types";

// ── Draggable Athlete Row ──────────────────────────────────────

function DraggableAthleteRow({
  athlete,
  teamName,
  onResendInvite,
  isResending = false,
  onWithdrawInvite,
  isWithdrawing = false,
}: {
  athlete: AthleteListItem;
  teamName?: string | null;
  onResendInvite?: (connectionId: string) => void;
  isResending?: boolean;
  onWithdrawInvite?: (connectionId: string) => void;
  isWithdrawing?: boolean;
}) {
  const tAthletes = useTranslations("athletes");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const isPending = athlete.status === "pending";
  const isRequest = athlete.connectionType === "request";
  const isExpired =
    isPending && !isRequest && new Date(athlete.invitationExpiresAt) < new Date();

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `athlete-${athlete.id}`,
      data: { type: "athlete", athlete },
      disabled: isPending,
    });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(
        "transition-opacity",
        isDragging && "opacity-40",
        !isPending && "cursor-grab active:cursor-grabbing"
      )}
    >
      <TableCell className="w-10">
        {!isPending && (
          <button
            className="touch-none text-muted-foreground hover:text-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8 shrink-0">
            {athlete.avatarUrl && (
              <AvatarImage
                src={athlete.avatarUrl}
                alt={`${athlete.firstName} ${athlete.lastName}`}
              />
            )}
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {athlete.firstName?.charAt(0)}
              {athlete.lastName?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {athlete.firstName} {athlete.lastName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {athlete.email}
            </p>
            {isPending && (
              <div className="mt-0.5 flex items-center gap-3">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3 shrink-0" />
                  {tAthletes("invitedAgo", {
                    time: format.relativeTime(new Date(athlete.invitedAt), now),
                  })}
                </span>
                {!isExpired && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Hourglass className="h-3 w-3 shrink-0" />
                    {tAthletes("expiresIn", {
                      time: format.relativeTime(new Date(athlete.invitationExpiresAt), now),
                    })}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          {isPending ? (
            <>
              <Badge variant={isExpired ? "error" : "warning"} size="sm">
                {isExpired
                  ? tAthletes("invitationExpired")
                  : isRequest
                    ? tAthletes("requestPending")
                    : tAthletes("invitationPending")}
              </Badge>
              {!isExpired && onResendInvite && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-1.5 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResendInvite(athlete.connectionId);
                  }}
                  loading={isResending}
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              )}
              {!isExpired && onWithdrawInvite && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-1.5 text-xs text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onWithdrawInvite(athlete.connectionId);
                  }}
                  loading={isWithdrawing}
                >
                  <Undo2 className="h-3 w-3" />
                </Button>
              )}
            </>
          ) : (
            <Badge variant="success" size="sm">
              {tAthletes("active")}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        {teamName ? (
          <Badge variant="outline" size="sm">
            {teamName}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}

// ── Droppable Team Row ─────────────────────────────────────────

function DroppableTeamRow({
  team,
  athleteCount,
  isExpanded,
  onToggle,
}: {
  team: TeamListItem;
  athleteCount: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations("teams");
  const { isOver, setNodeRef } = useDroppable({
    id: `team-${team.id}`,
    data: { type: "team", team },
  });

  return (
    <TableRow
      ref={setNodeRef}
      className={cn(
        "bg-muted/30 font-medium cursor-pointer transition-colors",
        isOver && "ring-2 ring-primary bg-primary/5"
      )}
      onClick={onToggle}
    >
      <TableCell className="w-10">
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              isExpanded && "rotate-180"
            )}
          />
        </Button>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8 shrink-0">
            {team.logoUrl && (
              <AvatarImage src={team.logoUrl} alt={team.name} />
            )}
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {team.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <Link
            href={{ pathname: "/organisation/teams/[id]", params: { id: team.id } }}
            className="hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {team.name}
          </Link>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" size="sm" className="gap-1">
          <Users className="h-3 w-3" />
          {t("trainerCount", { count: team.trainerCount })}
        </Badge>
      </TableCell>
      <TableCell>
        <span className="text-sm">
          {t("athletesInTeam", { count: athleteCount })}
        </span>
      </TableCell>
    </TableRow>
  );
}

// ── Table View Main Component ──────────────────────────────────

interface TableViewProps {
  teams: TeamListItem[];
  athletes: AthleteListItem[];
  teamAthleteMap: Record<string, string | null>;
  teamNameMap: Record<string, string>;
  sortOption?: OrganisationSortOption;
  onSortChange?: (option: OrganisationSortOption) => void;
  showAthletesFirst?: boolean;
  onResendInvite?: (connectionId: string) => void;
  resendingId?: string | null;
  onWithdrawInvite?: (connectionId: string) => void;
  withdrawingId?: string | null;
}

export function TableView({
  teams,
  athletes,
  teamAthleteMap,
  teamNameMap,
  sortOption,
  onSortChange,
  showAthletesFirst = false,
  onResendInvite,
  resendingId,
  onWithdrawInvite,
  withdrawingId,
}: TableViewProps) {
  const t = useTranslations("teams");
  const [expandedTeamId, setExpandedTeamId] = React.useState<string | null>(
    null
  );

  const unassignedAthletes = athletes.filter((a) => !teamAthleteMap[a.id]);
  const getTeamAthletes = (teamId: string) =>
    athletes.filter((a) => teamAthleteMap[a.id] === teamId);

  const { isOver: isOverUnassigned, setNodeRef: unassignedRef } = useDroppable({
    id: "unassigned",
    data: { type: "unassigned" },
  });

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>
              <button
                type="button"
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                onClick={() => {
                  if (!onSortChange) return;
                  if (sortOption === "name-asc") {
                    onSortChange("name-desc");
                  } else {
                    onSortChange("name-asc");
                  }
                }}
              >
                {t("columnName")}
                {sortOption === "name-asc" ? (
                  <ArrowUp className="h-3.5 w-3.5" />
                ) : sortOption === "name-desc" ? (
                  <ArrowDown className="h-3.5 w-3.5" />
                ) : (
                  <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
                )}
              </button>
            </TableHead>
            <TableHead>{t("columnStatus")}</TableHead>
            <TableHead>{t("tabTeams")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {showAthletesFirst && (
            <>
              {unassignedAthletes.length > 0 && (
                <>
                  <TableRow
                    ref={unassignedRef}
                    className={cn(
                      "bg-muted/20",
                      isOverUnassigned && "ring-2 ring-primary bg-primary/5"
                    )}
                  >
                    <TableCell className="w-10" />
                    <TableCell colSpan={3} className="font-medium text-muted-foreground">
                      {t("unassigned")} ({unassignedAthletes.length})
                    </TableCell>
                  </TableRow>
                  {unassignedAthletes.map((athlete) => (
                    <DraggableAthleteRow
                      key={athlete.id}
                      athlete={athlete}
                      teamName={null}
                      onResendInvite={onResendInvite}
                      isResending={resendingId === athlete.connectionId}
                      onWithdrawInvite={onWithdrawInvite}
                      isWithdrawing={withdrawingId === athlete.connectionId}
                    />
                  ))}
                </>
              )}
            </>
          )}

          {/* Team rows with accordion */}
          {teams.map((team) => {
            const teamAthletes = getTeamAthletes(team.id);
            const isExpanded = expandedTeamId === team.id;
            return (
              <React.Fragment key={team.id}>
                <DroppableTeamRow
                  team={team}
                  athleteCount={teamAthletes.length}
                  isExpanded={isExpanded}
                  onToggle={() =>
                    setExpandedTeamId((prev) =>
                      prev === team.id ? null : team.id
                    )
                  }
                />
                {isExpanded &&
                  teamAthletes.map((athlete) => (
                    <DraggableAthleteRow
                      key={athlete.id}
                      athlete={athlete}
                      teamName={null}
                      onResendInvite={onResendInvite}
                      isResending={resendingId === athlete.connectionId}
                      onWithdrawInvite={onWithdrawInvite}
                      isWithdrawing={withdrawingId === athlete.connectionId}
                    />
                  ))}
                {isExpanded && teamAthletes.length === 0 && (
                  <TableRow>
                    <TableCell />
                    <TableCell
                      colSpan={3}
                      className="text-sm text-muted-foreground italic py-3"
                    >
                      {t("athleteCount", { count: 0 })}
                    </TableCell>
                  </TableRow>
                )}
                {isExpanded && (
                  <TableRow>
                    <TableCell />
                    <TableCell colSpan={3} className="py-2">
                      <Link
                        href={{ pathname: "/organisation/teams/[id]", params: { id: team.id } }}
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
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}

          {/* Unassigned athletes (when teams first or default order) */}
          {!showAthletesFirst && unassignedAthletes.length > 0 && (
            <>
              <TableRow
                ref={!showAthletesFirst ? unassignedRef : undefined}
                className={cn(
                  "bg-muted/20",
                  isOverUnassigned && "ring-2 ring-primary bg-primary/5"
                )}
              >
                <TableCell className="w-10" />
                <TableCell colSpan={3} className="font-medium text-muted-foreground">
                  {t("unassigned")} ({unassignedAthletes.length})
                </TableCell>
              </TableRow>
              {unassignedAthletes.map((athlete) => (
                <DraggableAthleteRow
                  key={athlete.id}
                  athlete={athlete}
                  teamName={null}
                  onResendInvite={onResendInvite}
                  isResending={resendingId === athlete.connectionId}
                  onWithdrawInvite={onWithdrawInvite}
                  isWithdrawing={withdrawingId === athlete.connectionId}
                />
              ))}
            </>
          )}

          {/* Empty state */}
          {teams.length === 0 && athletes.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                {t("emptyUnifiedTitle")}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
