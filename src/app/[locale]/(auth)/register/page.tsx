"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Mail, User } from "lucide-react";

import { Link } from "@/i18n/navigation";
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
import { registerSchema, type RegisterFormData } from "@/lib/validations/auth";
import { useEmailValidation } from "@/hooks/use-email-validation";

export default function RegisterPage() {
  const t = useTranslations("auth.register");
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");
  const currentLocale = useLocale();

  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const emailValue = watch("email");
  const { isValidating: isEmailValidating, isValid: isEmailValid, error: emailValidationError } =
    useEmailValidation(emailValue);

  function getPasswordError(fieldError: { message?: string } | undefined): string | undefined {
    if (!fieldError?.message) return undefined;
    const msg = fieldError.message;
    if (msg === "passwordUppercase") return t("passwordUppercase");
    if (msg === "passwordNumber") return t("passwordNumber");
    if (msg === "passwordsMustMatch") return t("passwordsMustMatch");
    return msg;
  }

  async function onSubmit(data: RegisterFormData) {
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
            locale: currentLocale,
          },
        },
      });

      if (authError) {
        if (authError.code === "over_email_send_rate_limit" || authError.code === "too_many_requests" || authError.message?.includes("rate")) {
          // The confirmation email was already sent — redirect to verify-email
          // so the user can check their inbox or resend from there
          window.location.href = `/${currentLocale}/verify-email?email=${encodeURIComponent(data.email)}`;
          return;
        } else if (authError.code === "weak_password" || authError.message?.includes("weak")) {
          setError(t("weakPassword"));
        } else {
          setError(t("genericError"));
        }
        return;
      }

      // Success: Redirect to verify email page using full page navigation
      // Note: Supabase signUp returns identical response for both new and
      // existing accounts to prevent account enumeration
      window.location.href = `/${currentLocale}/verify-email?email=${encodeURIComponent(data.email)}`;
    } catch {
      setError(t("genericError"));
    } finally {
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
              {...register("firstName")}
            />
            <FormField
              label={t("lastName")}
              placeholder={t("lastNamePlaceholder")}
              required
              autoComplete="family-name"
              error={errors.lastName ? t("invalidName") : undefined}
              {...register("lastName")}
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
            helperText={isEmailValidating ? tCommon("emailValidating") : undefined}
            {...register("email")}
          />
          {!errors.email && emailValidationError && (
            <p className="text-body-sm text-warning" role="status">
              {tCommon(emailValidationError as "emailNoMxRecord" | "emailInvalidDomain")}
            </p>
          )}

          <PasswordField
            label={t("password")}
            placeholder={t("passwordPlaceholder")}
            helperText={t("passwordRequirements")}
            required
            autoComplete="new-password"
            error={getPasswordError(errors.password)}
            toggleAriaLabel={tAuth("togglePassword")}
            {...register("password")}
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
            toggleAriaLabel={tAuth("togglePassword")}
            {...register("confirmPassword")}
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
