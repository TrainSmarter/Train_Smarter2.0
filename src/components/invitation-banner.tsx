"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Mail, Clock } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/modal";
import { cn } from "@/lib/utils";
import { acceptInvitation, rejectInvitation } from "@/lib/athletes/actions";
import type { PendingInvitation } from "@/lib/athletes/types";

interface InvitationBannerProps {
  invitation: PendingInvitation;
}

export function InvitationBanner({ invitation }: InvitationBannerProps) {
  const t = useTranslations("athletes");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [isAccepting, setIsAccepting] = React.useState(false);
  const [isRejecting, setIsRejecting] = React.useState(false);
  const [showRejectDialog, setShowRejectDialog] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed) return null;

  const trainerName = `${invitation.trainerFirstName} ${invitation.trainerLastName}`.trim();
  const initials = `${invitation.trainerFirstName.charAt(0)}${invitation.trainerLastName.charAt(0)}`.toUpperCase();
  const isRequest = invitation.connectionType === "request";

  async function handleAccept() {
    setIsAccepting(true);
    try {
      const result = await acceptInvitation(invitation.connectionId);
      if (result.success) {
        toast.success(
          isRequest
            ? t("connectionRequestAccepted", { trainer: trainerName })
            : t("invitationAccepted")
        );
        setDismissed(true);
      } else if (result.error === "ALREADY_HAS_TRAINER") {
        toast.error(t("errorAlreadyHasTrainer"));
      } else {
        toast.error(t("errorGeneric"));
      }
    } catch {
      toast.error(t("errorGeneric"));
    } finally {
      setIsAccepting(false);
    }
  }

  async function handleReject() {
    setIsRejecting(true);
    try {
      const result = await rejectInvitation(invitation.connectionId);
      if (result.success) {
        toast.success(
          isRequest
            ? t("connectionRequestRejected")
            : t("invitationRejected")
        );
        setDismissed(true);
      } else {
        toast.error(t("errorGeneric"));
      }
    } catch {
      toast.error(t("errorGeneric"));
    } finally {
      setIsRejecting(false);
      setShowRejectDialog(false);
    }
  }

  // Connection requests don't expire
  const showExpired = !isRequest && invitation.isExpired;

  return (
    <>
      <div
        className={cn(
          "rounded-lg border p-4",
          showExpired
            ? "border-muted bg-muted/50"
            : "border-primary/30 bg-primary/5"
        )}
        role="alert"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              {invitation.trainerAvatarUrl && (
                <AvatarImage
                  src={invitation.trainerAvatarUrl}
                  alt={trainerName}
                />
              )}
              <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                {initials || <Mail className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              {showExpired ? (
                <p className="text-body text-muted-foreground">
                  {t("invitationExpiredBanner", { trainer: trainerName })}
                </p>
              ) : isRequest ? (
                <p className="text-body text-foreground">
                  {t("connectionRequestFromTrainer", { trainer: trainerName })}
                </p>
              ) : (
                <p className="text-body text-foreground">
                  {t("invitationFromTrainer", { trainer: trainerName })}
                </p>
              )}
              {invitation.invitationMessage && !showExpired && (
                <p className="mt-1 text-body-sm text-muted-foreground italic">
                  &ldquo;{invitation.invitationMessage}&rdquo;
                </p>
              )}
              <p className="mt-1 flex items-center gap-1 text-caption text-muted-foreground">
                <Clock className="h-3 w-3" />
                {t("invitedOn", {
                  date: new Date(invitation.invitedAt).toLocaleDateString(locale, { year: "numeric", month: "2-digit", day: "2-digit" }),
                })}
              </p>
            </div>
          </div>

          {!showExpired && (
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRejectDialog(true)}
                disabled={isAccepting}
              >
                {t("decline")}
              </Button>
              <Button
                size="sm"
                onClick={handleAccept}
                loading={isAccepting}
              >
                {t("accept")}
              </Button>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        variant="danger"
        title={
          isRequest
            ? t("rejectConnectionDialogTitle")
            : t("rejectDialogTitle")
        }
        message={
          isRequest
            ? t("rejectConnectionDialogMessage", { trainer: trainerName })
            : t("rejectDialogMessage", { trainer: trainerName })
        }
        confirmLabel={t("decline")}
        cancelLabel={tCommon("cancel")}
        onConfirm={handleReject}
        loading={isRejecting}
      />
    </>
  );
}
