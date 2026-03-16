"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { inviteAthlete } from "@/lib/athletes/actions";
import { useEmailValidation } from "@/hooks/use-email-validation";

const inviteFormSchema = z.object({
  email: z.string().email().max(255),
  message: z.string().max(500).optional(),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

interface InviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteModal({ open, onOpenChange }: InviteModalProps) {
  const t = useTranslations("athletes");
  const tCommon = useTranslations("common");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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

  const emailValue = watch("email") ?? "";
  const messageValue = watch("message") ?? "";
  const emailValidation = useEmailValidation(emailValue);

  async function onSubmit(values: InviteFormValues) {
    setIsSubmitting(true);
    try {
      const result = await inviteAthlete({
        email: values.email,
        message: values.message,
      });

      if (result.success) {
        toast.success(t("inviteSent"));
        reset();
        onOpenChange(false);
      } else {
        const errorKey = result.error ?? "genericError";
        const errorMessages: Record<string, string> = {
          SELF_INVITE: t("errorSelfInvite"),
          ALREADY_CONNECTED: t("errorAlreadyConnected"),
          ALREADY_PENDING: t("errorAlreadyPending"),
          INVALID_INPUT: t("errorInvalidInput"),
          RATE_LIMITED: t("errorInviteRateLimited"),
          EMAIL_DOMAIN_INVALID: tCommon("emailNoMxRecord"),
        };
        toast.error(errorMessages[errorKey] ?? t("errorGeneric"));
      }
    } catch {
      toast.error(t("errorGeneric"));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      reset();
    }
    onOpenChange(nextOpen);
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleClose}
      size="md"
      title={t("inviteTitle")}
      description={t("inviteDescription")}
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
            form="invite-form"
            loading={isSubmitting}
          >
            {t("sendInvite")}
          </Button>
        </div>
      }
    >
      <form
        id="invite-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="invite-email">{t("inviteEmailLabel")}</Label>
          <Input
            id="invite-email"
            type="email"
            placeholder={t("inviteEmailPlaceholder")}
            {...register("email")}
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p className="text-body-sm text-error" role="alert">
              {t("errorInvalidEmail")}
            </p>
          )}
          {!errors.email && emailValidation.isValid === false && (
            <p className="text-body-sm text-warning" role="alert">
              {tCommon("emailNoMxRecord")}
            </p>
          )}
          {!errors.email && emailValidation.isValidating && (
            <p className="text-body-sm text-muted-foreground">
              {tCommon("emailValidating")}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="invite-message">
            {t("inviteMessageLabel")}
            <span className="ml-1 text-muted-foreground font-normal">
              ({t("optional")})
            </span>
          </Label>
          <Textarea
            id="invite-message"
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
