import { getTranslations } from "next-intl/server";
import { logError } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { toAuthUser } from "@/lib/auth-user";
import { FeedbackTrainerPage } from "@/components/feedback/feedback-trainer-page";
import { AthleteCheckinPage } from "@/components/feedback/athlete-checkin-page";
import { getActiveCategories, getCheckinsByDateRange, getMonitoringOverview, getAthleteTrendData, getAthleteConnectionInfo, getTrainerDefaults } from "@/lib/feedback/queries";
import type { FeedbackCategory } from "@/lib/feedback/types";

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
    // Trainer: Monitoring Dashboard + Settings tabs
    const [overview, trainerDefaults, allCategoriesRaw] = await Promise.all([
      getMonitoringOverview(authUser.id),
      getTrainerDefaults(authUser.id),
      getAllCategories(),
    ]);

    // Serialize FeedbackCategory[] for client component
    const allCategories: FeedbackCategory[] = allCategoriesRaw;

    return (
      <FeedbackTrainerPage
        overview={overview}
        allCategories={allCategories}
        trainerDefaults={trainerDefaults}
      />
    );
  }

  // Athlete: Check-in Page
  const categories = await getActiveCategories(authUser.id);

  // Derive required category IDs from the already-fetched categories
  // instead of a separate DB query (getRequiredCategoryIds duplicated the same data).
  const requiredCategoryIds = categories
    .filter((c) => c.isActive && c.isEffectivelyRequired && c.type !== "text")
    .map((c) => c.id);

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

  // Fetch real connection info (canSeeAnalysis, backfillMode, streak)
  const connectionInfo = await getAthleteConnectionInfo(authUser.id);
  const { canSeeAnalysis, streak, backfillMode } = connectionInfo;

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
      backfillMode={backfillMode}
      hasBodyWellnessConsent={hasBodyWellnessConsent}
      initialWeekStart={startDate}
      requiredCategoryIds={requiredCategoryIds}
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

/** Fetch all non-archived categories (for trainer settings page) */
async function getAllCategories(): Promise<FeedbackCategory[]> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("feedback_categories")
    .select("*")
    .is("archived_at", null)
    .order("sort_order", { ascending: true });

  if (error || !data) {
    logError("Failed to fetch all categories", error);
    return [];
  }

  return data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    name: row.name as { de: string; en: string },
    slug: (row.slug as string) ?? "",
    type: row.type as "number" | "scale" | "text",
    unit: row.unit as string | null,
    minValue: row.min_value as number | null,
    maxValue: row.max_value as number | null,
    scaleLabels: row.scale_labels as Record<string, { de: string; en: string }> | null,
    isRequired: row.is_required as boolean,
    sortOrder: row.sort_order as number,
    icon: row.icon as string | null,
    scope: row.scope as "global" | "trainer" | "athlete",
    createdBy: row.created_by as string | null,
    targetAthleteId: row.target_athlete_id as string | null,
    archivedAt: row.archived_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}
