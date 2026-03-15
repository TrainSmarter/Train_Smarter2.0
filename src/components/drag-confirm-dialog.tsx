"use client";

import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/modal";

interface DragConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athleteName: string;
  fromTeamName: string;
  toTeamName: string;
  onConfirm: () => void;
  loading?: boolean;
}

export function DragConfirmDialog({
  open,
  onOpenChange,
  athleteName,
  fromTeamName,
  toTeamName,
  onConfirm,
  loading = false,
}: DragConfirmDialogProps) {
  const t = useTranslations("teams");
  const tCommon = useTranslations("common");

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      variant="primary"
      title={t("dragConfirmTitle")}
      message={t("dragConfirmMessage", {
        name: athleteName,
        fromTeam: fromTeamName,
        toTeam: toTeamName,
      })}
      confirmLabel={t("dragConfirmMoveButton")}
      cancelLabel={tCommon("cancel")}
      onConfirm={onConfirm}
      loading={loading}
    />
  );
}
