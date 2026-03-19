"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Loader2, Mail } from "lucide-react";

import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField } from "@/components/form-field";
import { PasswordField } from "@/components/password-field";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/client";
import { loginSchema, type LoginFormData } from "@/lib/validations/auth";

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginPageInner />
    </React.Suspense>
  );
}

function LoginPageInner() {
  const t = useTranslations("auth.login");
  const tAuth = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl");

  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const isConfirmed = searchParams.get("confirmed") === "true";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const rememberMe = watch("rememberMe");

  async function onSubmit(data: LoginFormData) {
    setError(null);
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        if (authError.message === "Email not confirmed" || authError.code === "email_not_confirmed") {
          const verifyUrl = `/verify-email?email=${encodeURIComponent(data.email)}${returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : ""}` as "/verify-email";
          router.push(verifyUrl);
          return;
        }

        if (authError.code === "user_banned") {
          setError(t("userBanned"));
        } else if (authError.message === "Invalid login credentials") {
          setError(t("invalidCredentials"));
        } else if (authError.code === "over_request_rate_limit" || authError.code === "too_many_requests" || authError.message?.includes("rate")) {
          setError(t("rateLimited"));
        } else {
          setError(t("genericError"));
        }
        setIsSubmitting(false);
        return;
      }

      // Set marker cookies for middleware session-only detection.
      // ts_remember is persistent (30 days); ts_session has no Max-Age
      // so it dies when the browser closes.
      if (data.rememberMe) {
        document.cookie = "ts_remember=1; path=/; SameSite=Lax; Max-Age=2592000";
        document.cookie = "ts_session=; path=/; SameSite=Lax; Max-Age=0";
      } else {
        document.cookie = "ts_session=1; path=/; SameSite=Lax";
        document.cookie = "ts_remember=; path=/; SameSite=Lax; Max-Age=0";
      }

      // Full page reload to ensure middleware picks up fresh session cookie
      // router.push() uses client-side navigation which may read stale cookies
      const destination = returnUrl && returnUrl.startsWith("/") && !returnUrl.startsWith("//") && !returnUrl.includes("://")
        ? `/${locale}${returnUrl}`
        : `/${locale}/dashboard`;
      window.location.href = destination;
    } catch {
      setError(t("networkError"));
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-h2">{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Email confirmed success message */}
          {isConfirmed && !error && (
            <Alert role="status" className="border-success/50 bg-success/10">
              <AlertDescription className="text-success-foreground">
                {t("emailConfirmed")}
              </AlertDescription>
            </Alert>
          )}

          {/* Form-level error alert */}
          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <FormField
            label={t("email")}
            type="email"
            placeholder={t("emailPlaceholder")}
            iconLeft={<Mail className="h-4 w-4" />}
            required
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />

          <PasswordField
            label={t("password")}
            placeholder={t("passwordPlaceholder")}
            required
            autoComplete="current-password"
            error={errors.password?.message}
            toggleAriaLabel={tAuth("togglePassword")}
            {...register("password")}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                id="rememberMe"
                checked={rememberMe}
                onCheckedChange={(checked) =>
                  setValue("rememberMe", checked === true)
                }
              />
              <label
                htmlFor="rememberMe"
                className="text-body-sm text-foreground cursor-pointer select-none"
              >
                {t("rememberMe")}
              </label>
            </div>
            <Link
              href="/forgot-password"
              className="text-body-sm text-primary hover:underline"
            >
              {t("forgotPassword")}
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? t("submitting") : t("submit")}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-body-sm text-muted-foreground">
          {t("noAccount")}{" "}
          <Link href="/register" className="text-primary hover:underline font-medium">
            {t("register")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
