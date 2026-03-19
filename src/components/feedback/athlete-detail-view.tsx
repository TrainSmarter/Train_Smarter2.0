"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UnifiedTrendChart } from "./unified-trend-chart";
import { StreakBadge } from "./streak-badge";
import { CategoryManager } from "./category-manager";
import { toggleAnalysisVisibility, updateBackfillMode, loadMoreCheckinHistory } from "@/lib/feedback/actions";
import type {
  MonitoringAthleteSummary,
  AthleteTrendData,
  ActiveCategory,
  CheckinEntry,
  MonitoringTimeRange,
  BackfillMode,
} from "@/lib/feedback/types";

interface AthleteDetailViewProps {
  athlete: MonitoringAthleteSummary;
  trendData: AthleteTrendData[];
  checkinHistory: CheckinEntry[];
  hasMoreHistory: boolean;
  categories: ActiveCategory[];
  /** Whether the athlete has granted body_wellness_data consent */
  hasBodyWellnessConsent: boolean;
}

export function AthleteDetailView({
  athlete,
  trendData,
  checkinHistory,
  hasMoreHistory,
  categories,
  hasBodyWellnessConsent,
}: AthleteDetailViewProps) {
  const t = useTranslations("feedback");
  const locale = useLocale();
  const [timeRange, setTimeRange] = React.useState<MonitoringTimeRange>("30");
  const [canSeeAnalysis, setCanSeeAnalysis] = React.useState(athlete.canSeeAnalysis);
  const [backfillModeValue, setBackfillModeValue] = React.useState<BackfillMode>(athlete.backfillMode);
  const [togglingAnalysis, setTogglingAnalysis] = React.useState(false);
  const [showCategoryManager, setShowCategoryManager] = React.useState(false);
  const [history, setHistory] = React.useState(checkinHistory);
  const [hasMore, setHasMore] = React.useState(hasMoreHistory);
  const [loadingMore, setLoadingMore] = React.useState(false);

  async function handleLoadMore() {
    if (!hasMore || loadingMore || history.length === 0) return;
    setLoadingMore(true);
    try {
      const cursor = history[history.length - 1].date;
      const result = await loadMoreCheckinHistory(athlete.athleteId, cursor, 20);
      setHistory((prev) => [...prev, ...result.entries]);
      setHasMore(result.hasMore);
    } catch {
      toast.error(t("updateError"));
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleToggleAnalysis(checked: boolean) {
    setTogglingAnalysis(true);
    setCanSeeAnalysis(checked);
    try {
      const result = await toggleAnalysisVisibility(athlete.athleteId, checked);
      if (!result.success) {
        setCanSeeAnalysis(!checked);
        toast.error(t("updateError"));
      } else {
        toast.success(
          checked ? t("analysisEnabled") : t("analysisDisabled")
        );
      }
    } catch {
      setCanSeeAnalysis(!checked);
      toast.error(t("updateError"));
    } finally {
      setTogglingAnalysis(false);
    }
  }

  async function handleBackfillChange(mode: string) {
    const newMode = mode as BackfillMode;
    setBackfillModeValue(newMode);
    try {
      const result = await updateBackfillMode(athlete.athleteId, newMode);
      if (!result.success) {
        toast.error(t("updateError"));
      }
    } catch {
      toast.error(t("updateError"));
    }
  }

  return (
    <div className="space-y-6">
      {/* Back Navigation + Header */}
      <div className="flex items-start gap-4">
        <Link href="/feedback">
          <Button variant="ghost" size="icon" aria-label={t("back")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              {athlete.avatarUrl && (
                <AvatarImage
                  src={athlete.avatarUrl}
                  alt={`${athlete.firstName} ${athlete.lastName}`}
                />
              )}
              <AvatarFallback className="bg-primary/10 text-primary">
                {athlete.firstName.charAt(0)}
                {athlete.lastName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-h2 text-foreground">
                {athlete.firstName} {athlete.lastName}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                {athlete.teamName && (
                  <Badge variant="outline" size="sm">{athlete.teamName}</Badge>
                )}
                <StreakBadge streak={athlete.streak} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Bar */}
      <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {canSeeAnalysis ? (
              <Eye className="h-4 w-4 text-success" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
            <Label htmlFor="analysis-toggle" className="text-sm">
              {t("chartsVisibleForAthlete")}
            </Label>
          </div>
          <Switch
            id="analysis-toggle"
            checked={canSeeAnalysis}
            onCheckedChange={handleToggleAnalysis}
            disabled={togglingAnalysis}
          />
        </div>
        <div className="flex items-center gap-3">
          <Label className="text-sm text-muted-foreground">
            {t("backfillModeLabel")}
          </Label>
          <Select value={backfillModeValue} onValueChange={handleBackfillChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_week">{t("backfillCurrentWeek")}</SelectItem>
              <SelectItem value="two_weeks">{t("backfillTwoWeeks")}</SelectItem>
              <SelectItem value="unlimited">{t("backfillUnlimited")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCategoryManager(true)}
          className="gap-2"
        >
          <Settings2 className="h-4 w-4" />
          {t("manageCategories")}
        </Button>
      </div>

      {/* DSGVO consent warning */}
      {!hasBodyWellnessConsent && (
        <div className="rounded-lg border border-warning/50 bg-warning/10 p-4">
          <p className="text-sm text-warning-foreground">
            {t("consentRevokedTrainer")}
          </p>
        </div>
      )}

      {/* Time Range Selector */}
      <div className="flex items-center gap-2">
        <Label className="text-sm">{t("timeRangeLabel")}</Label>
        <Select
          value={timeRange}
          onValueChange={(v) => setTimeRange(v as MonitoringTimeRange)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">{t("timeRange7")}</SelectItem>
            <SelectItem value="30">{t("timeRange30")}</SelectItem>
            <SelectItem value="90">{t("timeRange90")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Unified Trend Chart */}
      <UnifiedTrendChart trendData={trendData} />

      {/* Check-in History Table — dynamic columns from categories */}
      <div>
        <h2 className="text-h4 text-foreground mb-3">{t("checkinHistory")}</h2>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-card z-10">{t("columnDate")}</TableHead>
                {categories.filter(c => c.isActive).map((cat) => (
                  <TableHead key={cat.id} className="text-xs whitespace-nowrap">
                    {locale === "en" ? cat.name.en : cat.name.de}
                    {cat.unit ? ` (${cat.unit})` : ""}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={categories.filter(c => c.isActive).length + 1}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {t("noCheckinHistory")}
                  </TableCell>
                </TableRow>
              ) : (
                history.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm sticky left-0 bg-card z-10">
                      {new Date(entry.date).toLocaleDateString(
                        locale === "en" ? "en-US" : "de-AT",
                        { day: "numeric", month: "short", year: "numeric" }
                      )}
                    </TableCell>
                    {categories.filter(c => c.isActive).map((cat) => {
                      const val = entry.values[cat.id];
                      let display = "—";
                      if (cat.type === "text" && val?.textValue) {
                        display = val.textValue;
                      } else if (val?.numericValue != null) {
                        display = String(val.numericValue);
                      }
                      return (
                        <TableCell
                          key={cat.id}
                          className={`text-sm ${cat.type === "text" ? "text-muted-foreground max-w-[200px] truncate" : ""}`}
                        >
                          {display}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {hasMore && (
          <div className="flex justify-center mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? t("loadingMore") : t("loadMore")}
            </Button>
          </div>
        )}
      </div>

      {/* Category Manager Dialog */}
      <Dialog open={showCategoryManager} onOpenChange={setShowCategoryManager}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              {t("manageCategories")}
            </DialogTitle>
          </DialogHeader>
          <CategoryManager categories={categories} isTrainerView />
        </DialogContent>
      </Dialog>
    </div>
  );
}
