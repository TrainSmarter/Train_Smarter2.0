"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("localeSwitcher");

  function switchLocale(newLocale: "de" | "en") {
    if (newLocale === locale) return;

    // Check if the current pathname is a known route in the routing config.
    // usePathname() from next-intl returns the internal (non-localized) path,
    // so we can safely pass it to router.replace for all defined routes.
    const knownPaths = Object.keys(routing.pathnames ?? {});
    const isKnownPath = knownPaths.some((p) => {
      // Exact match for static routes, prefix match for dynamic routes
      if (p === pathname) return true;
      // Handle dynamic segments like /feedback/[athleteId]
      const pattern = p.replace(/\[[\w]+\]/g, "[^/]+");
      return new RegExp(`^${pattern}$`).test(pathname);
    });

    if (isKnownPath) {
      // Safe to use typed router — pathname is in the routing config
      router.replace(pathname as "/", { locale: newLocale });
    } else {
      // Fallback: navigate via window.location for unknown paths
      const currentPath = window.location.pathname;
      // Replace the locale segment: /de/some-path → /en/some-path
      const newPath = currentPath.replace(
        new RegExp(`^/(${routing.locales.join("|")})`),
        `/${newLocale}`
      );
      window.location.href = newPath;
    }
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
