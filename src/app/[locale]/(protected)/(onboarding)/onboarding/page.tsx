"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WizardProgressBar } from "@/components/wizard-progress-bar";
import { ConsentCheckbox } from "@/components/consent-checkbox";
import { FormField } from "@/components/form-field";
import { AvatarUpload } from "@/components/avatar-upload";
import { RoleSelectCard, type RoleValue } from "@/components/role-select-card";
import { createClient } from "@/lib/supabase/client";

const TOTAL_STEPS = 4;

export default function OnboardingPage() {
  const t = useTranslations("onboarding");
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

  // Step 4 state
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteCode, setInviteCode] = React.useState("");
  const [inviteFeedback, setInviteFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

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

        // Check if user is an invited athlete (via cookie)
        // This would be set by a route handler when processing invite links
        const inviteToken = document.cookie
          .split("; ")
          .find((row) => row.startsWith("inviteToken="))
          ?.split("=")[1];

        if (inviteToken) {
          setIsInvitedAthlete(true);
          setSelectedRole("ATHLETE");
          setInviteCode(inviteToken);
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
    { label: selectedRole === "TRAINER" ? t("step4.trainerTitle") : t("step4.athleteTitle") },
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

        // Save consents to DB (best effort — table may not exist yet)
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const consents = [
              {
                user_id: user.id,
                consent_type: "terms_privacy",
                granted: true,
                policy_version: "v1.0",
              },
              {
                user_id: user.id,
                consent_type: "body_wellness_data",
                granted: bodyDataConsent,
                policy_version: "v1.0",
              },
              {
                user_id: user.id,
                consent_type: "nutrition_data",
                granted: nutritionConsent,
                policy_version: "v1.0",
              },
            ];

            await supabase.from("user_consents").upsert(consents, {
              onConflict: "user_id,consent_type,policy_version",
            });

            // Update onboarding_step
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
        // Save profile data
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Upload avatar if selected
            if (avatarFile) {
              setIsUploadingAvatar(true);
              const ext = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";
              const filePath = `${user.id}/avatar.${ext}`;

              // Delete existing avatar files (different extensions)
              const { data: existingFiles } = await supabase.storage
                .from("avatars")
                .list(user.id);

              if (existingFiles?.length) {
                await supabase.storage
                  .from("avatars")
                  .remove(existingFiles.map((f) => `${user.id}/${f.name}`));
              }

              const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(filePath, avatarFile, {
                  cacheControl: "3600",
                  upsert: true,
                });

              if (!uploadError) {
                setAvatarUrl(filePath);
                await supabase
                  .from("profiles")
                  .update({ avatar_url: filePath })
                  .eq("id", user.id);
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

          // Update onboarding_step
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from("profiles")
              .update({ onboarding_step: 4 })
              .eq("id", user.id);
          }
        } catch {
          setError(t("step3.roleSaveError"));
          setIsSubmitting(false);
          return;
        }

        setCurrentStep(4);
      } else if (currentStep === 4) {
        // Finish onboarding
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from("profiles")
              .update({
                onboarding_completed: true,
                onboarding_step: 4,
              })
              .eq("id", user.id);

            // Set onboarding_completed in user_metadata for middleware
            await supabase.auth.updateUser({
              data: { onboarding_completed: true },
            });
          }
        } catch {
          // Continue to dashboard even if DB write fails
        }

        router.push("/dashboard");
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

  function handleSkip() {
    setError(null);
    if (currentStep === 2) {
      setCurrentStep(3);
    } else if (currentStep === 4) {
      // Finish onboarding when skipping step 4
      handleNext();
    }
    // Step 1 and 3 are NOT skippable
  }

  const canSkip = currentStep === 2 || currentStep === 4;
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
      <WizardProgressBar steps={wizardSteps} currentStep={currentStep} />

      {/* Step counter (mobile) */}
      <p className="text-center text-body-sm text-muted-foreground md:hidden">
        {t("wizard.step", { current: currentStep, total: TOTAL_STEPS })}
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-h2">
            {currentStep === 1 && t("step1.title")}
            {currentStep === 2 && t("step2.title")}
            {currentStep === 3 && t("step3.title")}
            {currentStep === 4 &&
              (selectedRole === "TRAINER"
                ? t("step4.trainerTitle")
                : t("step4.athleteTitle"))}
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && t("step1.subtitle")}
            {currentStep === 2 && t("step2.subtitle")}
            {currentStep === 3 && t("step3.subtitle")}
            {currentStep === 4 &&
              (selectedRole === "TRAINER"
                ? t("step4.trainerSubtitle")
                : t("step4.athleteSubtitle"))}
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
            <div className="space-y-4">
              <ConsentCheckbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={setTermsAccepted}
                required
              >
                {t.rich("step1.termsRequired", {
                  terms: (chunks) => (
                    <a
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium"
                      aria-label={`${t("step1.termsLink")} ${t("step1.opensInNewTab")}`}
                    >
                      {t("step1.termsLink")}
                    </a>
                  ),
                  privacy: (chunks) => (
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium"
                      aria-label={`${t("step1.privacyLink")} ${t("step1.opensInNewTab")}`}
                    >
                      {t("step1.privacyLink")}
                    </a>
                  ),
                })}
              </ConsentCheckbox>

              <ConsentCheckbox
                id="bodyData"
                checked={bodyDataConsent}
                onCheckedChange={setBodyDataConsent}
              >
                {t("step1.bodyDataOptional")}
              </ConsentCheckbox>

              <ConsentCheckbox
                id="nutrition"
                checked={nutritionConsent}
                onCheckedChange={setNutritionConsent}
              >
                {t("step1.nutritionOptional")}
              </ConsentCheckbox>
            </div>
          )}

          {/* Step 2: Profile */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <AvatarUpload
                currentUrl={avatarUrl}
                initials={getInitials()}
                onFileSelect={(file) => setAvatarFile(file)}
                onRemove={() => {
                  setAvatarFile(null);
                  setAvatarUrl(null);
                }}
                isUploading={isUploadingAvatar}
                labels={{
                  upload: t("step2.avatarUpload"),
                  remove: t("step2.avatarRemove"),
                  uploading: t("step2.avatarUploading"),
                  tooLarge: t("step2.avatarTooLarge"),
                  invalidType: t("step2.avatarInvalidType"),
                  hint: t("step2.avatarHint"),
                }}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label={t("step2.firstName")}
                  value={firstName}
                  onChange={(e) => setFirstName((e.target as HTMLInputElement).value)}
                  required
                  autoComplete="given-name"
                />
                <FormField
                  label={t("step2.lastName")}
                  value={lastName}
                  onChange={(e) => setLastName((e.target as HTMLInputElement).value)}
                  required
                  autoComplete="family-name"
                />
              </div>

              <FormField
                label={t("step2.birthDate")}
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate((e.target as HTMLInputElement).value)}
                placeholder={t("step2.birthDatePlaceholder")}
              />
            </div>
          )}

          {/* Step 3: Role Selection */}
          {currentStep === 3 && (
            <div
              className="grid gap-4 sm:grid-cols-2"
              role="radiogroup"
              aria-label={t("step3.title")}
            >
              <RoleSelectCard
                role="TRAINER"
                title={t("step3.trainer")}
                description={t("step3.trainerDesc")}
                selected={selectedRole === "TRAINER"}
                disabled={isInvitedAthlete}
                lockedMessage={
                  isInvitedAthlete ? t("step3.lockedByInvite") : undefined
                }
                onSelect={setSelectedRole}
              />
              <RoleSelectCard
                role="ATHLETE"
                title={t("step3.athlete")}
                description={t("step3.athleteDesc")}
                selected={selectedRole === "ATHLETE"}
                onSelect={setSelectedRole}
              />
            </div>
          )}

          {/* Step 4: Invite (Trainer) or Code (Athlete) */}
          {currentStep === 4 && (
            <div className="space-y-4">
              {selectedRole === "TRAINER" && (
                <>
                  <FormField
                    label={t("step4.inviteEmail")}
                    type="email"
                    value={inviteEmail}
                    onChange={(e) =>
                      setInviteEmail((e.target as HTMLInputElement).value)
                    }
                    placeholder={t("step4.inviteEmailPlaceholder")}
                    autoComplete="email"
                  />
                  {inviteFeedback && (
                    <Alert
                      variant={
                        inviteFeedback.type === "error"
                          ? "destructive"
                          : "default"
                      }
                      role="alert"
                    >
                      <AlertDescription>
                        {inviteFeedback.message}
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}

              {selectedRole === "ATHLETE" && (
                <>
                  <FormField
                    label={t("step4.inviteCode")}
                    value={inviteCode}
                    onChange={(e) =>
                      setInviteCode((e.target as HTMLInputElement).value)
                    }
                    placeholder={t("step4.inviteCodePlaceholder")}
                  />
                  {inviteFeedback && (
                    <Alert
                      variant={
                        inviteFeedback.type === "error"
                          ? "destructive"
                          : "default"
                      }
                      role="alert"
                    >
                      <AlertDescription>
                        {inviteFeedback.message}
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </div>
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
