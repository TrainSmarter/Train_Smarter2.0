"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { MonitoringAthleteSummary } from "@/lib/feedback/types";

type SortKey = "name" | "lastCheckin" | "weight" | "compliance" | "streak";
type SortDir = "asc" | "desc";

interface MonitoringTableProps {
  athletes: MonitoringAthleteSummary[];
}

function renderSortIcon(sortKey: SortKey, sortDir: SortDir, column: SortKey) {
  if (sortKey !== column) return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />;
  return sortDir === "asc" ? (
    <ArrowUp className="h-3.5 w-3.5" />
  ) : (
    <ArrowDown className="h-3.5 w-3.5" />
  );
}

export function MonitoringTable({ athletes }: MonitoringTableProps) {
  const t = useTranslations("feedback");
  const [sortKey, setSortKey] = React.useState<SortKey>("name");
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = React.useMemo(() => {
    const items = [...athletes];
    const dir = sortDir === "asc" ? 1 : -1;
    items.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return dir * `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
        case "lastCheckin":
          return dir * ((a.lastCheckinDate ?? "").localeCompare(b.lastCheckinDate ?? ""));
        case "weight":
          return dir * ((a.latestWeight ?? 0) - (b.latestWeight ?? 0));
        case "compliance":
          return dir * (a.complianceRate - b.complianceRate);
        case "streak":
          return dir * (a.streak - b.streak);
        default:
          return 0;
      }
    });
    return items;
  }, [athletes, sortKey, sortDir]);

  const sortableColumns: { key: SortKey; labelKey: string }[] = [
    { key: "name", labelKey: "columnAthlete" },
    { key: "lastCheckin", labelKey: "columnLastCheckin" },
    { key: "weight", labelKey: "columnWeight" },
  ];

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {sortableColumns.map(({ key, labelKey }) => (
              <TableHead key={key}>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  onClick={() => toggleSort(key)}
                >
                  {t(labelKey)}
                  {renderSortIcon(sortKey, sortDir, key)}
                </button>
              </TableHead>
            ))}
            <TableHead>{t("columnTrend")}</TableHead>
            <TableHead>
              <button
                type="button"
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                onClick={() => toggleSort("compliance")}
              >
                {t("columnCompliance")}
                {renderSortIcon(sortKey, sortDir, "compliance")}
              </button>
            </TableHead>
            <TableHead>
              <button
                type="button"
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                onClick={() => toggleSort("streak")}
              >
                {t("columnStreak")}
                {renderSortIcon(sortKey, sortDir, "streak")}
              </button>
            </TableHead>
            <TableHead>{t("columnStatus")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((athlete) => (
            <TableRow key={athlete.athleteId} className="cursor-pointer hover:bg-muted/50">
              <TableCell>
                <Link
                  href={{
                    pathname: "/feedback/[athleteId]",
                    params: { athleteId: athlete.athleteId },
                  }}
                  className="flex items-center gap-2.5 hover:underline"
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    {athlete.avatarUrl && (
                      <AvatarImage
                        src={athlete.avatarUrl}
                        alt={`${athlete.firstName} ${athlete.lastName}`}
                      />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {athlete.firstName.charAt(0)}
                      {athlete.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {athlete.firstName} {athlete.lastName}
                    </p>
                    {athlete.teamName && (
                      <p className="truncate text-xs text-muted-foreground">
                        {athlete.teamName}
                      </p>
                    )}
                  </div>
                </Link>
              </TableCell>
              <TableCell className="text-sm">
                {athlete.lastCheckinDate ?? "\u2014"}
              </TableCell>
              <TableCell className="text-sm">
                {athlete.latestWeight != null
                  ? `${athlete.latestWeight} kg`
                  : "\u2014"}
              </TableCell>
              <TableCell className="text-sm">
                {athlete.weightTrend != null ? (
                  <span
                    className={cn(
                      "font-medium",
                      athlete.weightTrend > 0 ? "text-error" : athlete.weightTrend < 0 ? "text-success" : ""
                    )}
                  >
                    {athlete.weightTrend > 0 ? "+" : ""}
                    {athlete.weightTrend.toFixed(1)} kg
                  </span>
                ) : (
                  "\u2014"
                )}
              </TableCell>
              <TableCell className="text-sm">
                <span
                  className={cn(
                    "font-medium",
                    athlete.complianceRate >= 80
                      ? "text-success"
                      : athlete.complianceRate >= 50
                        ? "text-warning"
                        : "text-error"
                  )}
                >
                  {athlete.complianceRate}%
                </span>
              </TableCell>
              <TableCell className="text-sm">
                {athlete.streak > 0 ? `${athlete.streak}d` : "\u2014"}
              </TableCell>
              <TableCell>
                {athlete.todayCheckinStatus === "complete" ? (
                  <Badge variant="success" size="sm">{t("checkedIn")}</Badge>
                ) : athlete.todayCheckinStatus === "partial" ? (
                  <Badge variant="warning" size="sm">{t("partialCheckin")}</Badge>
                ) : (
                  <Badge variant="error" size="sm">{t("noCheckin")}</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
          {sorted.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                {t("noAthletes")}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
