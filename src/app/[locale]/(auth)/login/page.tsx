"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
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
import type { LoginFormData } from "@/lib/validations/auth";

export default function LoginPage() {
  const t = useTranslations("auth.login");
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
          router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
          return;
        }

        if (authError.message === "Invalid login credentials") {
          setError(t("invalidCredentials"));
        } else {
          setError(t("genericError"));
        }
        setIsSubmitting(false);
        return;
      }

      // Redirect to returnUrl or dashboard
      const destination = returnUrl && returnUrl.startsWith("/") && !returnUrl.includes("://")
        ? returnUrl
        : "/dashboard";
      router.push(destination);
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
            {...register("email", { required: true })}
          />

          <PasswordField
            label={t("password")}
            placeholder={t("passwordPlaceholder")}
            required
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password", { required: true })}
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
