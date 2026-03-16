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
  days: z.number().int().min(1).max(14),
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

  // Check backfill limit: get the connection to find allowed backfill days
  const today = new Date().toISOString().split("T")[0];
  if (checkinDate !== today) {
    // Get the athlete's trainer connection for backfill limit
    const { data: connection } = await supabase
      .from("trainer_athlete_connections")
      .select("feedback_backfill_days")
      .eq("athlete_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    const backfillDays = connection?.feedback_backfill_days ?? 3;

    // Check if the date is within the allowed backfill window
    const minDate = new Date();
    minDate.setDate(minDate.getDate() - backfillDays);
    const minDateStr = minDate.toISOString().split("T")[0];

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

// ── Update Backfill Days ────────────────────────────────────────

export async function updateBackfillDays(
  athleteId: string,
  days: number
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
  const parsed = updateBackfillSchema.safeParse({ athleteId, days });
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  // Update the connection (RLS ensures only the trainer can update their own connections)
  const { error: updateError } = await supabase
    .from("trainer_athlete_connections")
    .update({ feedback_backfill_days: days })
    .eq("trainer_id", user.id)
    .eq("athlete_id", athleteId)
    .eq("status", "active");

  if (updateError) {
    console.error("Failed to update backfill days:", updateError);
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
