import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { toAuthUser } from "@/lib/auth-user";
import { AthleteDetailView } from "@/components/feedback/athlete-detail-view";
import {
  getAthleteTrendData,
  getCheckinHistory,
  getAthleteDetail,
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

  // Get athlete detail with DSGVO consent check
  const detail = await getAthleteDetail(authUser.id, athleteId);

  if (!detail || !detail.athlete) {
    // Athlete not found or not connected
    redirect({ href: "/feedback", locale });
    return null;
  }

  // Get trend data and history (both respect DSGVO consent internally)
  const [trendData, { entries: checkinHistory, hasMore }] = await Promise.all([
    getAthleteTrendData(athleteId, "30"),
    getCheckinHistory(athleteId, { limit: 20 }),
  ]);

  return (
    <AthleteDetailView
      athlete={detail.athlete}
      trendData={trendData}
      checkinHistory={checkinHistory}
      hasMoreHistory={hasMore}
      categories={detail.categories}
      hasBodyWellnessConsent={detail.hasBodyWellnessConsent}
    />
  );
}
