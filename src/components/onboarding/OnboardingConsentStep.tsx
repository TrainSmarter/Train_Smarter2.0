"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ConsentCheckbox } from "@/components/consent-checkbox";

interface OnboardingConsentStepProps {
  termsAccepted: boolean;
  onTermsChange: (checked: boolean) => void;
  bodyDataConsent: boolean;
  onBodyDataChange: (checked: boolean) => void;
  nutritionConsent: boolean;
  onNutritionChange: (checked: boolean) => void;
}

export function OnboardingConsentStep({
  termsAccepted,
  onTermsChange,
  bodyDataConsent,
  onBodyDataChange,
  nutritionConsent,
  onNutritionChange,
}: OnboardingConsentStepProps) {
  const t = useTranslations("onboarding");

  return (
    <div className="space-y-4">
      <ConsentCheckbox
        id="terms"
        checked={termsAccepted}
        onCheckedChange={onTermsChange}
        required
      >
        {t.rich("step1.termsRequired", {
          terms: (chunks) => (
            <Link
              href="/agb"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
              aria-label={`${chunks} ${t("step1.opensInNewTab")}`}
            >
              {chunks}
            </Link>
          ),
          privacy: (chunks) => (
            <Link
              href="/datenschutz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
              aria-label={`${chunks} ${t("step1.opensInNewTab")}`}
            >
              {chunks}
            </Link>
          ),
        })}
      </ConsentCheckbox>

      <ConsentCheckbox
        id="bodyData"
        checked={bodyDataConsent}
        onCheckedChange={onBodyDataChange}
      >
        {t("step1.bodyDataOptional")}
      </ConsentCheckbox>

      <ConsentCheckbox
        id="nutrition"
        checked={nutritionConsent}
        onCheckedChange={onNutritionChange}
      >
        {t("step1.nutritionOptional")}
      </ConsentCheckbox>
    </div>
  );
}
