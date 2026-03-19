"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MonitoringDashboard } from "./monitoring-dashboard";
import { DefaultSettingsPage } from "./default-settings-page";
import type { MonitoringOverview, FeedbackCategory, TrainerCategoryDefault } from "@/lib/feedback/types";

interface FeedbackTrainerPageProps {
  overview: MonitoringOverview;
  allCategories: FeedbackCategory[];
  trainerDefaults: TrainerCategoryDefault[];
}

const TAB_STORAGE_KEY = "feedback-trainer-tab";

export function FeedbackTrainerPage({
  overview,
  allCategories,
  trainerDefaults,
}: FeedbackTrainerPageProps) {
  const t = useTranslations("feedback");

  // Persist selected tab in localStorage
  const [activeTab, setActiveTab] = React.useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(TAB_STORAGE_KEY) ?? "overview";
    }
    return "overview";
  });

  const [isHydrated, setIsHydrated] = React.useState(false);

  React.useEffect(() => {
    setIsHydrated(true);
    const stored = localStorage.getItem(TAB_STORAGE_KEY);
    if (stored) {
      setActiveTab(stored);
    }
  }, []);

  function handleTabChange(value: string) {
    setActiveTab(value);
    localStorage.setItem(TAB_STORAGE_KEY, value);
  }

  // Avoid hydration mismatch — render overview by default until hydrated
  if (!isHydrated) {
    return <MonitoringDashboard overview={overview} />;
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList>
        <TabsTrigger value="overview">{t("tabAthletes")}</TabsTrigger>
        <TabsTrigger value="settings">{t("tabSettings")}</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <MonitoringDashboard overview={overview} />
      </TabsContent>

      <TabsContent value="settings">
        <DefaultSettingsPage
          allCategories={allCategories}
          trainerDefaults={trainerDefaults}
        />
      </TabsContent>
    </Tabs>
  );
}
