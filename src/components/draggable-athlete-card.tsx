"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useTranslations, useFormatter } from "next-intl";
import { Clock, GripVertical, Hourglass, RefreshCw, Undo2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AthleteListItem } from "@/lib/athletes/types";

interface DraggableAthleteCardProps {
  athlete: AthleteListItem;
  teamName?: string | null;
  isDragOverlay?: boolean;
  onResendInvite?: (connectionId: string) => void;
  isResending?: boolean;
  onWithdrawInvite?: (connectionId: string) => void;
  isWithdrawing?: boolean;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function DraggableAthleteCard({
  athlete,
  teamName,
  isDragOverlay = false,
  onResendInvite,
  isResending = false,
  onWithdrawInvite,
  isWithdrawing = false,
}: DraggableAthleteCardProps) {
  const t = useTranslations("teams");
  const tAthletes = useTranslations("athletes");
  const format = useFormatter();
  const isPending = athlete.status === "pending";
  const isExpired =
    isPending && new Date(athlete.invitationExpiresAt) < new Date();

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `athlete-${athlete.id}`,
      data: {
        type: "athlete",
        athlete,
      },
      disabled: isPending,
    });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        isDragging && !isDragOverlay && "opacity-40",
        isDragOverlay && "rotate-2 shadow-xl"
      )}
    >
      <Card
        className={cn(
          "transition-all duration-200",
          !isPending && "cursor-grab active:cursor-grabbing",
          isPending && "border-dashed opacity-60"
        )}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-2.5">
            {/* Drag handle */}
            {!isPending && (
              <button
                className="shrink-0 touch-none text-muted-foreground hover:text-foreground transition-colors"
                aria-label={t("dragAriaLabel")}
                {...attributes}
                {...listeners}
              >
                <GripVertical className="h-4 w-4" />
              </button>
            )}

            <Avatar className="h-9 w-9 shrink-0">
              {athlete.avatarUrl && (
                <AvatarImage
                  src={athlete.avatarUrl}
                  alt={`${athlete.firstName} ${athlete.lastName}`}
                />
              )}
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                {athlete.firstName && athlete.lastName
                  ? getInitials(athlete.firstName, athlete.lastName)
                  : "?"}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {athlete.firstName && athlete.lastName
                  ? `${athlete.firstName} ${athlete.lastName}`
                  : athlete.email}
              </p>
              {athlete.firstName && athlete.lastName && (
                <p className="truncate text-xs text-muted-foreground">
                  {athlete.email}
                </p>
              )}
              {isPending && (
                <div className="mt-0.5 space-y-0.5">
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3 shrink-0" />
                    {tAthletes("invitedAgo", {
                      time: format.relativeTime(new Date(athlete.invitedAt)),
                    })}
                  </p>
                  {!isExpired && (
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Hourglass className="h-3 w-3 shrink-0" />
                      {tAthletes("expiresIn", {
                        time: format.relativeTime(new Date(athlete.invitationExpiresAt)),
                      })}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {isPending ? (
                <>
                  <Badge variant={isExpired ? "error" : "warning"} size="sm">
                    {isExpired ? tAthletes("invitationExpired") : tAthletes("invitationPending")}
                  </Badge>
                  {!isExpired && onResendInvite && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 px-1.5 text-xs"
                      onClick={(e) => {
                        e.preventDefault();
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
                        e.preventDefault();
                        e.stopPropagation();
                        onWithdrawInvite(athlete.connectionId);
                      }}
                      loading={isWithdrawing}
                    >
                      <Undo2 className="h-3 w-3" />
                    </Button>
                  )}
                </>
              ) : teamName ? (
                <Badge variant="outline" size="sm" className="max-w-[120px] truncate">
                  {teamName}
                </Badge>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Static version for the drag overlay (no dnd-kit hooks).
 */
export function AthleteCardOverlay({
  athlete,
  teamName,
}: {
  athlete: AthleteListItem;
  teamName?: string | null;
}) {
  const tAthletes = useTranslations("athletes");

  return (
    <Card className="w-[300px] rotate-2 shadow-xl border-primary/50">
      <CardContent className="p-3">
        <div className="flex items-center gap-2.5">
          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Avatar className="h-9 w-9 shrink-0">
            {athlete.avatarUrl && (
              <AvatarImage
                src={athlete.avatarUrl}
                alt={`${athlete.firstName} ${athlete.lastName}`}
              />
            )}
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
              {athlete.firstName && athlete.lastName
                ? getInitials(athlete.firstName, athlete.lastName)
                : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {athlete.firstName && athlete.lastName
                ? `${athlete.firstName} ${athlete.lastName}`
                : athlete.email}
            </p>
          </div>
          {teamName && (
            <Badge variant="outline" size="sm" className="max-w-[100px] truncate shrink-0">
              {teamName}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
