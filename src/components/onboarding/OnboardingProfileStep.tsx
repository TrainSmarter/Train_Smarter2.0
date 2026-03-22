"use client";

import { useTranslations } from "next-intl";
import { AvatarUpload } from "@/components/avatar-upload";
import { FormField } from "@/components/form-field";

interface OnboardingProfileStepProps {
  firstName: string;
  onFirstNameChange: (value: string) => void;
  lastName: string;
  onLastNameChange: (value: string) => void;
  birthDate: string;
  onBirthDateChange: (value: string) => void;
  avatarUrl: string | null;
  onFileSelect: (file: File) => void;
  onAvatarRemove: () => void;
  isUploadingAvatar: boolean;
  initials: string;
}

export function OnboardingProfileStep({
  firstName,
  onFirstNameChange,
  lastName,
  onLastNameChange,
  birthDate,
  onBirthDateChange,
  avatarUrl,
  onFileSelect,
  onAvatarRemove,
  isUploadingAvatar,
  initials,
}: OnboardingProfileStepProps) {
  const t = useTranslations("onboarding");

  return (
    <div className="space-y-6">
      <AvatarUpload
        currentUrl={avatarUrl}
        initials={initials}
        onFileSelect={onFileSelect}
        onRemove={onAvatarRemove}
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
          onChange={(e) => onFirstNameChange((e.target as HTMLInputElement).value)}
          required
          autoComplete="given-name"
        />
        <FormField
          label={t("step2.lastName")}
          value={lastName}
          onChange={(e) => onLastNameChange((e.target as HTMLInputElement).value)}
          required
          autoComplete="family-name"
        />
      </div>

      <FormField
        label={t("step2.birthDate")}
        type="date"
        value={birthDate}
        onChange={(e) => onBirthDateChange((e.target as HTMLInputElement).value)}
        placeholder={t("step2.birthDatePlaceholder")}
      />
    </div>
  );
}
