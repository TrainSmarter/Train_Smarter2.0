"use client";

import { useTranslations } from "next-intl";
import { List, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────

export type TaxonomyViewMode = "list" | "graph";

interface TaxonomyViewSwitcherProps {
  value: TaxonomyViewMode;
  onChange: (mode: TaxonomyViewMode) => void;
}

const views: {
  mode: TaxonomyViewMode;
  icon: typeof List;
  labelKey: string;
}[] = [
  { mode: "list", icon: List, labelKey: "viewList" },
  { mode: "graph", icon: Network, labelKey: "viewGraph" },
];

// ── Component ─────────────────────────────────────────────────────

export function TaxonomyViewSwitcher({
  value,
  onChange,
}: TaxonomyViewSwitcherProps) {
  const t = useTranslations("taxonomy");

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="inline-flex items-center rounded-md border bg-muted p-0.5"
        role="radiogroup"
        aria-label={t("viewSwitcherLabel")}
      >
        {views.map(({ mode, icon: Icon, labelKey }) => {
          const isActive = value === mode;
          const label = t(labelKey);

          return (
            <Tooltip key={mode}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  role="radio"
                  aria-checked={isActive}
                  aria-label={label}
                  className={cn(
                    "h-8 w-8 p-0 transition-colors",
                    isActive
                      ? "bg-background text-foreground shadow-sm hover:bg-background"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => onChange(mode)}
                >
                  <Icon className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{label}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
