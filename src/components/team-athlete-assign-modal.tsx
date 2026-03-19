"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { assignAthletes } from "@/lib/teams/actions";
import type { AssignableAthlete } from "@/lib/teams/types";
import { getInitials } from "@/lib/utils";

interface TeamAthleteAssignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  athletes: AssignableAthlete[];
}

export function TeamAthleteAssignModal({
  open,
  onOpenChange,
  teamId,
  athletes,
}: TeamAthleteAssignModalProps) {
  const t = useTranslations("teams");
  const tCommon = useTranslations("common");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  // Initialize selections when modal opens
  React.useEffect(() => {
    if (open) {
      const initiallyAssigned = new Set(
        athletes.filter((a) => a.alreadyAssigned).map((a) => a.id)
      );
      setSelected(initiallyAssigned);
    }
  }, [open, athletes]);

  function toggleAthlete(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleSave() {
    setIsSubmitting(true);
    try {
      const result = await assignAthletes({
        teamId,
        athleteIds: [...selected],
      });

      if (result.success) {
        toast.success(t("assignmentsSaved"));
        onOpenChange(false);
      } else {
        const errorMessages: Record<string, string> = {
          INVALID_ATHLETES: t("errorInvalidAthletes"),
        };
        toast.error(errorMessages[result.error ?? ""] ?? t("errorGeneric"));
      }
    } catch {
      toast.error(t("errorGeneric"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title={t("assignAthletesTitle")}
      description={t("assignAthletesDescription")}
      footer={
        <div className="flex w-full gap-2 sm:justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            type="button"
          >
            {tCommon("cancel")}
          </Button>
          <Button
            onClick={handleSave}
            loading={isSubmitting}
          >
            {t("saveAssignments")}
          </Button>
        </div>
      }
    >
      {athletes.length === 0 ? (
        <p className="py-4 text-center text-body-sm text-muted-foreground">
          {t("athleteCount", { count: 0 })}
        </p>
      ) : (
        <div className="max-h-[400px] overflow-y-auto -mx-1 px-1">
          <div className="space-y-1">
            {athletes.map((athlete) => (
              <label
                key={athlete.id}
                className="flex cursor-pointer items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted/50"
              >
                <Checkbox
                  checked={selected.has(athlete.id)}
                  onCheckedChange={() => toggleAthlete(athlete.id)}
                  aria-label={`${athlete.firstName} ${athlete.lastName}`}
                />
                <Avatar className="h-8 w-8 shrink-0">
                  {athlete.avatarUrl && (
                    <AvatarImage
                      src={athlete.avatarUrl}
                      alt={`${athlete.firstName} ${athlete.lastName}`}
                    />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                    {getInitials(athlete.firstName, athlete.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm font-medium text-foreground">
                    {athlete.firstName} {athlete.lastName}
                  </p>
                  <p className="truncate text-caption text-muted-foreground">
                    {athlete.email}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
