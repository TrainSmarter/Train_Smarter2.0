"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * Server Actions for Feedback & Monitoring — PROJ-6
 *
 * Pattern: authenticate -> validate -> authorize -> mutate -> revalidate -> return result
 */

type ActionResult<T = undefined> = T extends undefined
  ? { success: boolean; error?: string }
  : { success: boolean; error?: string; data?: T };

// ── Validation Schemas ──────────────────────────────────────────

const checkinValueSchema = z.object({
  categoryId: z.string().uuid(),
  numericValue: z.number().optional(),
  textValue: z.string().max(300).optional(),
});

const saveCheckinSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  values: z.array(checkinValueSchema).min(1),
});

const toggleAnalysisSchema = z.object({
  athleteId: z.string().uuid(),
  visible: z.boolean(),
});

const updateBackfillSchema = z.object({
  athleteId: z.string().uuid(),
  mode: z.enum(["current_week", "two_weeks", "unlimited"]),
});

const toggleOverrideSchema = z.object({
  categoryId: z.string().uuid(),
  isActive: z.boolean(),
});

const createCategorySchema = z.object({
  name: z.object({
    de: z.string().min(1).max(100),
    en: z.string().min(1).max(100),
  }),
  type: z.enum(["number", "scale", "text"]),
  unit: z.string().max(20).optional().nullable(),
  minValue: z.number().optional().nullable(),
  maxValue: z.number().optional().nullable(),
  scaleLabels: z.record(z.string(), z.object({ de: z.string(), en: z.string() })).optional().nullable(),
  isRequired: z.boolean().optional(),
  icon: z.string().max(50).optional().nullable(),
  targetAthleteId: z.string().uuid().optional().nullable(),
});

const updateCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.object({
    de: z.string().min(1).max(100),
    en: z.string().min(1).max(100),
  }).optional(),
  unit: z.string().max(20).optional().nullable(),
  minValue: z.number().optional().nullable(),
  maxValue: z.number().optional().nullable(),
  scaleLabels: z.record(z.string(), z.object({ de: z.string(), en: z.string() })).optional().nullable(),
  isRequired: z.boolean().optional(),
  icon: z.string().max(50).optional().nullable(),
  sortOrder: z.number().int().optional(),
});

const archiveCategorySchema = z.object({
  id: z.string().uuid(),
});

// ── Helper: Compute backfill minimum date ───────────────────────

type BackfillMode = "current_week" | "two_weeks" | "unlimited";

function computeBackfillMinDate(mode: BackfillMode): string {
  if (mode === "unlimited") {
    return "1970-01-01";
  }

  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  if (mode === "two_weeks") {
    // Monday of LAST week
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() - daysSinceMonday);
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);
    return lastMonday.toISOString().split("T")[0];
  }

  // "current_week" — Monday of THIS week
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysSinceMonday);
  return monday.toISOString().split("T")[0];
}

// ── Save Check-in ───────────────────────────────────────────────

