"use client";

import { useTranslations } from "next-intl";
import { useTypedLocale } from "@/hooks/use-typed-locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ExerciseWithTaxonomy } from "@/lib/exercises/types";
import { CATEGORY_LABELS } from "@/lib/exercises/constants";

interface ExerciseCompactCardProps {
  exercise: ExerciseWithTaxonomy;
  onClick: () => void;
}

export function ExerciseCompactCard({
  exercise,
  onClick,
}: ExerciseCompactCardProps) {
  const t = useTranslations("exercises");
  const locale = useTypedLocale();

  const name = exercise.name[locale] || exercise.name.de;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  }

  return (
    <Card
      className="cursor-pointer hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      tabIndex={0}
      role="button"
      aria-label={name}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <CardContent className="p-3">
        <p className="truncate text-sm font-medium text-foreground">{name}</p>

        <div className="mt-2 flex items-center gap-1.5">
          <Badge variant="gray" size="sm">
            {t(CATEGORY_LABELS[exercise.exerciseType])}
          </Badge>

          <Badge
            variant={exercise.scope === "global" ? "primary" : "secondary"}
            size="sm"
          >
            {exercise.scope === "global" ? t("platform") : t("own")}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
