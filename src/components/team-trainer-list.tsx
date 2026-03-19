"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { MoreHorizontal, UserMinus, LogOut } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/modal";
import { removeTrainerFromTeam, leaveTeam } from "@/lib/teams/actions";
import type { TeamMember } from "@/lib/teams/types";
import { getInitials } from "@/lib/utils";

interface TeamTrainerListProps {
  teamId: string;
  members: TeamMember[];
  currentUserId: string;
  memberCount: number;
}

export function TeamTrainerList({
  teamId,
  members,
  currentUserId,
  memberCount,
}: TeamTrainerListProps) {
  const t = useTranslations("teams");
  const tCommon = useTranslations("common");
  const [removeTarget, setRemoveTarget] = React.useState<TeamMember | null>(null);
  const [leaveOpen, setLeaveOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const isLastTrainer = memberCount <= 1;

  async function handleRemoveTrainer() {
    if (!removeTarget) return;
    setIsLoading(true);
    try {
      const result = await removeTrainerFromTeam({
        teamId,
        userId: removeTarget.userId,
      });
      if (result.success) {
        toast.success(t("trainerRemoved"));
        setRemoveTarget(null);
      } else {
        toast.error(t("errorGeneric"));
      }
    } catch {
      toast.error(t("errorGeneric"));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLeaveTeam() {
    setIsLoading(true);
    try {
      const result = await leaveTeam(teamId);
      if (result.success) {
        toast.success(t("teamLeft"));
        setLeaveOpen(false);
      } else {
        toast.error(t("errorGeneric"));
      }
    } catch {
      toast.error(t("errorGeneric"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="space-y-2">
        {members.map((member) => {
          const isSelf = member.userId === currentUserId;
          return (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted/50"
            >
              <Avatar className="h-10 w-10 shrink-0">
                {member.avatarUrl && (
                  <AvatarImage
                    src={member.avatarUrl}
                    alt={`${member.firstName} ${member.lastName}`}
                  />
                )}
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {getInitials(member.firstName, member.lastName)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-body font-medium text-foreground">
                    {member.firstName} {member.lastName}
                  </p>
                  {isSelf && (
                    <Badge variant="outline" size="sm">
                      {t("you")}
                    </Badge>
                  )}
                </div>
                <p className="text-body-sm text-muted-foreground">
                  {t("athleteCount", { count: member.athleteCount })}
                </p>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">{tCommon("edit")}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isSelf ? (
                    <DropdownMenuItem
                      onClick={() => setLeaveOpen(true)}
                      className="text-error focus:text-error"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      {t("leaveTeam")}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => setRemoveTarget(member)}
                      className="text-error focus:text-error"
                    >
                      <UserMinus className="mr-2 h-4 w-4" />
                      {t("removeTrainer")}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </div>

      {/* Remove Trainer Dialog */}
      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        variant="danger"
        title={t("removeTrainerTitle")}
        message={t("removeTrainerMessage", {
          name: removeTarget
            ? `${removeTarget.firstName} ${removeTarget.lastName}`
            : "",
        })}
        confirmLabel={t("removeTrainer")}
        cancelLabel={tCommon("cancel")}
        onConfirm={handleRemoveTrainer}
        loading={isLoading}
      />

      {/* Leave Team Dialog */}
      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        variant="danger"
        title={t("leaveTeamTitle")}
        message={
          isLastTrainer
            ? t("leaveTeamLastTrainer")
            : t("leaveTeamMessage")
        }
        confirmLabel={t("leaveTeam")}
        cancelLabel={tCommon("cancel")}
        onConfirm={handleLeaveTeam}
        loading={isLoading}
      />
    </>
  );
}