export async function saveCheckin(
  date: string,
  values: Array<{ categoryId: string; numericValue?: number; textValue?: string }>
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // Validate input
  const parsed = saveCheckinSchema.safeParse({ date, values });
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  const { date: checkinDate, values: checkinValues } = parsed.data;

  // Check DSGVO consent for body_wellness_data
  const { data: consent } = await supabase
    .from("user_consents")
    .select("granted")
    .eq("user_id", user.id)
    .eq("consent_type", "body_wellness_data")
    .order("granted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!consent || !consent.granted) {
    return { success: false, error: "CONSENT_REQUIRED" };
  }

  // Check backfill limit: get the connection to find allowed backfill mode
  const today = new Date().toISOString().split("T")[0];
  if (checkinDate !== today) {
    // Get the athlete's trainer connection for backfill limit
    const { data: connection } = await supabase
      .from("trainer_athlete_connections")
      .select("feedback_backfill_mode")
      .eq("athlete_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    const backfillMode = (connection?.feedback_backfill_mode ?? "current_week") as BackfillMode;
    const minDateStr = computeBackfillMinDate(backfillMode);

    if (checkinDate < minDateStr) {
      return { success: false, error: "BACKFILL_LIMIT_EXCEEDED" };
    }

    // Cannot save future check-ins
    if (checkinDate > today) {
      return { success: false, error: "FUTURE_DATE" };
    }
  }

  // UPSERT checkin header
  const { data: checkin, error: checkinError } = await supabase
    .from("feedback_checkins")
    .upsert(
      {
        athlete_id: user.id,
        date: checkinDate,
      },
      { onConflict: "athlete_id,date" }
    )
    .select("id")
    .single();

  if (checkinError || !checkin) {
    console.error("Failed to upsert checkin:", checkinError);
    return { success: false, error: "CHECKIN_FAILED" };
  }

  // UPSERT all values
  const upsertValues = checkinValues.map((v) => ({
    checkin_id: checkin.id,
    category_id: v.categoryId,
    athlete_id: user.id,
    numeric_value: v.numericValue ?? null,
    text_value: v.textValue ?? null,
  }));

  const { error: valuesError } = await supabase
    .from("feedback_checkin_values")
    .upsert(upsertValues, { onConflict: "checkin_id,category_id" });

  if (valuesError) {
    console.error("Failed to upsert checkin values:", valuesError);
    return { success: false, error: "VALUES_FAILED" };
  }

  revalidatePath("/feedback");
  return { success: true };
}

// ── Autosave Single Check-in Field ──────────────────────────────

const autosaveFieldSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  categoryId: z.string().uuid(),
  numericValue: z.number().nullable(),
  textValue: z.string().max(300).nullable(),
});

