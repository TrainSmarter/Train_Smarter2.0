"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MonitoringAlert } from "@/lib/feedback/types";

interface MonitoringAlertViewProps {
  alerts: MonitoringAlert[];
}

export function MonitoringAlertView({ alerts }: MonitoringAlertViewProps) {
  const t = useTranslations("feedback");

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
          <CheckCircle2 className="h-6 w-6 text-success" />
        </div>
        <h3 className="text-h4 text-foreground">{t("allClear")}</h3>
        <p className="mt-2 max-w-sm text-body text-muted-foreground">
          {t("allClearDescription")}
        </p>
      </div>
    );
  }

  // Group by severity
  const critical = alerts.filter((a) => a.severity === "critical");
  const warnings = alerts.filter((a) => a.severity === "warning");

  return (
    <div className="space-y-4">
      {critical.length > 0 && (
        <section aria-label={t("alertCritical")}>
          <h3 className="text-sm font-medium text-error mb-2 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" />
            {t("alertCritical")} ({critical.length})
          </h3>
          <div className="space-y-2">
            {critical.map((alert, i) => (
              <AlertCard key={`critical-${i}`} alert={alert} />
            ))}
          </div>
        </section>
      )}
      {warnings.length > 0 && (
        <section aria-label={t("alertWarning")}>
          <h3 className="text-sm font-medium text-warning-dark dark:text-warning mb-2 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" />
            {t("alertWarning")} ({warnings.length})
          </h3>
          <div className="space-y-2">
            {warnings.map((alert, i) => (
              <AlertCard key={`warning-${i}`} alert={alert} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function AlertCard({ alert }: { alert: MonitoringAlert }) {
  const t = useTranslations("feedback");

  const message = (() => {
    switch (alert.type) {
      case "missing_checkin":
        return t("alertMissingCheckin", { days: alert.detail });
      case "low_scale":
        return t("alertLowScale", { detail: alert.detail });
      case "weight_change":
        return t("alertWeightChange", { change: alert.detail });
      default:
        return alert.message;
    }
  })();

  return (
    <Link
      href={{
        pathname: "/feedback/[athleteId]",
        params: { athleteId: alert.athleteId },
      }}
      className="block"
    >
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50",
          alert.severity === "critical"
            ? "border-l-4 border-l-error"
            : "border-l-4 border-l-warning"
        )}
      >
        <Avatar className="h-8 w-8 shrink-0">
          {alert.avatarUrl && (
            <AvatarImage
              src={alert.avatarUrl}
              alt={`${alert.firstName} ${alert.lastName}`}
            />
          )}
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {alert.firstName.charAt(0)}
            {alert.lastName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {alert.firstName} {alert.lastName}
          </p>
          <p className="text-xs text-muted-foreground">{message}</p>
        </div>
        <Badge
          variant={alert.severity === "critical" ? "error" : "warning"}
          size="sm"
        >
          {alert.severity === "critical" ? t("critical") : t("warning")}
        </Badge>
      </div>
    </Link>
  );
}
