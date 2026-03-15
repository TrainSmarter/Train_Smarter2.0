"use client";

import { useTranslations } from "next-intl";
import { LayoutGrid, Table2, Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OrganisationViewMode } from "@/lib/teams/types";

interface ViewSwitcherProps {
  value: OrganisationViewMode;
  onChange: (mode: OrganisationViewMode) => void;
}

const views: { mode: OrganisationViewMode; icon: typeof LayoutGrid; labelKey: string }[] = [
  { mode: "grid", icon: LayoutGrid, labelKey: "viewGrid" },
  { mode: "table", icon: Table2, labelKey: "viewTable" },
  { mode: "kanban", icon: Columns3, labelKey: "viewKanban" },
];

export function ViewSwitcher({ value, onChange }: ViewSwitcherProps) {
  const t = useTranslations("teams");

  return (
    <div
      className="inline-flex items-center rounded-md border bg-muted p-0.5"
      role="radiogroup"
      aria-label={t("viewGrid")}
    >
      {views.map(({ mode, icon: Icon, labelKey }) => (
        <Button
          key={mode}
          variant="ghost"
          size="sm"
          role="radio"
          aria-checked={value === mode}
          aria-label={t(labelKey)}
          className={cn(
            "h-8 gap-1.5 px-2.5 text-xs font-medium transition-colors",
            value === mode
              ? "bg-background text-foreground shadow-sm hover:bg-background"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => onChange(mode)}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t(labelKey)}</span>
        </Button>
      ))}
    </div>
  );
}