export async function autosaveCheckinField(
  date: string,
  categoryId: string,
  numericValue: number | null,
  textValue: string | null
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // Validate input
  const parsed = autosaveFieldSchema.safeParse({
    date,
    categoryId,
    numericValue,
    textValue,
  });
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  const {
    date: checkinDate,
    categoryId: catId,
    numericValue: numVal,
    textValue: txtVal,
  } = parsed.data;

  // Check DSGVO consent for body_wellness_data
  const { data: consent, error: consentError } = await supabase
    .from("user_consents")
    .select("granted")
    .eq("user_id", user.id)
    .eq("consent_type", "body_wellness_data")
    .order("granted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (consentError) {
    console.error("[autosaveCheckinField] Consent query error:", consentError, "userId:", user.id);
  }

  if (!consent || !consent.granted) {
    console.error("[autosaveCheckinField] CONSENT_REQUIRED — userId:", user.id, "consent:", consent, "consentError:", consentError);
    return { success: false, error: "CONSENT_REQUIRED" };
  }

  // Check backfill limit
  const today = new Date().toISOString().split("T")[0];
  if (checkinDate !== today) {
    const { data: connection } = await supabase
      .from("trainer_athlete_connections")
      .select("feedback_backfill_mode")
      .eq("athlete_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    const backfillMode = (connection?.feedback_backfill_mode ?? "current_week") as BackfillMode;
    const minDateStr = computeBackfillMinDate(backfillMode);

    if (checkinDate < minDateStr) {
      console.error("[autosaveCheckinField] BACKFILL_LIMIT_EXCEEDED — checkinDate:", checkinDate, "minDate:", minDateStr, "today:", today);
      return { success: false, error: "BACKFILL_LIMIT_EXCEEDED" };
    }

    if (checkinDate > today) {
      console.error("[autosaveCheckinField] FUTURE_DATE — checkinDate:", checkinDate, "today:", today);
      return { success: false, error: "FUTURE_DATE" };
    }
  }

  // UPSERT checkin header
  const { data: checkin, error: checkinError } = await supabase
    .from("feedback_checkins")
    .upsert(
      {
        athlete_id: user.id,
        date: checkinDate,
      },
      { onConflict: "athlete_id,date" }
    )
    .select("id")
    .single();

  if (checkinError || !checkin) {
    console.error("[autosaveCheckinField] CHECKIN_FAILED — error:", checkinError, "userId:", user.id, "date:", checkinDate);
    return { success: false, error: "CHECKIN_FAILED" };
  }

  // UPSERT the single value
  const { error: valueError } = await supabase
    .from("feedback_checkin_values")
    .upsert(
      {
        checkin_id: checkin.id,
        category_id: catId,
        athlete_id: user.id,
        numeric_value: numVal,
        text_value: txtVal,
      },
      { onConflict: "checkin_id,category_id" }
    );

  if (valueError) {
    console.error("[autosaveCheckinField] VALUE_FAILED — error:", valueError, "checkinId:", checkin.id, "categoryId:", catId);
    return { success: false, error: "VALUE_FAILED" };
  }

  // No revalidatePath — autosave should be silent, no full page refresh
  return { success: true };
}

// ── Toggle Analysis Visibility ──────────────────────────────────

export async function toggleAnalysisVisibility(
  athleteId: string,
  visible: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // Validate input
  const parsed = toggleAnalysisSchema.safeParse({ athleteId, visible });
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  // Update the connection (RLS ensures only the trainer can update their own connections)
  const { error: updateError } = await supabase
    .from("trainer_athlete_connections")
    .update({ can_see_analysis: visible })
    .eq("trainer_id", user.id)
    .eq("athlete_id", athleteId)
    .eq("status", "active");

  if (updateError) {
    console.error("Failed to toggle analysis visibility:", updateError);
    return { success: false, error: "UPDATE_FAILED" };
  }

  revalidatePath("/feedback");
  return { success: true };
}

// ── Update Backfill Mode ────────────────────────────────────────

export async function updateBackfillMode(
  athleteId: string,
  mode: "current_week" | "two_weeks" | "unlimited"
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // Validate input
  const parsed = updateBackfillSchema.safeParse({ athleteId, mode });
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  // Update the connection (RLS ensures only the trainer can update their own connections)
  const { error: updateError } = await supabase
    .from("trainer_athlete_connections")
    .update({ feedback_backfill_mode: mode })
    .eq("trainer_id", user.id)
    .eq("athlete_id", athleteId)
    .eq("status", "active");

  if (updateError) {
    console.error("Failed to update backfill mode:", updateError);
    return { success: false, error: "UPDATE_FAILED" };
  }

  revalidatePath("/feedback");
  return { success: true };
}

// ── Load More Check-in History ──────────────────────────────────

export async function loadMoreCheckinHistory(
  athleteId: string,
  cursor: string,
  limit: number = 20
): Promise<{ entries: Array<{ id: string; date: string; values: Record<string, { numericValue: number | null; textValue: string | null }>; createdAt: string; updatedAt: string }>; hasMore: boolean }> {
  const { getCheckinHistory } = await import("@/lib/feedback/queries");
  return getCheckinHistory(athleteId, { cursor, limit });
}

// ── Toggle Category Override ────────────────────────────────────

export async function toggleCategoryOverride(
  categoryId: string,
  isActive: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // Validate input
  const parsed = toggleOverrideSchema.safeParse({ categoryId, isActive });
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  // UPSERT the override
  const { error: upsertError } = await supabase
    .from("feedback_category_overrides")
    .upsert(
      {
        user_id: user.id,
        category_id: categoryId,
        is_active: isActive,
      },
      { onConflict: "user_id,category_id" }
    );

  if (upsertError) {
    console.error("Failed to toggle category override:", upsertError);
    return { success: false, error: "UPSERT_FAILED" };
  }

  revalidatePath("/feedback");
  return { success: true };
}

// ── Create Category ─────────────────────────────────────────────

export async function createCategory(data: {
  name: { de: string; en: string };
  type: "number" | "scale" | "text";
  unit?: string | null;
  minValue?: number | null;
  maxValue?: number | null;
  scaleLabels?: Record<string, { de: string; en: string }> | null;
  isRequired?: boolean;
  icon?: string | null;
  targetAthleteId?: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // Validate input
  const parsed = createCategorySchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  const {
    name,
    type,
    unit,
    minValue,
    maxValue,
    scaleLabels,
    isRequired,
    icon,
    targetAthleteId,
  } = parsed.data;

  // Determine scope: trainer if targetAthleteId is set, otherwise athlete
  const scope = targetAthleteId ? "trainer" : "athlete";

  // If trainer scope, verify connection (also enforced by DB trigger)
  if (scope === "trainer" && targetAthleteId) {
    const { data: connection } = await supabase
      .from("trainer_athlete_connections")
      .select("id")
      .eq("trainer_id", user.id)
      .eq("athlete_id", targetAthleteId)
      .eq("status", "active")
      .maybeSingle();

    if (!connection) {
      return { success: false, error: "NOT_CONNECTED" };
    }
  }

  const { error: insertError } = await supabase
    .from("feedback_categories")
    .insert({
      name,
      type,
      unit: unit ?? null,
      min_value: minValue ?? null,
      max_value: maxValue ?? null,
      scale_labels: scaleLabels ?? null,
      is_required: isRequired ?? false,
      icon: icon ?? null,
      scope,
      created_by: user.id,
      target_athlete_id: targetAthleteId ?? null,
    });

  if (insertError) {
    console.error("Failed to create category:", insertError);
    return { success: false, error: "INSERT_FAILED" };
  }

  revalidatePath("/feedback");
  return { success: true };
}

// ── Update Category ─────────────────────────────────────────────

export async function updateCategory(data: {
  id: string;
  name?: { de: string; en: string };
  unit?: string | null;
  minValue?: number | null;
  maxValue?: number | null;
  scaleLabels?: Record<string, { de: string; en: string }> | null;
  isRequired?: boolean;
  icon?: string | null;
  sortOrder?: number;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // Validate input
  const parsed = updateCategorySchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  const { id, ...updates } = parsed.data;

  // Build update object with DB column names
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.unit !== undefined) dbUpdates.unit = updates.unit;
  if (updates.minValue !== undefined) dbUpdates.min_value = updates.minValue;
  if (updates.maxValue !== undefined) dbUpdates.max_value = updates.maxValue;
  if (updates.scaleLabels !== undefined) dbUpdates.scale_labels = updates.scaleLabels;
  if (updates.isRequired !== undefined) dbUpdates.is_required = updates.isRequired;
  if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
  if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;

  if (Object.keys(dbUpdates).length === 0) {
    return { success: false, error: "NO_CHANGES" };
  }

  // RLS ensures only own categories can be updated (scope != 'global')
  const { error: updateError } = await supabase
    .from("feedback_categories")
    .update(dbUpdates)
    .eq("id", id)
    .eq("created_by", user.id);

  if (updateError) {
    console.error("Failed to update category:", updateError);
    return { success: false, error: "UPDATE_FAILED" };
  }

  revalidatePath("/feedback");
  return { success: true };
}

// ── Load Week Check-ins (for WeekStrip navigation) ──────────

export async function loadWeekCheckins(
  startDate: string,
  endDate: string
): Promise<Record<string, { id: string; date: string; values: Record<string, { numericValue: number | null; textValue: string | null }>; createdAt: string; updatedAt: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {};
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    return {};
  }

  const { getCheckinsByDateRange } = await import("@/lib/feedback/queries");
  const checkinMap = await getCheckinsByDateRange(user.id, startDate, endDate);

  // Convert Map to plain object for serialization
  const result: Record<string, { id: string; date: string; values: Record<string, { numericValue: number | null; textValue: string | null }>; createdAt: string; updatedAt: string }> = {};
  for (const [date, entry] of checkinMap) {
    result[date] = entry;
  }

  return result;
}

// ── Archive Category (Soft Delete) ──────────────────────────────

export async function archiveCategory(
  id: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // Validate input
  const parsed = archiveCategorySchema.safeParse({ id });
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  // RLS ensures only own categories can be updated
  const { error: updateError } = await supabase
    .from("feedback_categories")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("created_by", user.id);

  if (updateError) {
    console.error("Failed to archive category:", updateError);
    return { success: false, error: "UPDATE_FAILED" };
  }

  revalidatePath("/feedback");
  return { success: true };
}
