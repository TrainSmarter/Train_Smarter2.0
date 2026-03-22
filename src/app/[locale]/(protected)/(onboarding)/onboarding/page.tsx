"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { Loader2 } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WizardProgressBar } from "@/components/wizard-progress-bar";
import type { RoleValue } from "@/components/role-select-card";
import { OnboardingConsentStep } from "@/components/onboarding/OnboardingConsentStep";
import { OnboardingProfileStep } from "@/components/onboarding/OnboardingProfileStep";
import { OnboardingRoleStep } from "@/components/onboarding/OnboardingRoleStep";
import { logError } from "@/lib/logger";
import { createClient } from "@/lib/supabase/client";
import { profileSchema } from "@/lib/validations/auth";
import { uploadAvatar } from "@/hooks/use-avatar-upload";

const TOTAL_STEPS = 3;

export default function OnboardingPage() {
  const t = useTranslations("onboarding");
  const locale = useLocale();
  const router = useRouter();

  const [currentStep, setCurrentStep] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Step 1 state
  const [termsAccepted, setTermsAccepted] = React.useState(false);
  const [bodyDataConsent, setBodyDataConsent] = React.useState(false);
  const [nutritionConsent, setNutritionConsent] = React.useState(false);

  // Step 2 state
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [birthDate, setBirthDate] = React.useState("");
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);

  // Step 3 state
  const [selectedRole, setSelectedRole] = React.useState<RoleValue | null>(null);
  const [isInvitedAthlete, setIsInvitedAthlete] = React.useState(false);

  // Focus management — move focus to step heading on step change
  const stepHeadingRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!isLoading && stepHeadingRef.current) {
      stepHeadingRef.current.focus();
    }
  }, [currentStep, isLoading]);

  // Load user data and onboarding state
  React.useEffect(() => {
    async function loadUserData() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        // Pre-fill name from user_metadata (set during registration)
        if (user.user_metadata?.first_name) {
          setFirstName(user.user_metadata.first_name);
        }
        if (user.user_metadata?.last_name) {
          setLastName(user.user_metadata.last_name);
        }

        // Check if user is an invited athlete (via httpOnly cookie, read server-side)
        try {
          const tokenRes = await fetch("/api/auth/invite-token", { method: "POST" });
          const { token: inviteToken } = await tokenRes.json();
          if (inviteToken) {
            setIsInvitedAthlete(true);
            setSelectedRole("ATHLETE");
          }
        } catch {
          // No invite token — continue normally
        }

        // Try to load profile from DB for wizard resumption
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_step, first_name, last_name, birth_date, avatar_url")
          .eq("id", user.id)
          .single();

        if (profile) {
          if (profile.onboarding_step && profile.onboarding_step > 1) {
            setCurrentStep(profile.onboarding_step);
          }
          if (profile.first_name) setFirstName(profile.first_name);
          if (profile.last_name) setLastName(profile.last_name);
          if (profile.birth_date) setBirthDate(profile.birth_date);
          if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
        }
      } catch {
        // Profile table might not exist yet, continue with defaults
      } finally {
        setIsLoading(false);
      }
    }

    loadUserData();
  }, [router]);

  const wizardSteps = [
    { label: t("step1.title") },
    { label: t("step2.title") },
    { label: t("step3.title") },
  ];

  function getInitials(): string {
    const a = firstName?.charAt(0) ?? "";
    const b = lastName?.charAt(0) ?? "";
    return `${a}${b}`.toUpperCase() || "?";
  }

  async function handleNext() {
    setError(null);
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      if (currentStep === 1) {
        if (!termsAccepted) {
          setError(t("step1.requiredConsent"));
          setIsSubmitting(false);
          return;
        }

        // Save consents via server-side API (captures IP for Art. 7)
        try {
          await fetch("/api/gdpr/consents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              consents: [
                { consent_type: "terms_privacy", granted: true, policy_version: "v1.0" },
                { consent_type: "body_wellness_data", granted: bodyDataConsent, policy_version: "v1.0" },
                { consent_type: "nutrition_data", granted: nutritionConsent, policy_version: "v1.0" },
              ],
            }),
          });

          // Update onboarding_step
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from("profiles")
              .update({ onboarding_step: 2 })
              .eq("id", user.id);
          }
        } catch {
          // Continue even if DB write fails
        }

        setCurrentStep(2);
      } else if (currentStep === 2) {
        // Validate name fields with Zod
        const profileResult = profileSchema.safeParse({
          firstName,
          lastName,
          birthDate: birthDate || undefined,
        });
        if (!profileResult.success) {
          setError(t("step2.invalidName"));
          setIsSubmitting(false);
          return;
        }

        // Age check: block minors under 16 (DSGVO Art. 8)
        if (birthDate) {
          const birth = new Date(birthDate);
          const today = new Date();
          let age = today.getFullYear() - birth.getFullYear();
          const monthDiff = today.getMonth() - birth.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
          }
          if (age < 16) {
            setError(t("step2.minorBlocked"));
            setIsSubmitting(false);
            return;
          }
        }

        // Save profile data
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Upload avatar if selected (uses extracted hook with magic-byte validation)
            if (avatarFile) {
              setIsUploadingAvatar(true);
              const { path, error: uploadErr } = await uploadAvatar(user.id, avatarFile);
              if (uploadErr === "INVALID_TYPE") {
                setError(t("step2.avatarInvalidType"));
                setIsSubmitting(false);
                setIsUploadingAvatar(false);
                return;
              }
              if (path) {
                setAvatarUrl(path);
              }
              setIsUploadingAvatar(false);
            }

            await supabase
              .from("profiles")
              .update({
                first_name: firstName,
                last_name: lastName,
                birth_date: birthDate || null,
                onboarding_step: 3,
              })
              .eq("id", user.id);

            // Also update user_metadata for display
            await supabase.auth.updateUser({
              data: {
                first_name: firstName,
                last_name: lastName,
              },
            });
          }
        } catch {
          // Continue even if DB write fails
        }

        setCurrentStep(3);
      } else if (currentStep === 3) {
        if (!selectedRole) {
          setError(t("step3.roleRequired"));
          setIsSubmitting(false);
          return;
        }

        // Call API to set role via Edge Function
        try {
          const response = await fetch("/api/auth/set-role", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: selectedRole }),
          });

          if (!response.ok) {
            setError(t("step3.roleSaveError"));
            setIsSubmitting(false);
            return;
          }
        } catch {
          setError(t("step3.roleSaveError"));
          setIsSubmitting(false);
          return;
        }

        // Finish onboarding — set onboarding_completed in app_metadata (server-only, not bypassable)
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from("profiles")
              .update({
                onboarding_completed: true,
                onboarding_step: 3,
              })
              .eq("id", user.id);
          }

          // Set app_metadata.onboarding_completed via service-role key
          const completeResponse = await fetch("/api/auth/complete-onboarding", {
            method: "POST",
          });

          if (!completeResponse.ok) {
            logError("complete-onboarding failed", await completeResponse.text());
          }

          // Refresh session so middleware reads updated JWT before redirect
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            logError("Session refresh failed", refreshError);
          }

          // Small delay to ensure cookie is written before navigation
          await new Promise((resolve) => setTimeout(resolve, 300));
        } catch {
          // Continue to dashboard even if DB write fails
        }

        // Use window.location for a full page reload to ensure middleware picks up new JWT
        window.location.href = `/${locale}/dashboard`;
        return;
      }
    } catch {
      setError(t("step3.roleSaveError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleBack() {
    if (currentStep > 1) {
      setError(null);
      setCurrentStep(currentStep - 1);
    }
  }

  async function handleSkip() {
    setError(null);
    if (currentStep === 2) {
      // Persist skip to DB for wizard resumption
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from("profiles")
            .update({ onboarding_step: 3 })
            .eq("id", user.id);
        }
      } catch {
        // Continue even if DB write fails
      }
      setCurrentStep(3);
    }
    // Step 1 and 3 are NOT skippable
  }

  const canSkip = currentStep === 2;
  const canGoBack = currentStep > 1;
  const isLastStep = currentStep === TOTAL_STEPS;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-16">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-body text-muted-foreground">{t("wizard.submitting")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <WizardProgressBar steps={wizardSteps} currentStep={currentStep} ariaLabel={t("wizard.progressLabel")} />

      {/* Step counter (mobile) */}
      <p className="text-center text-body-sm text-muted-foreground md:hidden">
        {t("wizard.step", { current: currentStep, total: TOTAL_STEPS })}
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-h2" ref={stepHeadingRef} tabIndex={-1}>
            {currentStep === 1 && t("step1.title")}
            {currentStep === 2 && t("step2.title")}
            {currentStep === 3 && t("step3.title")}
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && t("step1.subtitle")}
            {currentStep === 2 && t("step2.subtitle")}
            {currentStep === 3 && t("step3.subtitle")}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" role="alert" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step 1: Consents */}
          {currentStep === 1 && (
            <OnboardingConsentStep
              termsAccepted={termsAccepted}
              onTermsChange={setTermsAccepted}
              bodyDataConsent={bodyDataConsent}
              onBodyDataChange={setBodyDataConsent}
              nutritionConsent={nutritionConsent}
              onNutritionChange={setNutritionConsent}
            />
          )}

          {/* Step 2: Profile */}
          {currentStep === 2 && (
            <OnboardingProfileStep
              firstName={firstName}
              onFirstNameChange={setFirstName}
              lastName={lastName}
              onLastNameChange={setLastName}
              birthDate={birthDate}
              onBirthDateChange={setBirthDate}
              avatarUrl={avatarUrl}
              onFileSelect={(file) => setAvatarFile(file)}
              onAvatarRemove={() => {
                setAvatarFile(null);
                setAvatarUrl(null);
              }}
              isUploadingAvatar={isUploadingAvatar}
              initials={getInitials()}
            />
          )}

          {/* Step 3: Role Selection */}
          {currentStep === 3 && (
            <OnboardingRoleStep
              selectedRole={selectedRole}
              onSelect={setSelectedRole}
              isInvitedAthlete={isInvitedAthlete}
            />
          )}

          {/* Navigation buttons */}
          <div className="mt-8 flex items-center justify-between">
            <div>
              {canGoBack && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBack}
                  disabled={isSubmitting}
                >
                  {t("wizard.back")}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {canSkip && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSkip}
                  disabled={isSubmitting}
                >
                  {t("wizard.skip")}
                </Button>
              )}
              <Button
                type="button"
                onClick={handleNext}
                disabled={
                  isSubmitting || (currentStep === 1 && !termsAccepted)
                }
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isSubmitting
                  ? t("wizard.submitting")
                  : isLastStep
                    ? t("wizard.finish")
                    : t("wizard.next")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
