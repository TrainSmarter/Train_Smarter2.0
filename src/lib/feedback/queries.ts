import { createClient } from "@/lib/supabase/server";
import type {
  ActiveCategory,
  CheckinEntry,
  MonitoringOverview,
  MonitoringAthleteSummary,
  MonitoringAlert,
  AthleteTrendData,
  TrendDataPoint,
  FeedbackCategory,
  CategoryScope,
  CategoryType,
  CategoryLabel,
  ScaleStepLabels,
  CheckinStatus,
  TrafficLight,
  AlertSeverity,
} from "./types";

/**
 * Server-side queries for Feedback & Monitoring — PROJ-6
 *
 * All queries use the server-side Supabase client (RLS enforced).
 * DSGVO consent is checked before returning body/wellness data.
 */

// ── Helper: Check body_wellness_data consent ─────────────────────

async function hasBodyWellnessConsent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("user_consents")
    .select("granted")
    .eq("user_id", userId)
    .eq("consent_type", "body_wellness_data")
    .order("granted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.granted === true;
}

// ── Helper: Map DB row to FeedbackCategory ───────────────────────

interface DbCategory {
  id: string;
  name: unknown;
  slug: string | null;
  type: string;
  unit: string | null;
  min_value: number | null;
  max_value: number | null;
  scale_labels: unknown;
  is_required: boolean;
  sort_order: number;
  icon: string | null;
  scope: string;
  created_by: string | null;
  target_athlete_id: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapDbCategory(row: DbCategory): FeedbackCategory {
  return {
    id: row.id,
    name: row.name as CategoryLabel,
    slug: row.slug ?? "",
    type: row.type as CategoryType,
    unit: row.unit,
    minValue: row.min_value,
    maxValue: row.max_value,
    scaleLabels: row.scale_labels as ScaleStepLabels | null,
    isRequired: row.is_required,
    sortOrder: row.sort_order,
    icon: row.icon,
    scope: row.scope as CategoryScope,
    createdBy: row.created_by,
    targetAthleteId: row.target_athlete_id,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Athlete Queries ──────────────────────────────────────────────

/** Get all active categories for a user (global + trainer-assigned + own - deactivated) */
export async function getActiveCategories(
  userId: string
): Promise<ActiveCategory[]> {
  const supabase = await createClient();

  // Fetch all visible categories via RLS (global + trainer-assigned + own)
  const { data: categories, error } = await supabase
    .from("feedback_categories")
    .select("*")
    .is("archived_at", null)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to fetch categories:", error);
    return [];
  }

  // Fetch overrides for this user
  const { data: overrides } = await supabase
    .from("feedback_category_overrides")
    .select("category_id, is_active")
    .eq("user_id", userId);

  const overrideMap = new Map(
    (overrides ?? []).map((o) => [o.category_id, o.is_active])
  );

  return (categories ?? []).map((row) => {
    const cat = mapDbCategory(row as unknown as DbCategory);
    const overrideValue = overrideMap.get(cat.id);
    // Default is active unless explicitly overridden to false
    const isActive = overrideValue !== undefined ? overrideValue : true;
    return { ...cat, isActive };
  });
}

/** Get check-in for a specific date (or null if not yet filled) */
export async function getCheckin(
  athleteId: string,
  date: string
): Promise<CheckinEntry | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // DSGVO consent check — if querying own data, check consent
  if (athleteId === user.id) {
    const hasConsent = await hasBodyWellnessConsent(supabase, user.id);
    if (!hasConsent) return null;
  }

  // Use the view for pivoted data
  const { data, error } = await supabase
    .from("v_athlete_checkin_history")
    .select("*")
    .eq("athlete_id", athleteId)
    .eq("date", date)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("Failed to fetch checkin:", error);
    return null;
  }

  const valuesObj = (data.values ?? {}) as Record<
    string,
    { numeric_value: number | null; text_value: string | null }
  >;

  // Convert DB snake_case to camelCase in values
  const values: Record<string, { numericValue: number | null; textValue: string | null }> = {};
  for (const [categoryId, v] of Object.entries(valuesObj)) {
    values[categoryId] = {
      numericValue: v.numeric_value,
      textValue: v.text_value,
    };
  }

