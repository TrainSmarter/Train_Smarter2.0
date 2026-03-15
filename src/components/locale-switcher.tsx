"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("localeSwitcher");

  function switchLocale(newLocale: "de" | "en") {
    if (newLocale === locale) return;
    router.replace(pathname as "/", { locale: newLocale });
  }

  return (
    <div
      className="flex items-center rounded-lg border border-border bg-background p-0.5"
      role="group"
      aria-label={t("switchLanguage")}
    >
      <button
        type="button"
        onClick={() => switchLocale("de")}
        className={cn(
          "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
          locale === "de"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-pressed={locale === "de"}
      >
        {t("de")}
      </button>
      <button
        type="button"
        onClick={() => switchLocale("en")}
        className={cn(
          "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
          locale === "en"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-pressed={locale === "en"}
      >
        {t("en")}
      </button>
    </div>
  );
}
