import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { toAuthUser } from "@/lib/mock-session";
import { AthleteDetailView } from "@/components/feedback/athlete-detail-view";
import {
  getMonitoringOverview,
  getAthleteTrendData,
  getCheckinHistory,
  getActiveCategories,
} from "@/lib/feedback/queries";
import { redirect } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "feedback" });
  return {
    title: t("athleteDetailTitle"),
  };
}

export default async function AthleteDetailPage({
  params,
}: {
  params: Promise<{ locale: string; athleteId: string }>;
}) {
  const { locale, athleteId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const authUser = toAuthUser(user);
  const role = authUser.app_metadata.roles[0];

  // Only trainers can access athlete detail view
  if (role !== "TRAINER") {
    redirect({ href: "/feedback", locale });
    return null;
  }

  // Get overview to find the athlete summary
  const overview = await getMonitoringOverview(authUser.id);
  const athlete = overview.athletes.find((a) => a.athleteId === athleteId);

  if (!athlete) {
    // Athlete not found or not connected
    redirect({ href: "/feedback", locale });
    return null;
  }

  // Get trend data, history, and categories
  const [trendData, { entries: checkinHistory, hasMore }, categories] = await Promise.all([
    getAthleteTrendData(authUser.id, athleteId, "30"),
    getCheckinHistory(athleteId, { limit: 20 }),
    getActiveCategories(athleteId),
  ]);

  return (
    <AthleteDetailView
      athlete={athlete}
      trendData={trendData}
      checkinHistory={checkinHistory}
      hasMoreHistory={hasMore}
      categories={categories}
    />
  );
}
