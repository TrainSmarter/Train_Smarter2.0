"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Mail, AlertTriangle } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ResendEmailButton } from "@/components/resend-email-button";
import { createClient } from "@/lib/supabase/client";

export default function VerifyEmailPage() {
  const t = useTranslations("auth.verifyEmail");
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  async function handleResend() {
    if (!email) return;

    setFeedback(null);
    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback`,
      },
    });

    if (error) {
      if (error.message?.includes("rate") || error.code === "over_email_send_rate_limit" || error.code === "too_many_requests") {
        setFeedback({ type: "error", message: t("rateLimitedCheckSpam") });
      } else {
        setFeedback({ type: "error", message: t("resendError") });
      }
      return;
    }

    setFeedback({ type: "success", message: t("resendSuccess") });
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center gap-6 text-center">
          {/* Mail icon */}
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>

          {/* Title and subtitle */}
          <div className="space-y-2">
            <h1 className="text-h2 text-foreground">{t("title")}</h1>
            <p className="text-body text-muted-foreground">
              {email
                ? t("subtitle", { email })
                : t("subtitleNoEmail")}
            </p>
          </div>

          {/* Instructions */}
          <div className="space-y-1">
            <p className="text-body-sm text-muted-foreground">
              {t("instruction")}
            </p>
            <p className="text-body-sm text-muted-foreground">
              {t("checkSpam")}
            </p>
          </div>

          {/* Feedback */}
          {feedback && (
            <Alert
              variant={feedback.type === "error" ? "destructive" : "default"}
              role="alert"
              className="text-left"
            >
              {feedback.type === "error" && (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertDescription>{feedback.message}</AlertDescription>
            </Alert>
          )}

          {/* Resend button */}
          {email && (
            <ResendEmailButton
              onResend={handleResend}
              labels={{
                resend: t("resend"),
                resendCooldown: t.raw("resendCooldown"),
              }}
            />
          )}

          {/* Back to login */}
          <Link href="/login">
            <Button variant="ghost" size="sm">
              {t("backToLogin")}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
