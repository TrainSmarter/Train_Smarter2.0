"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ArrowLeft,
  Users,
  UserCheck,
  Dumbbell,
  Plus,
  Pencil,
  Archive,
  Mail,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/stats-card";
import { EmptyState } from "@/components/empty-state";
import { TeamTrainerList } from "@/components/team-trainer-list";
import { TeamAthleteList } from "@/components/team-athlete-list";
import { TeamFormModal } from "@/components/team-form-modal";
import { TeamInviteTrainerModal } from "@/components/team-invite-trainer-modal";
import { TeamAthleteAssignModal } from "@/components/team-athlete-assign-modal";
import { TeamArchiveDialog } from "@/components/team-archive-dialog";
import { TeamInvitationsList } from "@/components/team-invitations-list";
import type {
  TeamDetail,
  TeamMember,
  TeamAthlete,
  TeamInvitation,
  AssignableAthlete,
} from "@/lib/teams/types";
import { getNameInitials } from "@/lib/utils";

interface TeamDetailViewProps {
  team: TeamDetail;
  members: TeamMember[];
  athletes: TeamAthlete[];
  invitations: TeamInvitation[];
  assignableAthletes: AssignableAthlete[];
  currentUserId: string;
}

export function TeamDetailView({
  team,
  members,
  athletes,
  invitations,
  assignableAthletes,
  currentUserId,
}: TeamDetailViewProps) {
  const t = useTranslations("teams");
  const tCommon = useTranslations("common");

  const [editOpen, setEditOpen] = React.useState(false);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [archiveOpen, setArchiveOpen] = React.useState(false);

  return (
    <div className="space-y-6">
      {/* Back navigation + Header */}
      <div>
        <Link
          href="/organisation"
          className="inline-flex items-center gap-1 text-body-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {tCommon("back")}
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 shrink-0">
              {team.logoUrl && (
                <AvatarImage src={team.logoUrl} alt={team.name} />
              )}
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-medium">
                {getNameInitials(team.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-h1 text-foreground">{team.name}</h1>
              {team.description && (
                <p className="mt-1 text-body text-muted-foreground">
                  {team.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
              iconLeft={<Pencil className="h-4 w-4" />}
            >
              {tCommon("edit")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setArchiveOpen(true)}
              className="text-error hover:text-error"
              iconLeft={<Archive className="h-4 w-4" />}
            >
              {t("archiveTeam")}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          color="blue"
          icon={<Users className="h-5 w-5" />}
          title={t("trainers")}
          value={String(members.length)}
        />
        <StatsCard
          color="green"
          icon={<UserCheck className="h-5 w-5" />}
          title={t("athleteCount", { count: athletes.length })}
          value={String(athletes.length)}
        />
        <StatsCard
          color="purple"
          icon={<Dumbbell className="h-5 w-5" />}
          title={t("activePrograms")}
          value="0"
        />
      </div>

      {/* Trainer Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-h4">
            {t("trainers")} ({members.length})
          </CardTitle>
          <Button
            size="sm"
            onClick={() => setInviteOpen(true)}
            iconLeft={<Mail className="h-4 w-4" />}
          >
            {t("inviteTrainer")}
          </Button>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title={t("trainers")}
              description={t("inviteTrainerDescription")}
            />
          ) : (
            <TeamTrainerList
              teamId={team.id}
              members={members}
              currentUserId={currentUserId}
              memberCount={members.length}
            />
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations Section */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-h4">
              {t("pendingInvitations")} ({invitations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TeamInvitationsList teamId={team.id} invitations={invitations} />
          </CardContent>
        </Card>
      )}

      {/* Athletes Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-h4">
            {t("athleteCount", { count: athletes.length })} ({athletes.length})
          </CardTitle>
          <Button
            size="sm"
            onClick={() => setAssignOpen(true)}
            iconLeft={<Plus className="h-4 w-4" />}
          >
            {t("assignAthletes")}
          </Button>
        </CardHeader>
        <CardContent>
          {athletes.length === 0 ? (
            <EmptyState
              icon={<UserCheck className="h-8 w-8" />}
              title={t("athleteCount", { count: 0 })}
              description={t("assignAthletesDescription")}
              action={
                <Button
                  size="sm"
                  onClick={() => setAssignOpen(true)}
                  iconLeft={<Plus className="h-4 w-4" />}
                >
                  {t("assignAthletes")}
                </Button>
              }
            />
          ) : (
            <TeamAthleteList teamId={team.id} athletes={athletes} />
          )}
        </CardContent>
      </Card>

      {/* Active Programs Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-h4">{t("activePrograms")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Dumbbell className="h-8 w-8 text-muted-foreground mb-2" />
            <Badge variant="outline">{t("comingSoon")}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <TeamFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        team={team}
      />
      <TeamInviteTrainerModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        teamId={team.id}
      />
      <TeamAthleteAssignModal
        open={assignOpen}
        onOpenChange={setAssignOpen}
        teamId={team.id}
        athletes={assignableAthletes}
      />
      <TeamArchiveDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        teamId={team.id}
        teamName={team.name}
      />
    </div>
  );
}
