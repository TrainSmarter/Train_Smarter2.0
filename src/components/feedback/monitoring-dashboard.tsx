"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Users,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Search,
  Filter,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatsCard } from "@/components/stats-card";
import { EmptyState } from "@/components/empty-state";
import { MonitoringViewSwitcher } from "./monitoring-view-switcher";
import { MonitoringCardGrid } from "./monitoring-card-grid";
import { MonitoringTable } from "./monitoring-table";
import { MonitoringAlertView } from "./monitoring-alert-view";
import { MonitoringTrendView } from "./monitoring-trend-view";
import { useFeedbackPreferences } from "@/hooks/use-feedback-preferences";
import type { MonitoringOverview, MonitoringTimeRange } from "@/lib/feedback/types";

interface MonitoringDashboardProps {
  overview: MonitoringOverview;
}

export function MonitoringDashboard({ overview }: MonitoringDashboardProps) {
  const t = useTranslations("feedback");

  const {
    viewMode,
    timeRange,
    filterTeam,
    filterStatus,
    setViewMode,
    setTimeRange,
    setFilterTeam,
    setFilterStatus,
    isHydrated,
  } = useFeedbackPreferences();

  const [search, setSearch] = React.useState("");

  // Extract unique teams from athletes
  const teams = React.useMemo(() => {
    const teamMap = new Map<string, string>();
    for (const a of overview.athletes) {
      if (a.teamId && a.teamName) {
        teamMap.set(a.teamId, a.teamName);
      }
    }
    return Array.from(teamMap.entries()).map(([id, name]) => ({ id, name }));
  }, [overview.athletes]);

  // Filter athletes
  const filteredAthletes = React.useMemo(() => {
    let result = [...overview.athletes];

    // Team filter
    if (filterTeam !== "all") {
      result = result.filter((a) => a.teamId === filterTeam);
    }

    // Status filter
    if (filterStatus === "complete") {
      result = result.filter((a) => a.todayCheckinStatus === "complete");
    } else if (filterStatus === "missing") {
      result = result.filter((a) => a.todayCheckinStatus === "missing");
    } else if (filterStatus === "alert") {
      const alertIds = new Set(overview.alerts.map((a) => a.athleteId));
      result = result.filter((a) => alertIds.has(a.athleteId));
    }

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.firstName.toLowerCase().includes(q) ||
          a.lastName.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          `${a.firstName} ${a.lastName}`.toLowerCase().includes(q)
      );
    }

    return result;
  }, [overview, filterTeam, filterStatus, search]);

  const hasNoData = overview.totalAthletes === 0;
  const hasNoResults = filteredAthletes.length === 0 && !hasNoData;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-h1 text-foreground">{t("monitoringTitle")}</h1>
        <p className="mt-1 text-body-lg text-muted-foreground">
          {t("monitoringSubtitle")}
        </p>
      </div>

      {/* Stats Bar */}
      {!hasNoData && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            color="blue"
            icon={<Users className="h-5 w-5" />}
            title={t("statsTotalAthletes")}
            value={String(overview.totalAthletes)}
          />
          <StatsCard
            color="green"
            icon={<CheckCircle2 className="h-5 w-5" />}
            title={t("statsCheckedInToday")}
            value={`${overview.checkedInToday} / ${overview.totalAthletes}`}
          />
          <StatsCard
            color="purple"
            icon={<TrendingUp className="h-5 w-5" />}
            title={t("statsCompliance")}
            value={`${overview.averageCompliance}%`}
          />
          <StatsCard
            color={overview.alertCount > 0 ? "red" : "green"}
            icon={<AlertTriangle className="h-5 w-5" />}
            title={t("statsAlerts")}
            value={String(overview.alertCount)}
          />
        </div>
      )}

      {/* Toolbar */}
      {!hasNoData && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t("searchAthlete")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  aria-label={t("searchAthlete")}
                />
              </div>
            </div>
            {isHydrated && (
              <MonitoringViewSwitcher value={viewMode} onChange={setViewMode} />
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Select value={filterTeam} onValueChange={setFilterTeam}>
              <SelectTrigger className="w-full sm:w-[200px]" aria-label={t("filterTeam")}>
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filterAllTeams")}</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[200px]" aria-label={t("filterStatusLabel")}>
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filterAll")}</SelectItem>
                <SelectItem value="complete">{t("filterCheckedIn")}</SelectItem>
                <SelectItem value="missing">{t("filterMissing")}</SelectItem>
                <SelectItem value="alert">{t("filterAlerts")}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={timeRange}
              onValueChange={(v) => setTimeRange(v as MonitoringTimeRange)}
            >
              <SelectTrigger className="w-full sm:w-[140px]" aria-label={t("timeRangeLabel")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">{t("timeRange7")}</SelectItem>
                <SelectItem value="30">{t("timeRange30")}</SelectItem>
                <SelectItem value="90">{t("timeRange90")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Empty State */}
      {hasNoData && (
        <EmptyState
          className="mt-12"
          icon="📊"
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      )}

      {/* No Search Results */}
      {hasNoResults && (
        <EmptyState
          className="mt-8"
          icon="🔍"
          title={t("noResults")}
          description={t("noResultsDescription")}
        />
      )}

      {/* Active View */}
      {!hasNoData && !hasNoResults && isHydrated && (
        <>
          {viewMode === "card-grid" && (
            <MonitoringCardGrid athletes={filteredAthletes} />
          )}
          {viewMode === "table" && (
            <MonitoringTable athletes={filteredAthletes} />
          )}
          {viewMode === "alert" && (
            <MonitoringAlertView alerts={overview.alerts} />
          )}
          {viewMode === "trend" && (
            <MonitoringTrendView
              athletes={filteredAthletes}
              timeRange={timeRange}
            />
          )}
          {/* Phase 2 views show coming-soon message */}
          {["calendar", "heatmap", "feed", "ranking"].includes(viewMode) && (
            <EmptyState
              className="mt-8"
              icon="🚧"
              title={t("phase2Title")}
              description={t("phase2Description")}
            />
          )}
        </>
      )}
    </div>
  );
}
