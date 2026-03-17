import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { toAuthUser } from "@/lib/mock-session";
import { MonitoringDashboard } from "@/components/feedback/monitoring-dashboard";
import { AthleteCheckinPage } from "@/components/feedback/athlete-checkin-page";
import { getActiveCategories, getCheckinsByDateRange, getMonitoringOverview, getAthleteTrendData, getAthleteConnectionInfo } from "@/lib/feedback/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "feedback" });
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function FeedbackPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const authUser = toAuthUser(user);
  const role = authUser.app_metadata.roles[0];
  const isTrainer = role === "TRAINER";

  if (isTrainer) {
    // Trainer: Monitoring Dashboard
    const overview = await getMonitoringOverview(authUser.id);
    return <MonitoringDashboard overview={overview} />;
  }

  // Athlete: Check-in Page
  const categories = await getActiveCategories(authUser.id);

  // Calculate current week range (Monday through today)
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon...
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOffset);
  const startDate = formatDate(monday);
  const endDate = formatDate(today);

  // Load all check-ins for this week
  const weekCheckinsMap = await getCheckinsByDateRange(authUser.id, startDate, endDate);

  // Convert Map to plain object for serialization
  const weekCheckins: Record<string, { id: string; date: string; values: Record<string, { numericValue: number | null; textValue: string | null }>; createdAt: string; updatedAt: string }> = {};
  for (const [date, entry] of weekCheckinsMap) {
    weekCheckins[date] = entry;
  }

  // Check DSGVO consent for body/wellness data
  const { data: consentData } = await supabase
    .from("user_consents")
    .select("granted")
    .eq("user_id", authUser.id)
    .eq("consent_type", "body_wellness_data")
    .order("granted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const hasBodyWellnessConsent = consentData?.granted === true;

  // Fetch real connection info (canSeeAnalysis, backfillDays, streak)
  const connectionInfo = await getAthleteConnectionInfo(authUser.id);
  const { canSeeAnalysis, streak, backfillDays } = connectionInfo;

  // Load trend data if analysis is visible
  const trendData = canSeeAnalysis
    ? await getAthleteTrendData(authUser.id, "30")
    : [];

  return (
    <AthleteCheckinPage
      categories={categories}
      weekCheckins={weekCheckins}
      canSeeAnalysis={canSeeAnalysis}
      streak={streak}
      trendData={trendData}
      backfillDays={backfillDays}
      hasBodyWellnessConsent={hasBodyWellnessConsent}
      initialWeekStart={startDate}
    />
  );
}

/** Format a Date to YYYY-MM-DD (local time) */
function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
