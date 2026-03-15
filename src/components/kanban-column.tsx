"use client";

import { useDroppable } from "@dnd-kit/core";
import { useTranslations } from "next-intl";
import { Plus, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { DraggableAthleteCard } from "@/components/draggable-athlete-card";
import type { AthleteListItem } from "@/lib/athletes/types";

interface KanbanColumnProps {
  /** Column ID: "team-{uuid}" or "unassigned" */
  id: string;
  title: string;
  athleteCount: number;
  trainerCount?: number;
  athletes: AthleteListItem[];
  /** If this is a team column, no team badge needed on cards */
  isUnassigned?: boolean;
  /** Callback to open the invite athlete flow (only for unassigned column) */
  onInviteAthlete?: () => void;
}

export function KanbanColumn({
  id,
  title,
  athleteCount,
  trainerCount,
  athletes,
  isUnassigned = false,
  onInviteAthlete,
}: KanbanColumnProps) {
  const t = useTranslations("teams");
  const tAthletes = useTranslations("athletes");
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: {
      type: isUnassigned ? "unassigned" : "team",
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-[280px] shrink-0 flex-col rounded-lg border bg-muted/30",
        isOver && "ring-2 ring-primary ring-offset-1 bg-primary/5"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <h3 className="truncate text-sm font-medium text-foreground">
          {title}
        </h3>
        <div className="flex items-center gap-1.5 ml-2 shrink-0">
          {trainerCount != null && !isUnassigned && (
            <Badge variant="outline" size="sm" className="gap-0.5 text-xs">
              {t("trainerCount", { count: trainerCount })}
            </Badge>
          )}
          <Badge variant="secondary" size="sm">
            {t("athleteCount", { count: athleteCount })}
          </Badge>
        </div>
      </div>

      {/* Column Body */}
      <ScrollArea className="flex-1 p-2" style={{ maxHeight: "calc(100vh - 320px)" }}>
        {athletes.length > 0 ? (
          <div className="space-y-1.5">
            {athletes.map((athlete) => (
              <DraggableAthleteCard
                key={athlete.id}
                athlete={athlete}
                teamName={null}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="h-6 w-6 text-muted-foreground/50 mb-2" />
            <p className="text-xs text-muted-foreground">
              {t("athleteCount", { count: 0 })}
            </p>
          </div>
        )}
      </ScrollArea>

      {/* Invite button for unassigned column */}
      {isUnassigned && onInviteAthlete && (
        <div className="border-t px-2 py-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onInviteAthlete}
            iconLeft={<Plus className="h-3.5 w-3.5" />}
          >
            {tAthletes("inviteAthlete")}
          </Button>
        </div>
      )}
    </div>
  );
}
