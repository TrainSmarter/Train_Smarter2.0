"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("auth.login");
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl");

  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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

        if (authError.message === "Invalid login credentials") {
          setError(t("invalidCredentials"));
        } else if (authError.code === "over_request_rate_limit" || authError.message?.includes("rate")) {
          setError(t("rateLimited"));
        } else {
          setError(t("genericError"));
        }
        setIsSubmitting(false);
        return;
      }

      // Store remember-me preference for session management
      if (!data.rememberMe) {
        sessionStorage.setItem("ts_session_only", "true");
      } else {
        sessionStorage.removeItem("ts_session_only");
      }

      // Redirect to returnUrl or dashboard
      const destination = returnUrl && returnUrl.startsWith("/") && !returnUrl.startsWith("//") && !returnUrl.includes("://")
        ? returnUrl
        : "/dashboard";
      router.push(destination as "/dashboard");
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
