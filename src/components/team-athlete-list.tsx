"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { MoreHorizontal, UserMinus } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Modal } from "@/components/modal";
import { removeAthleteFromTeam } from "@/lib/teams/actions";
import type { TeamAthlete } from "@/lib/teams/types";
import { getInitials } from "@/lib/utils";

interface TeamAthleteListProps {
  teamId: string;
  athletes: TeamAthlete[];
}

export function TeamAthleteList({ teamId, athletes }: TeamAthleteListProps) {
  const t = useTranslations("teams");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [removeTarget, setRemoveTarget] = React.useState<TeamAthlete | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  async function handleRemove(disconnectFromProj5: boolean) {
    if (!removeTarget) return;
    setIsLoading(true);
    try {
      const result = await removeAthleteFromTeam({
        teamId,
        athleteId: removeTarget.athleteId,
        disconnectFromProj5,
      });
      if (result.success) {
        toast.success(t("athleteRemoved"));
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

  return (
    <>
      <div className="space-y-2">
        {athletes.map((athlete) => (
          <div
            key={athlete.id}
            className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted/50"
          >
            <Avatar className="h-10 w-10 shrink-0">
              {athlete.avatarUrl && (
                <AvatarImage
                  src={athlete.avatarUrl}
                  alt={`${athlete.firstName} ${athlete.lastName}`}
                />
              )}
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {getInitials(athlete.firstName, athlete.lastName)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <p className="truncate text-body font-medium text-foreground">
                {athlete.firstName} {athlete.lastName}
              </p>
              <p className="text-body-sm text-muted-foreground">
                {t("assignedBy", { name: athlete.assignedByName })} ·{" "}
                {new Date(athlete.assignedAt).toLocaleDateString(locale, {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                })}
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
                <DropdownMenuItem
                  onClick={() => setRemoveTarget(athlete)}
                  className="text-error focus:text-error"
                >
                  <UserMinus className="mr-2 h-4 w-4" />
                  {t("removeFromTeam")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>

      {/* Remove Athlete Dialog — 2 options as per spec */}
      <Modal
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        size="sm"
        title={t("removeAthleteTitle")}
        description={t("removeAthleteMessage", {
          name: removeTarget
            ? `${removeTarget.firstName} ${removeTarget.lastName}`
            : "",
        })}
      >
        <div className="space-y-3">
          <button
            type="button"
            className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={() => handleRemove(false)}
            disabled={isLoading}
          >
            <p className="text-body font-medium text-foreground">
              {t("keepConnection")}
            </p>
            <p className="text-body-sm text-muted-foreground">
              {t("keepConnectionDesc")}
            </p>
          </button>

          <button
            type="button"
            className="w-full rounded-lg border border-error/30 p-3 text-left transition-colors hover:bg-error/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={() => handleRemove(true)}
            disabled={isLoading}
          >
            <p className="text-body font-medium text-error">
              {t("fullDisconnect")}
            </p>
            <p className="text-body-sm text-muted-foreground">
              {t("fullDisconnectDesc")}
            </p>
          </button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setRemoveTarget(null)}
            type="button"
          >
            {tCommon("cancel")}
          </Button>
        </div>
      </Modal>
    </>
  );
}
