"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, UserCheck } from "lucide-react";

import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { inviteAthlete, lookupAthleteByEmail, sendConnectionRequest } from "@/lib/athletes/actions";
import type { LookupAthleteResult } from "@/lib/athletes/actions";
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
  const [lookupResult, setLookupResult] = React.useState<LookupAthleteResult | null>(null);
  const [isLookingUp, setIsLookingUp] = React.useState(false);

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

  // Debounced account lookup when email is valid
  const abortControllerRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    setLookupResult(null);
    setIsLookingUp(false);

    const trimmed = emailValue.trim();
    // Only look up if email has a valid-looking format
    if (!trimmed || !trimmed.includes("@") || trimmed.indexOf("@") === trimmed.length - 1) {
      return;
    }

    const domain = trimmed.split("@").pop();
    if (!domain || !domain.includes(".")) {
      return;
    }

    setIsLookingUp(true);

    const timeoutId = setTimeout(async () => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const result = await lookupAthleteByEmail(trimmed);
        if (!controller.signal.aborted) {
          setLookupResult(result);
        }
      } catch {
        // Lookup failure is non-blocking
        if (!controller.signal.aborted) {
          setLookupResult(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLookingUp(false);
        }
      }
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      abortControllerRef.current?.abort();
    };
  }, [emailValue]);

  const isConnectionRequest = lookupResult?.exists && !lookupResult.error;

  async function onSubmit(values: InviteFormValues) {
    setIsSubmitting(true);
    try {
      if (isConnectionRequest) {
        // Send connection request to existing athlete
        const result = await sendConnectionRequest({
          email: values.email,
          message: values.message,
        });

        if (result.success) {
          toast.success(t("connectionRequestSent", { name: lookupResult?.displayName ?? values.email }));
          reset();
          setLookupResult(null);
          onOpenChange(false);
        } else {
          handleError(result.error);
        }
      } else {
        // Normal invite flow
        const result = await inviteAthlete({
          email: values.email,
          message: values.message,
        });

        if (result.success) {
          toast.success(t("inviteSent"));
          reset();
          setLookupResult(null);
          onOpenChange(false);
        } else {
          handleError(result.error);
        }
      }
    } catch {
      toast.error(t("errorGeneric"));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleError(errorKey?: string) {
    const errorMessages: Record<string, string> = {
      SELF_INVITE: t("errorSelfInvite"),
      ALREADY_CONNECTED: t("errorAlreadyConnected"),
      ALREADY_PENDING: t("errorAlreadyPending"),
      INVALID_INPUT: t("errorInvalidInput"),
      RATE_LIMITED: t("errorInviteRateLimited"),
      EMAIL_DOMAIN_INVALID: tCommon("emailNoMxRecord"),
      IS_TRAINER: t("errorIsTrainer"),
      ALREADY_HAS_OTHER_TRAINER: t("errorAlreadyHasOtherTrainer"),
      ACCOUNT_NOT_FOUND: t("errorGeneric"),
    };
    toast.error(errorMessages[errorKey ?? ""] ?? t("errorGeneric"));
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      reset();
      setLookupResult(null);
      setIsLookingUp(false);
    }
    onOpenChange(nextOpen);
  }

  // Determine if submit should be blocked due to a lookup error
  const hasLookupError = lookupResult?.error != null;

  return (
    <Modal
      open={open}
      onOpenChange={handleClose}
      size="md"
      title={t("inviteTitle")}
      description={isConnectionRequest ? t("connectionRequestDescription") : t("inviteDescription")}
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
            disabled={hasLookupError || isLookingUp}
          >
            {isConnectionRequest ? t("sendConnectionRequest") : t("sendInvite")}
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
          <div className="relative">
            <Input
              id="invite-email"
              type="email"
              placeholder={t("inviteEmailPlaceholder")}
              {...register("email")}
              aria-invalid={!!errors.email}
            />
            {isLookingUp && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
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
          {!errors.email && emailValidation.isValidating && !isLookingUp && (
            <p className="text-body-sm text-muted-foreground">
              {tCommon("emailValidating")}
            </p>
          )}
        </div>

        {/* Account lookup result: Profile preview */}
        {isConnectionRequest && lookupResult && (
          <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                {lookupResult.avatarInitials || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-body font-medium text-foreground">
                <UserCheck className="h-4 w-4 text-primary shrink-0" />
                {lookupResult.displayName}
              </p>
              <p className="text-body-sm text-muted-foreground">
                {t("connectionRequestHint")}
              </p>
            </div>
          </div>
        )}

        {/* Lookup error messages */}
        {lookupResult?.error === "IS_TRAINER" && (
          <p className="text-body-sm text-error" role="alert">
            {t("errorIsTrainer")}
          </p>
        )}
        {lookupResult?.error === "ALREADY_CONNECTED" && (
          <p className="text-body-sm text-error" role="alert">
            {t("errorAlreadyConnected")}
          </p>
        )}
        {lookupResult?.error === "ALREADY_PENDING" && (
          <p className="text-body-sm text-error" role="alert">
            {t("errorAlreadyPending")}
          </p>
        )}
        {lookupResult?.error === "ALREADY_HAS_OTHER_TRAINER" && (
          <p className="text-body-sm text-error" role="alert">
            {t("errorAlreadyHasOtherTrainer")}
          </p>
        )}
        {lookupResult?.error === "SELF_INVITE" && (
          <p className="text-body-sm text-error" role="alert">
            {t("errorSelfInvite")}
          </p>
        )}

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
