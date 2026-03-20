"use client";

import { useTranslations } from "next-intl";
import { usePathname, Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const TRAINING_TABS = [
  { href: "/training" as const, labelKey: "tabWorkspace" as const, disabled: true },
  { href: "/training" as const, labelKey: "tabCalendar" as const, disabled: true },
  { href: "/training/exercises" as const, labelKey: "tabExercises" as const, disabled: false },
] as const;

export function TrainingTabs() {
  const t = useTranslations("training");
  const pathname = usePathname();

  return (
    <nav
      className="flex items-center gap-1 border-b"
      role="tablist"
      aria-label={t("tabWorkspace")}
    >
      {TRAINING_TABS.map((tab) => {
        const isActive = !tab.disabled && pathname === tab.href;

        if (tab.disabled) {
          return (
            <span
              key={tab.labelKey}
              role="tab"
              aria-selected={false}
              aria-disabled={true}
              className={cn(
                "inline-flex items-center gap-1.5 border-b-2 border-transparent px-4 py-2.5",
                "text-sm font-medium text-muted-foreground/50 cursor-not-allowed"
              )}
            >
              {t(tab.labelKey)}
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {t("comingSoon")}
              </span>
            </span>
          );
        }

        return (
          <Link
            key={tab.labelKey}
            href={tab.href}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "inline-flex items-center border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
            )}
          >
            {t(tab.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
