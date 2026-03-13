"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { PasswordField } from "@/components/password-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/client";
import type { ResetPasswordFormData } from "@/lib/validations/auth";

type PageState = "loading" | "form" | "success" | "expired" | "error";

export default function ResetPasswordPage() {
  const t = useTranslations("auth.resetPassword");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [pageState, setPageState] = React.useState<PageState>("loading");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    defaultValues: { password: "", confirmPassword: "" },
  });

  const password = watch("password");

  // Exchange PKCE code for session on mount
  React.useEffect(() => {
    async function exchangeCode() {
      const code = searchParams.get("code");
      const errorParam = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (errorParam) {
        if (errorParam === "otp_expired" || errorDescription?.includes("expired")) {
          setPageState("expired");
        } else {
          setPageState("error");
        }
        return;
      }

      if (!code) {
        // No code, try if already authenticated (came from auth/callback redirect)
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setPageState("form");
        } else {
          setPageState("error");
        }
        return;
      }

      try {
        const supabase = createClient();
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          if (exchangeError.message?.includes("expired") || exchangeError.code === "otp_expired") {
            setPageState("expired");
          } else {
            setPageState("error");
          }
          return;
        }

        setPageState("form");
      } catch {
        setPageState("error");
      }
    }

    exchangeCode();
  }, [searchParams]);

  async function onSubmit(data: ResetPasswordFormData) {
    if (data.password !== data.confirmPassword) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (updateError) {
        setError(t("genericError"));
        setIsSubmitting(false);
        return;
      }

      // Invalidate other sessions
      await supabase.auth.signOut({ scope: "others" });

      setPageState("success");

      // Redirect to login after a short delay
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch {
      setError(t("genericError"));
      setIsSubmitting(false);
    }
  }

  // Loading state
  if (pageState === "loading") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="space-y-1">
              <h2 className="text-h3 text-foreground">{t("processing")}</h2>
              <p className="text-body-sm text-muted-foreground">
                {t("processingSubtitle")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Link expired state
  if (pageState === "expired") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-1">
              <h2 className="text-h3 text-foreground">{t("linkExpired")}</h2>
            </div>
            <Link href="/forgot-password">
              <Button>{t("linkExpiredAction")}</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Generic error state
  if (pageState === "error") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-1">
              <p className="text-body text-muted-foreground">
                {t("genericError")}
              </p>
            </div>
            <Link href="/forgot-password">
              <Button variant="outline">{t("linkExpiredAction")}</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Success state
  if (pageState === "success") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <p className="text-body text-muted-foreground">{t("success")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Form state
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-h2">{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <PasswordField
            label={t("password")}
            placeholder={t("passwordPlaceholder")}
            helperText={t("passwordRequirements")}
            required
            autoComplete="new-password"
            error={errors.password?.message}
            {...register("password", {
              required: true,
              minLength: 8,
              validate: {
                uppercase: (v) => /[A-Z]/.test(v) || "passwordUppercase",
                number: (v) => /[0-9]/.test(v) || "passwordNumber",
              },
            })}
          />

          <PasswordField
            label={t("confirmPassword")}
            placeholder={t("confirmPasswordPlaceholder")}
            required
            autoComplete="new-password"
            error={
              errors.confirmPassword ? t("passwordsMustMatch") : undefined
            }
            {...register("confirmPassword", {
              required: true,
              validate: (v) => v === password || "passwordsMustMatch",
            })}
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isSubmitting ? t("submitting") : t("submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
