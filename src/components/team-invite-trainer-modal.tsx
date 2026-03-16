"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";

import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { inviteTrainer } from "@/lib/teams/actions";
import { useEmailValidation } from "@/hooks/use-email-validation";

const inviteFormSchema = z.object({
  email: z.string().email().max(255),
  message: z.string().max(500).optional(),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

interface TeamInviteTrainerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
}

export function TeamInviteTrainerModal({
  open,
  onOpenChange,
  teamId,
}: TeamInviteTrainerModalProps) {
  const t = useTranslations("teams");
  const tCommon = useTranslations("common");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [inviteLink, setInviteLink] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      message: "",
    },
  });

  const messageValue = watch("message") ?? "";
  const emailValue = watch("email");
  const { isValidating: isEmailValidating, error: emailValidationError } =
    useEmailValidation(emailValue);

  async function onSubmit(values: InviteFormValues) {
    setIsSubmitting(true);
    try {
      const result = await inviteTrainer({
        teamId,
        email: values.email,
        message: values.message,
      });

      if (result.success) {
        toast.success(t("inviteSent"));
        if (result.token) {
          const link = `${window.location.origin}/api/teams/invite-token?token=${result.token}`;
          setInviteLink(link);
        } else {
          reset();
          onOpenChange(false);
        }
      } else {
        const errorMessages: Record<string, string> = {
          SELF_INVITE: t("errorSelfInvite"),
          ALREADY_MEMBER: t("errorAlreadyMember"),
          ALREADY_INVITED: t("errorAlreadyInvited"),
          RATE_LIMITED: t("errorRateLimited"),
          EMAIL_DOMAIN_INVALID: tCommon("emailNoMxRecord"),
        };
        toast.error(errorMessages[result.error ?? ""] ?? t("errorGeneric"));
      }
    } catch {
      toast.error(t("errorGeneric"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopyLink() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success(t("inviteLinkCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("errorGeneric"));
    }
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      reset();
      setInviteLink(null);
      setCopied(false);
    }
    onOpenChange(nextOpen);
  }

  // After invite is created, show the copyable link
  if (inviteLink) {
    return (
      <Modal
        open={open}
        onOpenChange={handleClose}
        size="md"
        title={t("inviteSent")}
        description={t("inviteLinkDescription")}
        footer={
          <div className="flex w-full gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => handleClose(false)}>
              {tCommon("close")}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              value={inviteLink}
              readOnly
              className="text-body-sm font-mono"
            />
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={handleCopyLink}
            >
              {copied ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-caption text-muted-foreground">
            {t("inviteLinkHint")}
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleClose}
      size="md"
      title={t("inviteTrainerTitle")}
      description={t("inviteTrainerDescription")}
      footer={
        <div className="flex w-full gap-2 sm:justify-end">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            type="button"
          >
            {tCommon("cancel")}
          </Button>
          <Button
            type="submit"
            form="invite-trainer-form"
            loading={isSubmitting}
          >
            {t("sendInvite")}
          </Button>
        </div>
      }
    >
      <form
        id="invite-trainer-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="invite-trainer-email">{t("inviteEmailLabel")}</Label>
          <Input
            id="invite-trainer-email"
            type="email"
            placeholder={t("inviteEmailPlaceholder")}
            {...register("email")}
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p className="text-body-sm text-error" role="alert">
              {t("errorEmailRequired")}
            </p>
          )}
          {!errors.email && isEmailValidating && (
            <p className="text-body-sm text-muted-foreground" role="status">
              {tCommon("emailValidating")}
            </p>
          )}
          {!errors.email && emailValidationError && (
            <p className="text-body-sm text-warning" role="status">
              {tCommon(emailValidationError as "emailNoMxRecord" | "emailInvalidDomain")}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="invite-trainer-message">
            {t("inviteMessageLabel")}
            <span className="ml-1 text-muted-foreground font-normal">
              ({t("optional")})
            </span>
          </Label>
          <Textarea
            id="invite-trainer-message"
            placeholder={t("inviteMessagePlaceholder")}
            maxLength={500}
            rows={3}
            {...register("message")}
          />
          <p className="text-caption text-muted-foreground text-right">
            {messageValue.length}/500
          </p>
        </div>
      </form>
    </Modal>
  );
}
