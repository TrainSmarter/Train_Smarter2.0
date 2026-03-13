"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Loader2, Mail, User } from "lucide-react";

import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { FormField } from "@/components/form-field";
import { PasswordField } from "@/components/password-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/client";
import type { RegisterFormData } from "@/lib/validations/auth";

export default function RegisterPage() {
  const t = useTranslations("auth.register");
  const router = useRouter();

  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const password = watch("password");

  function getPasswordError(fieldError: { message?: string } | undefined): string | undefined {
    if (!fieldError?.message) return undefined;
    const msg = fieldError.message;
    if (msg === "passwordUppercase") return t("passwordUppercase");
    if (msg === "passwordNumber") return t("passwordNumber");
    if (msg === "passwordsMustMatch") return t("passwordsMustMatch");
    return msg;
  }

  async function onSubmit(data: RegisterFormData) {
    // Client-side validation
    if (data.password.length < 8) return;
    if (!/[A-Z]/.test(data.password)) return;
    if (!/[0-9]/.test(data.password)) return;
    if (data.password !== data.confirmPassword) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

      const { error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback`,
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
          },
        },
      });

      if (authError) {
        setError(t("genericError"));
        setIsSubmitting(false);
        return;
      }

      // Success: Redirect to verify email page
      // Note: Supabase signUp returns identical response for both new and
      // existing accounts to prevent account enumeration
      router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
    } catch {
      setError(t("genericError"));
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
          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label={t("firstName")}
              placeholder={t("firstNamePlaceholder")}
              iconLeft={<User className="h-4 w-4" />}
              required
              autoComplete="given-name"
              error={errors.firstName ? t("invalidName") : undefined}
              {...register("firstName", {
                required: true,
                pattern: /^[\p{L}\s\-']{1,100}$/u,
              })}
            />
            <FormField
              label={t("lastName")}
              placeholder={t("lastNamePlaceholder")}
              required
              autoComplete="family-name"
              error={errors.lastName ? t("invalidName") : undefined}
              {...register("lastName", {
                required: true,
                pattern: /^[\p{L}\s\-']{1,100}$/u,
              })}
            />
          </div>

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
            helperText={t("passwordRequirements")}
            required
            autoComplete="new-password"
            error={getPasswordError(errors.password)}
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
              errors.confirmPassword
                ? t("passwordsMustMatch")
                : undefined
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
      <CardFooter className="justify-center">
        <p className="text-body-sm text-muted-foreground">
          {t("hasAccount")}{" "}
          <Link
            href="/login"
            className="text-primary hover:underline font-medium"
          >
            {t("login")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
