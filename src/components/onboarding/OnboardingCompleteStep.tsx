"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";

/**
 * Final onboarding step shown briefly before redirect to dashboard.
 * Can be used as a visual confirmation if the redirect is delayed.
 */
export function OnboardingCompleteStep() {
  const t = useTranslations("onboarding");

  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <CheckCircle2 className="h-12 w-12 text-success" />
      <h3 className="text-h3 text-foreground">{t("complete.title")}</h3>
      <p className="text-body text-muted-foreground max-w-sm">
        {t("complete.description")}
      </p>
    </div>
  );
}
