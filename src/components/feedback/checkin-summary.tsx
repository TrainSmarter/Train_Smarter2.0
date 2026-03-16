"use client";

import { useTranslations, useLocale } from "next-intl";
import { Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ActiveCategory, CheckinEntry } from "@/lib/feedback/types";

interface CheckinSummaryProps {
  /** The check-in entry to display */
  checkin: CheckinEntry;
  /** Active categories for context (names, types, units) */
  categories: ActiveCategory[];
  /** Called when the user wants to edit */
  onEdit?: () => void;
  /** Additional classes */
  className?: string;
}

export function CheckinSummary({
  checkin,
  categories,
  onEdit,
  className,
}: CheckinSummaryProps) {
  const t = useTranslations("feedback");
  const locale = useLocale();

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  return (
    <div className={cn("rounded-lg border bg-card p-5 space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10">
            <Check className="h-4 w-4 text-success" />
          </div>
          <div>
            <p className="text-sm font-medium">{t("checkinComplete")}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(checkin.date).toLocaleDateString(
                locale === "en" ? "en-US" : "de-AT",
                { weekday: "long", day: "numeric", month: "long" }
              )}
            </p>
          </div>
        </div>
        {onEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            iconLeft={<Pencil className="h-3.5 w-3.5" />}
          >
            {t("edit")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Object.entries(checkin.values).map(([categoryId, val]) => {
          const cat = categoryMap.get(categoryId);
          if (!cat) return null;
          const name = locale === "en" ? cat.name.en : cat.name.de;

          return (
            <div key={categoryId} className="space-y-0.5">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {name}
              </p>
              {cat.type === "number" && val.numericValue != null && (
                <p className="text-sm font-semibold">
                  {val.numericValue}
                  {cat.unit && (
                    <span className="ml-1 text-muted-foreground font-normal text-xs">
                      {cat.unit}
                    </span>
                  )}
                </p>
              )}
              {cat.type === "scale" && val.numericValue != null && (
                <Badge variant="outline" size="sm">
                  {val.numericValue}/{cat.maxValue ?? 5}
                </Badge>
              )}
              {cat.type === "text" && val.textValue && (
                <p className="text-sm text-foreground line-clamp-2">
                  {val.textValue}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
