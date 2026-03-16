"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckinForm } from "./checkin-form";
import { CheckinSummary } from "./checkin-summary";
import { TrendChart } from "./trend-chart";
import { StreakBadge } from "./streak-badge";
import { CategoryManager } from "./category-manager";
import type {
  ActiveCategory,
  CheckinEntry,
  AthleteTrendData,
} from "@/lib/feedback/types";

interface AthleteCheckinPageProps {
  /** Active categories for this athlete */
  categories: ActiveCategory[];
  /** Today's check-in if already filled */
  todayCheckin: CheckinEntry | null;
  /** Whether the athlete can see their analysis charts */
  canSeeAnalysis: boolean;
  /** Current streak */
  streak: number;
  /** Trend data for charts (only loaded if canSeeAnalysis) */
  trendData: AthleteTrendData[];
  /** Maximum backfill days */
  backfillDays: number;
  /** Whether athlete has body_wellness_data consent */
  hasBodyWellnessConsent: boolean;
}

export function AthleteCheckinPage({
  categories,
  todayCheckin,
  canSeeAnalysis,
  streak,
  trendData,
  backfillDays,
  hasBodyWellnessConsent,
}: AthleteCheckinPageProps) {
  const t = useTranslations("feedback");
  const [isEditing, setIsEditing] = React.useState(false);
  const [showCategoryManager, setShowCategoryManager] = React.useState(false);
  const [checkin, setCheckin] = React.useState(todayCheckin);

  const today = new Date().toISOString().split("T")[0];

  function handleSaved(savedValues?: Record<string, { numericValue: number | null; textValue: string | null }>) {
    setIsEditing(false);
    if (savedValues) {
      setCheckin({
        id: checkin?.id ?? crypto.randomUUID(),
        date: today,
        values: savedValues,
        createdAt: checkin?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  const showForm = !checkin || isEditing;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-foreground">{t("checkinTitle")}</h1>
          <p className="mt-1 text-body-lg text-muted-foreground">
            {t("checkinSubtitle")}
          </p>
        </div>
        {streak > 0 && <StreakBadge streak={streak} />}
      </div>

      {/* DSGVO consent warning */}
      {!hasBodyWellnessConsent && (
        <div className="rounded-lg border border-warning/50 bg-warning/10 p-4">
          <p className="text-sm text-warning-foreground">
            {t("consentRevoked")}
          </p>
        </div>
      )}

      {/* Check-in Form or Summary */}
      {hasBodyWellnessConsent && showForm ? (
        <div className="rounded-lg border bg-card p-5">
          <CheckinForm
            categories={categories}
            date={today}
            existingValues={isEditing && checkin ? checkin.values : undefined}
            backfillDays={backfillDays}
            onSaved={handleSaved}
            onManageCategories={() => setShowCategoryManager(true)}
          />
        </div>
      ) : hasBodyWellnessConsent ? (
        checkin && (
          <CheckinSummary
            checkin={checkin}
            categories={categories}
            onEdit={() => setIsEditing(true)}
          />
        )
      ) : null}

      {/* Analysis Charts (if trainer enabled) */}
      {canSeeAnalysis && trendData.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-h3 text-foreground">{t("myTrends")}</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            {trendData.map((td) => (
              <div
                key={td.categoryId}
                className="rounded-lg border bg-card p-4"
              >
                <TrendChart data={td} height={200} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Manager Dialog */}
      <Dialog open={showCategoryManager} onOpenChange={setShowCategoryManager}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              {t("manageCategories")}
            </DialogTitle>
          </DialogHeader>
          <CategoryManager categories={categories} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
