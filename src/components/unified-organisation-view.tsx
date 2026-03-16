"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Plus, Search, Filter } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { ViewSwitcher } from "@/components/view-switcher";
import { SortDropdown } from "@/components/sort-dropdown";
import { DragConfirmDialog } from "@/components/drag-confirm-dialog";
import { AthleteCardOverlay } from "@/components/draggable-athlete-card";
import { CardGridView } from "@/components/card-grid-view";
import { TableView } from "@/components/table-view";
import { KanbanView } from "@/components/kanban-view";
import { InviteModal } from "@/components/invite-modal";
import { TeamFormModal } from "@/components/team-form-modal";
import { ConfirmDialog } from "@/components/modal";
import { useOrganisationPreferences } from "@/hooks/use-organisation-preferences";
import { moveAthleteToTeam } from "@/lib/teams/actions";
import { resendInvitation, withdrawInvitation } from "@/lib/athletes/actions";
import type { TeamListItem } from "@/lib/teams/types";
import type { AthleteListItem } from "@/lib/athletes/types";

interface UnifiedOrganisationViewProps {
  athletes: AthleteListItem[];
  teams: TeamListItem[];
  initialTeamAthleteMap: Record<string, string | null>;
}

export function UnifiedOrganisationView({
  athletes,
  teams,
  initialTeamAthleteMap,
}: UnifiedOrganisationViewProps) {
  const t = useTranslations("teams");
  const tAthletes = useTranslations("athletes");
  const tCommon = useTranslations("common");

  // Preferences (persisted in localStorage)
  const { viewMode, sortOption, setViewMode, setSortOption, isHydrated } =
    useOrganisationPreferences();

  // Local state
  const [search, setSearch] = React.useState("");
  const [filterTeam, setFilterTeam] = React.useState<string>("all");
  const [filterStatus, setFilterStatus] = React.useState<string>("all");
  const [teamAthleteMap, setTeamAthleteMap] = React.useState(initialTeamAthleteMap);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [createTeamOpen, setCreateTeamOpen] = React.useState(false);

  // Resend / Withdraw invitation state
  const [resendingId, setResendingId] = React.useState<string | null>(null);
  const [withdrawingId, setWithdrawingId] = React.useState<string | null>(null);
  const [withdrawConfirm, setWithdrawConfirm] = React.useState<{
    open: boolean;
    connectionId: string;
    email: string;
  }>({ open: false, connectionId: "", email: "" });

  // Drag state
  const [activeAthlete, setActiveAthlete] = React.useState<AthleteListItem | null>(null);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = React.useState<{
    open: boolean;
    athleteId: string;
    athleteName: string;
    fromTeamName: string;
    toTeamId: string | null;
    toTeamName: string;
  }>({
    open: false,
    athleteId: "",
    athleteName: "",
    fromTeamName: "",
    toTeamId: null,
    toTeamName: "",
  });
  const [isMoving, setIsMoving] = React.useState(false);

  // Sync with server data when props change
  React.useEffect(() => {
    setTeamAthleteMap(initialTeamAthleteMap);
  }, [initialTeamAthleteMap]);

  // Team name lookup
  const teamNameMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const team of teams) {
      map[team.id] = team.name;
    }
    return map;
  }, [teams]);

  // DnD sensors
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 300, tolerance: 5 },
  });
  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });
  const sensors = useSensors(pointerSensor, touchSensor, keyboardSensor);

  // Filter athletes by search, team filter, and status filter
  const filteredAthletes = React.useMemo(() => {
    let result = [...athletes];

    // Status filter
    if (filterStatus === "active") {
      result = result.filter((a) => a.status === "active");
    } else if (filterStatus === "pending") {
      result = result.filter((a) => a.status === "pending");
    } else {
      // "all" — show active + pending (exclude disconnected/rejected)
      result = result.filter((a) => a.status === "active" || a.status === "pending");
    }

    // Team filter
    if (filterTeam === "unassigned") {
      result = result.filter((a) => !teamAthleteMap[a.id]);
    } else if (filterTeam !== "all") {
      result = result.filter((a) => teamAthleteMap[a.id] === filterTeam);
    }

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.firstName.toLowerCase().includes(q) ||
          a.lastName.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          `${a.firstName} ${a.lastName}`.toLowerCase().includes(q)
      );
    }

    return result;
  }, [athletes, search, filterTeam, filterStatus, teamAthleteMap]);

  // Filter teams by search and team filter
  const filteredTeams = React.useMemo(() => {
    let result = [...teams];

    // Team filter: if a specific team is selected, only show that team
    if (filterTeam !== "all" && filterTeam !== "unassigned") {
      result = result.filter((team) => team.id === filterTeam);
    } else if (filterTeam === "unassigned") {
      // When filtering "unassigned", hide teams section
      return [];
    }

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (team) =>
          team.name.toLowerCase().includes(q) ||
          (team.description ?? "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [teams, search, filterTeam]);

  // Sort teams
  const sortedTeams = React.useMemo(() => {
    const sorted = [...filteredTeams];
    if (sortOption === "name-asc" || sortOption === "athletes-first") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === "name-desc") {
      sorted.sort((a, b) => b.name.localeCompare(a.name));
    }
    return sorted;
  }, [filteredTeams, sortOption]);

  // Sort athletes
  const sortedAthletes = React.useMemo(() => {
    const sorted = [...filteredAthletes];
    if (sortOption === "name-asc" || sortOption === "teams-first") {
      sorted.sort((a, b) =>
        `${a.lastName} ${a.firstName}`.localeCompare(
          `${b.lastName} ${b.firstName}`
        )
      );
    } else if (sortOption === "name-desc") {
      sorted.sort((a, b) =>
        `${b.lastName} ${b.firstName}`.localeCompare(
          `${a.lastName} ${a.firstName}`
        )
      );
    } else if (sortOption === "status") {
      // Active first, then pending
      sorted.sort((a, b) => {
        if (a.status === b.status) {
          return `${a.lastName} ${a.firstName}`.localeCompare(
            `${b.lastName} ${b.firstName}`
          );
        }
        return a.status === "active" ? -1 : 1;
      });
    } else if (sortOption === "athletes-first") {
      sorted.sort((a, b) =>
        `${a.lastName} ${a.firstName}`.localeCompare(
          `${b.lastName} ${b.firstName}`
        )
      );
    }
    return sorted;
  }, [filteredAthletes, sortOption]);

  // Determine section render order based on sort option
  const showAthletesFirst = sortOption === "athletes-first";

  // Empty state
  const hasNoData = athletes.length === 0 && teams.length === 0;
  const hasNoResults = filteredAthletes.length === 0 && filteredTeams.length === 0 && !hasNoData;

  // ── Resend / Withdraw Handlers ───────────────────────────────

  async function handleResend(connectionId: string) {
    setResendingId(connectionId);
    try {
      const result = await resendInvitation(connectionId);
      if (result.success) {
        toast.success(tAthletes("resendSuccess"));
      } else if (result.error === "RATE_LIMITED") {
        toast.error(tAthletes("resendRateLimited"));
      } else {
        toast.error(tAthletes("errorGeneric"));
      }
    } catch {
      toast.error(tAthletes("errorGeneric"));
    } finally {
      setResendingId(null);
    }
  }

  function handleWithdrawClick(connectionId: string) {
    const athlete = athletes.find((a) => a.connectionId === connectionId);
    if (!athlete) return;
    setWithdrawConfirm({
      open: true,
      connectionId,
      email: athlete.email,
    });
  }

  async function handleWithdrawConfirm() {
    const { connectionId, email } = withdrawConfirm;
    setWithdrawingId(connectionId);
    try {
      const result = await withdrawInvitation(connectionId);
      if (result.success) {
        toast.success(tAthletes("withdrawSuccess", { email }));
      } else {
        toast.error(tAthletes("withdrawError"));
      }
    } catch {
      toast.error(tAthletes("withdrawError"));
    } finally {
      setWithdrawingId(null);
      setWithdrawConfirm({ open: false, connectionId: "", email: "" });
    }
  }

  // ── DnD Handlers ──────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const data = active.data.current;
    if (data?.type === "athlete") {
      setActiveAthlete(data.athlete as AthleteListItem);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveAthlete(null);
    const { active, over } = event;

    if (!over) return;

    const athleteData = active.data.current;
    if (athleteData?.type !== "athlete") return;

    const athlete = athleteData.athlete as AthleteListItem;
    const overId = over.id as string;
    const overData = over.data.current;

    // Determine target team
    let targetTeamId: string | null = null;
    let targetTeamName = t("unassigned");

    if (overId === "unassigned" || overData?.type === "unassigned") {
      targetTeamId = null;
      targetTeamName = t("unassigned");
    } else if (overId.startsWith("team-")) {
      targetTeamId = overId.replace("team-", "");
      targetTeamName = teamNameMap[targetTeamId] ?? "";
    } else {
      return;
    }

    const currentTeamId = teamAthleteMap[athlete.id] ?? null;

    // Same team? No-op
    if (currentTeamId === targetTeamId) {
      toast.info(t("alreadyInTeam"));
      return;
    }

    const athleteName = `${athlete.firstName} ${athlete.lastName}`.trim();

    // If athlete is already in a different team, show confirmation
    if (currentTeamId && targetTeamId) {
      setConfirmDialog({
        open: true,
        athleteId: athlete.id,
        athleteName,
        fromTeamName: teamNameMap[currentTeamId] ?? "",
        toTeamId: targetTeamId,
        toTeamName: targetTeamName,
      });
      return;
    }

    // Direct move (no confirmation needed)
    executeMove(athlete.id, targetTeamId);
  }

  async function executeMove(
    athleteId: string,
    targetTeamId: string | null
  ) {
    // Optimistic update
    const prevMap = { ...teamAthleteMap };
    setTeamAthleteMap((prev) => ({
      ...prev,
      [athleteId]: targetTeamId,
    }));

    try {
      const result = await moveAthleteToTeam({ athleteId, targetTeamId });
      if (result.success) {
        toast.success(t("moveSuccess"));
      } else {
        // Rollback
        setTeamAthleteMap(prevMap);
        toast.error(t("moveError"));
      }
    } catch {
      setTeamAthleteMap(prevMap);
      toast.error(t("moveError"));
    }
  }

  async function handleConfirmMove() {
    setIsMoving(true);
    try {
      await executeMove(confirmDialog.athleteId, confirmDialog.toTeamId);
    } finally {
      setIsMoving(false);
      setConfirmDialog((prev) => ({ ...prev, open: false }));
    }
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h1 text-foreground">{t("tabAthletes")} & {t("tabTeams")}</h1>
          <p className="mt-1 text-body-lg text-muted-foreground">
            {tAthletes("subtitle", {
              count: athletes.filter((a) => a.status === "active").length,
            })}{" "}
            · {t("subtitle", { count: teams.length })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setCreateTeamOpen(true)}
            iconLeft={<Plus className="h-4 w-4" />}
          >
            {t("createTeam")}
          </Button>
          <Button
            onClick={() => setInviteOpen(true)}
            iconLeft={<Plus className="h-4 w-4" />}
          >
            {tAthletes("inviteAthlete")}
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      {!hasNoData && (
        <div className="mt-6 flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t("searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  aria-label={tCommon("search")}
                />
              </div>
              <SortDropdown value={sortOption} onChange={setSortOption} />
            </div>
            {isHydrated && (
              <ViewSwitcher value={viewMode} onChange={setViewMode} />
            )}
          </div>

          {/* Filter dropdowns */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Select value={filterTeam} onValueChange={setFilterTeam}>
              <SelectTrigger className="w-full sm:w-[200px]" aria-label={t("filterTeam")}>
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filterAllTeams")}</SelectItem>
                <SelectItem value="unassigned">{t("unassigned")}</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[200px]" aria-label={t("filterStatus")}>
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filterAllStatuses")}</SelectItem>
                <SelectItem value="active">{t("filterStatusActive")}</SelectItem>
                <SelectItem value="pending">{t("filterStatusPending")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Empty State */}
      {hasNoData && (
        <EmptyState
          className="mt-12"
          icon="👥"
          title={t("emptyUnifiedTitle")}
          description={t("emptyUnifiedDescription")}
          action={
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCreateTeamOpen(true)}
                iconLeft={<Plus className="h-4 w-4" />}
              >
                {t("createTeam")}
              </Button>
              <Button
                onClick={() => setInviteOpen(true)}
                iconLeft={<Plus className="h-4 w-4" />}
              >
                {tAthletes("inviteAthlete")}
              </Button>
            </div>
          }
        />
      )}

      {/* No Search Results */}
      {hasNoResults && search && (
        <EmptyState
          className="mt-12"
          icon="🔍"
          title={tCommon("noResults")}
          description={t("noSearchResults", { query: search })}
        />
      )}

      {/* Views */}
      {!hasNoData && !hasNoResults && isHydrated && (
        <div className="mt-6">
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {viewMode === "grid" && (
              <CardGridView
                teams={sortedTeams}
                athletes={sortedAthletes}
                teamAthleteMap={teamAthleteMap}
                sortOption={sortOption}
                teamNameMap={teamNameMap}
                showAthletesFirst={showAthletesFirst}
                onResendInvite={handleResend}
                resendingId={resendingId}
                onWithdrawInvite={handleWithdrawClick}
                withdrawingId={withdrawingId}
              />
            )}

            {viewMode === "table" && (
              <TableView
                teams={sortedTeams}
                athletes={sortedAthletes}
                teamAthleteMap={teamAthleteMap}
                teamNameMap={teamNameMap}
                sortOption={sortOption}
                onSortChange={setSortOption}
                showAthletesFirst={showAthletesFirst}
                onResendInvite={handleResend}
                resendingId={resendingId}
                onWithdrawInvite={handleWithdrawClick}
                withdrawingId={withdrawingId}
              />
            )}

            {viewMode === "kanban" && (
              <KanbanView
                teams={sortedTeams}
                athletes={sortedAthletes}
                teamAthleteMap={teamAthleteMap}
                onInviteAthlete={() => setInviteOpen(true)}
                showAthletesFirst={showAthletesFirst}
                onResendInvite={handleResend}
                resendingId={resendingId}
                onWithdrawInvite={handleWithdrawClick}
                withdrawingId={withdrawingId}
              />
            )}

            <DragOverlay>
              {activeAthlete && (
                <AthleteCardOverlay
                  athlete={activeAthlete}
                  teamName={
                    teamAthleteMap[activeAthlete.id]
                      ? teamNameMap[teamAthleteMap[activeAthlete.id]!]
                      : null
                  }
                />
              )}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {/* Modals */}
      <InviteModal open={inviteOpen} onOpenChange={setInviteOpen} />
      <TeamFormModal open={createTeamOpen} onOpenChange={setCreateTeamOpen} />

      {/* Drag Confirm Dialog */}
      <DragConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog((prev) => ({ ...prev, open }))
        }
        athleteName={confirmDialog.athleteName}
        fromTeamName={confirmDialog.fromTeamName}
        toTeamName={confirmDialog.toTeamName}
        onConfirm={handleConfirmMove}
        loading={isMoving}
      />

      {/* Withdraw Confirm Dialog */}
      <ConfirmDialog
        open={withdrawConfirm.open}
        onOpenChange={(open) =>
          setWithdrawConfirm((prev) => ({ ...prev, open }))
        }
        variant="danger"
        title={tAthletes("withdrawDialogTitle")}
        message={tAthletes("withdrawDialogMessage", { email: withdrawConfirm.email })}
        confirmLabel={tAthletes("withdraw")}
        cancelLabel={tCommon("cancel")}
        onConfirm={handleWithdrawConfirm}
        loading={withdrawingId !== null}
      />
    </>
  );
}