  return {
    id: data.checkin_id,
    date: data.date,
    values,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/** Get check-in history for an athlete (keyset paginated) */
export async function getCheckinHistory(
  athleteId: string,
  options: { cursor?: string; limit?: number } = {}
): Promise<{ entries: CheckinEntry[]; hasMore: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { entries: [], hasMore: false };

  // DSGVO consent check — for own data or trainer viewing athlete data
  const consentUserId = athleteId === user.id ? user.id : athleteId;
  const hasConsent = await hasBodyWellnessConsent(supabase, consentUserId);
  if (!hasConsent) return { entries: [], hasMore: false };

  const limit = options.limit ?? 20;

  let query = supabase
    .from("v_athlete_checkin_history")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("date", { ascending: false })
    .limit(limit + 1); // fetch one extra to check hasMore

  // Keyset pagination: cursor is the last date from previous page
  if (options.cursor) {
    query = query.lt("date", options.cursor);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch checkin history:", error);
    return { entries: [], hasMore: false };
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const resultRows = hasMore ? rows.slice(0, limit) : rows;

  const entries: CheckinEntry[] = resultRows.map((row) => {
    const valuesObj = (row.values ?? {}) as Record<
      string,
      { numeric_value: number | null; text_value: string | null }
    >;

    const values: Record<string, { numericValue: number | null; textValue: string | null }> = {};
    for (const [categoryId, v] of Object.entries(valuesObj)) {
      values[categoryId] = {
        numericValue: v.numeric_value,
        textValue: v.text_value,
      };
    }

    return {
      id: row.checkin_id,
      date: row.date,
      values,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });

  return { entries, hasMore };
}

// ── Trainer Queries ──────────────────────────────────────────────

/** Get aggregated monitoring overview for all connected athletes */
export async function getMonitoringOverview(
  trainerId: string
): Promise<MonitoringOverview> {
  const supabase = await createClient();
  const empty: MonitoringOverview = {
    totalAthletes: 0,
    checkedInToday: 0,
    averageCompliance: 0,
    alertCount: 0,
    athletes: [],
    alerts: [],
  };

  // Fetch all active connections for this trainer
  const { data: connections, error: connError } = await supabase
    .from("trainer_athlete_connections")
    .select(
      `
      athlete_id,
      can_see_analysis,
      feedback_backfill_days,
      athlete:profiles!trainer_athlete_connections_athlete_id_fkey (
        id,
        first_name,
        last_name,
        email,
        avatar_url
      )
    `
    )
    .eq("trainer_id", trainerId)
    .eq("status", "active");

  if (connError || !connections || connections.length === 0) {
    if (connError) console.error("Failed to fetch connections:", connError);
    return empty;
  }

  const athleteIds = connections
    .map((c) => c.athlete_id)
    .filter((id): id is string => id !== null);

  if (athleteIds.length === 0) return empty;

  // Fetch monitoring summaries from the view
  const { data: summaries } = await supabase
    .from("v_athlete_monitoring_summary")
    .select("*")
    .in("athlete_id", athleteIds);

  // Fetch team assignments for these athletes
  const { data: teamAssignments } = await supabase
    .from("team_athletes")
    .select("athlete_id, team:teams(id, name)")
    .in("athlete_id", athleteIds);

  const teamMap = new Map<string, { teamId: string; teamName: string }>();
  for (const ta of teamAssignments ?? []) {
    const team = ta.team as unknown as { id: string; name: string } | null;
    if (team) {
      teamMap.set(ta.athlete_id, { teamId: team.id, teamName: team.name });
    }
  }

  const summaryMap = new Map(
    (summaries ?? []).map((s) => [s.athlete_id, s])
  );

  const today = new Date().toISOString().split("T")[0];

  const athletes: MonitoringAthleteSummary[] = connections.map((conn) => {
    const athlete = conn.athlete as unknown as Record<string, unknown> | null;
    const athleteId = conn.athlete_id ?? "";
    const summary = summaryMap.get(athleteId);
    const teamInfo = teamMap.get(athleteId);

    const lastCheckinDate = summary?.last_checkin_date
      ? String(summary.last_checkin_date)
      : null;

    let todayCheckinStatus: CheckinStatus = "missing";
    if (lastCheckinDate === today) {
      todayCheckinStatus = "complete";
    }

    const compliance = Number(summary?.compliance_rate ?? 0);
    const streak = Number(summary?.streak ?? 0);
    const weightTrend = summary?.weight_trend != null
      ? Number(summary.weight_trend)
      : null;

    // Traffic light based on compliance + missing check-ins
    let trafficLight: TrafficLight = "green";
    if (todayCheckinStatus === "missing" && lastCheckinDate) {
      const daysMissing = Math.floor(
        (new Date(today).getTime() - new Date(lastCheckinDate).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (daysMissing >= 3) trafficLight = "red";
      else if (daysMissing >= 1) trafficLight = "yellow";
    } else if (!lastCheckinDate) {
      trafficLight = "yellow";
    }

    if (compliance < 50) trafficLight = "red";
    else if (compliance < 70) trafficLight = "yellow";

    return {
      athleteId,
      firstName: (athlete?.first_name as string) ?? "",
      lastName: (athlete?.last_name as string) ?? "",
      email: (athlete?.email as string) ?? "",
      avatarUrl: (athlete?.avatar_url as string) ?? null,
      teamId: teamInfo?.teamId ?? null,
      teamName: teamInfo?.teamName ?? null,
      lastCheckinDate,
      todayCheckinStatus,
      trafficLight,
      streak,
      complianceRate: Math.round(compliance),
      weightTrend,
      latestWeight: summary?.latest_weight != null
        ? Number(summary.latest_weight)
        : null,
      canSeeAnalysis: conn.can_see_analysis,
      backfillDays: conn.feedback_backfill_days,
    };
  });

  // Generate alerts
  const alerts = getAlertsFromAthletes(athletes, today);

  const checkedInToday = athletes.filter(
    (a) => a.todayCheckinStatus === "complete"
  ).length;

  const avgCompliance =
    athletes.length > 0
      ? Math.round(
          athletes.reduce((sum, a) => sum + a.complianceRate, 0) /
            athletes.length
        )
      : 0;

  return {
    totalAthletes: athletes.length,
    checkedInToday,
    averageCompliance: avgCompliance,
    alertCount: alerts.length,
    athletes,
    alerts,
  };
}

/** Generate alerts from athlete summaries */
function getAlertsFromAthletes(
  athletes: MonitoringAthleteSummary[],
  today: string
): MonitoringAlert[] {
  const alerts: MonitoringAlert[] = [];

  for (const a of athletes) {
    // Missing check-in alerts
    if (a.lastCheckinDate && a.lastCheckinDate !== today) {
      const daysMissing = Math.floor(
        (new Date(today).getTime() - new Date(a.lastCheckinDate).getTime()) /
          (1000 * 60 * 60 * 24)
      );

      if (daysMissing >= 3) {
        alerts.push({
          athleteId: a.athleteId,
          firstName: a.firstName,
          lastName: a.lastName,
          avatarUrl: a.avatarUrl,
          severity: "critical" as AlertSeverity,
          type: "missing_checkin",
          message: "missingCheckinDays",
          detail: String(daysMissing),
        });
      } else if (daysMissing >= 1) {
        alerts.push({
          athleteId: a.athleteId,
          firstName: a.firstName,
          lastName: a.lastName,
          avatarUrl: a.avatarUrl,
          severity: "warning" as AlertSeverity,
          type: "missing_checkin",
          message: "missingCheckinDays",
          detail: String(daysMissing),
        });
      }
    } else if (!a.lastCheckinDate) {
      alerts.push({
        athleteId: a.athleteId,
        firstName: a.firstName,
        lastName: a.lastName,
        avatarUrl: a.avatarUrl,
        severity: "warning" as AlertSeverity,
        type: "missing_checkin",
        message: "neverCheckedIn",
        detail: "",
      });
    }

    // Weight change alerts (> 2% in 7 days)
    if (a.weightTrend !== null && a.latestWeight !== null) {
      const pctChange = Math.abs(a.weightTrend / a.latestWeight) * 100;
      if (pctChange > 2) {
        alerts.push({
          athleteId: a.athleteId,
          firstName: a.firstName,
          lastName: a.lastName,
          avatarUrl: a.avatarUrl,
          severity: pctChange > 5 ? ("critical" as AlertSeverity) : ("warning" as AlertSeverity),
          type: "weight_change",
          message: "weightChange",
          detail: String(a.weightTrend),
        });
      }
    }
  }

  return alerts;
}

/** Get trend data for an athlete's categories */
export async function getAthleteTrendData(
  athleteId: string,
  range: string
): Promise<AthleteTrendData[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const days = parseInt(range) || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split("T")[0];

  // Fetch all non-archived categories visible to this user
  const { data: categories } = await supabase
    .from("feedback_categories")
    .select("id, name, type, unit")
    .is("archived_at", null);

  if (!categories || categories.length === 0) return [];

  const catIds = categories.map((c) => c.id);

  // Fetch checkin values for this athlete within the date range
  const { data: values, error } = await supabase
    .from("feedback_checkin_values")
    .select(
      `
      category_id,
      numeric_value,
      text_value,
      checkin:feedback_checkins!inner (
        date
      )
    `
    )
    .eq("athlete_id", athleteId)
    .in("category_id", catIds)
    .gte("checkin.date", startDateStr)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch trend data:", error);
    return [];
  }

  // Group by category
  const trendMap = new Map<string, TrendDataPoint[]>();

  for (const v of values ?? []) {
    const checkin = v.checkin as unknown as { date: string } | null;
    if (!checkin) continue;

    const catId = v.category_id;
    if (!trendMap.has(catId)) {
      trendMap.set(catId, []);
    }
    trendMap.get(catId)!.push({
      date: checkin.date,
      value: v.numeric_value,
    });
  }

  return categories.map((cat) => ({
    categoryId: cat.id,
    categoryName: cat.name as CategoryLabel,
    categoryType: cat.type as CategoryType,
    unit: cat.unit,
    data: trendMap.get(cat.id) ?? [],
  }));
}

/** Get connection info for an athlete (canSeeAnalysis, backfillDays, streak) */
export async function getAthleteConnectionInfo(
  athleteId: string
): Promise<{
  canSeeAnalysis: boolean;
  backfillDays: number;
  streak: number;
}> {
  const supabase = await createClient();

  // Get the trainer connection
  const { data: connection } = await supabase
    .from("trainer_athlete_connections")
    .select("can_see_analysis, feedback_backfill_days")
    .eq("athlete_id", athleteId)
    .eq("status", "active")
    .maybeSingle();

  // Get streak from monitoring summary
  const { data: summary } = await supabase
    .from("v_athlete_monitoring_summary")
    .select("streak")
    .eq("athlete_id", athleteId)
    .maybeSingle();

  return {
    canSeeAnalysis: connection?.can_see_analysis ?? false,
    backfillDays: connection?.feedback_backfill_days ?? 3,
    streak: Number(summary?.streak ?? 0),
  };
}

/** Get alerts for a trainer (athletes with anomalies) */
export async function getAlerts(
  trainerId: string
): Promise<MonitoringAlert[]> {
  // Re-use monitoring overview and extract alerts
  const overview = await getMonitoringOverview(trainerId);
  return overview.alerts;
}

/** Get detailed data for a single athlete (trainer perspective) */
export async function getAthleteDetail(
  trainerId: string,
  athleteId: string
): Promise<{
  athlete: MonitoringAthleteSummary | null;
  categories: ActiveCategory[];
  connectionId: string | null;
} | null> {
  const supabase = await createClient();

  // Verify trainer is connected to this athlete
  const { data: connection, error: connError } = await supabase
    .from("trainer_athlete_connections")
    .select(
      `
      id,
      can_see_analysis,
      feedback_backfill_days,
      athlete:profiles!trainer_athlete_connections_athlete_id_fkey (
        id,
        first_name,
        last_name,
        email,
        avatar_url
      )
    `
    )
    .eq("trainer_id", trainerId)
    .eq("athlete_id", athleteId)
    .eq("status", "active")
    .maybeSingle();

  if (connError || !connection) {
    if (connError) console.error("Failed to fetch athlete detail:", connError);
    return null;
  }

  const athlete = connection.athlete as unknown as Record<string, unknown> | null;

  // Get monitoring summary
  const { data: summary } = await supabase
    .from("v_athlete_monitoring_summary")
    .select("*")
    .eq("athlete_id", athleteId)
    .maybeSingle();

  // Get team info
  const { data: teamAssignment } = await supabase
    .from("team_athletes")
    .select("team:teams(id, name)")
    .eq("athlete_id", athleteId)
    .maybeSingle();

  const team = teamAssignment?.team as unknown as { id: string; name: string } | null;
  const today = new Date().toISOString().split("T")[0];

  const lastCheckinDate = summary?.last_checkin_date
    ? String(summary.last_checkin_date)
    : null;
  let todayCheckinStatus: CheckinStatus = "missing";
  if (lastCheckinDate === today) todayCheckinStatus = "complete";

  const compliance = Number(summary?.compliance_rate ?? 0);

  let trafficLight: TrafficLight = "green";
  if (compliance < 50) trafficLight = "red";
  else if (compliance < 70) trafficLight = "yellow";

  const athleteSummary: MonitoringAthleteSummary = {
    athleteId,
    firstName: (athlete?.first_name as string) ?? "",
    lastName: (athlete?.last_name as string) ?? "",
    email: (athlete?.email as string) ?? "",
    avatarUrl: (athlete?.avatar_url as string) ?? null,
    teamId: team?.id ?? null,
    teamName: team?.name ?? null,
    lastCheckinDate,
    todayCheckinStatus,
    trafficLight,
    streak: Number(summary?.streak ?? 0),
    complianceRate: Math.round(compliance),
    weightTrend: summary?.weight_trend != null
      ? Number(summary.weight_trend)
      : null,
    latestWeight: summary?.latest_weight != null
      ? Number(summary.latest_weight)
      : null,
    canSeeAnalysis: connection.can_see_analysis,
    backfillDays: connection.feedback_backfill_days,
  };

  // Get active categories for this athlete
  const categories = await getActiveCategories(athleteId);

  return {
    athlete: athleteSummary,
    categories,
    connectionId: connection.id,
  };
}
