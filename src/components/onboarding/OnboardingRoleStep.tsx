"use client";

import { useTranslations } from "next-intl";
import { RoleSelectCard, type RoleValue } from "@/components/role-select-card";

interface OnboardingRoleStepProps {
  selectedRole: RoleValue | null;
  onSelect: (role: RoleValue) => void;
  isInvitedAthlete: boolean;
}

export function OnboardingRoleStep({
  selectedRole,
  onSelect,
  isInvitedAthlete,
}: OnboardingRoleStepProps) {
  const t = useTranslations("onboarding");

  return (
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
        onSelect={onSelect}
      />
      <RoleSelectCard
        role="ATHLETE"
        title={t("step3.athlete")}
        description={t("step3.athleteDesc")}
        selected={selectedRole === "ATHLETE"}
        onSelect={onSelect}
      />
    </div>
  );
}
