"use client";

import { useTranslations } from "next-intl";
import { Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StreakBadgeProps {
  /** Number of consecutive days */
  streak: number;
  /** Additional classes */
  className?: string;
}

export function StreakBadge({ streak, className }: StreakBadgeProps) {
  const t = useTranslations("feedback");

  if (streak <= 0) return null;

  return (
    <Badge
      variant={streak >= 7 ? "success" : "primary"}
      className={cn("gap-1", className)}
    >
      <Flame className="h-3 w-3" />
      {t("streakDays", { count: streak })}
    </Badge>
  );
}
