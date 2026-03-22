"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface FilterChip {
  id: string;
  label: string;
  onRemove: () => void;
}

interface ExerciseFilterChipsProps {
  chips: FilterChip[];
  onClearAll: () => void;
}

export function ExerciseFilterChips({
  chips,
  onClearAll,
}: ExerciseFilterChipsProps) {
  const t = useTranslations("exercises");

  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Badge
          key={chip.id}
          variant="secondary"
          size="sm"
          className="flex items-center gap-1 pr-1"
        >
          {chip.label}
          <button
            type="button"
            onClick={chip.onRemove}
            className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
            aria-label={t("removeFilter", { label: chip.label })}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="text-muted-foreground hover:text-foreground text-xs h-7"
      >
        {t("clearAllFilters")}
      </Button>
    </div>
  );
}
