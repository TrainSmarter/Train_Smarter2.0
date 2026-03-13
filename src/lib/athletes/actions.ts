"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * Server Actions for Athlete Management — PROJ-5
 *
 * Pattern: authenticate -> validate -> authorize -> mutate -> revalidate -> return result
 */

// ── Validation Schemas ──────────────────────────────────────────

const inviteSchema = z.object({
  email: z.string().email().max(255),
  message: z.string().max(500).optional(),
});

// ── Constants ───────────────────────────────────────────────────

const MAX_INVITES_PER_DAY = 20;

// ── Invite Athlete ──────────────────────────────────────────────

export async function inviteAthlete(data: {
  email: string;
  message?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // Validate input
  const parsed = inviteSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  const { email, message } = parsed.data;

  // Cannot invite yourself
  if (email.toLowerCase() === user.email?.toLowerCase()) {
    return { success: false, error: "SELF_INVITE" };
  }

  // BUG-10: Rate limit — max invitations per day
  const dayAgo = new Date();
  dayAgo.setHours(dayAgo.getHours() - 24);

  const { count: recentCount } = await supabase
    .from("trainer_athlete_connections")
    .select("id", { count: "exact", head: true })
    .eq("trainer_id", user.id)
    .gte("invited_at", dayAgo.toISOString());

  if ((recentCount ?? 0) >= MAX_INVITES_PER_DAY) {
    return { success: false, error: "RATE_LIMITED" };
  }

  // Check if athlete already connected
  const { data: existing } = await supabase
    .from("trainer_athlete_connections")
    .select("id, status")
    .eq("trainer_id", user.id)
    .eq("athlete_email", email.toLowerCase())
    .in("status", ["pending", "active"])
    .maybeSingle();

  if (existing?.status === "active") {
    return { success: false, error: "ALREADY_CONNECTED" };
  }

  if (existing?.status === "pending") {
    return { success: false, error: "ALREADY_PENDING" };
  }

  // Create invitation
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { error: insertError } = await supabase
    .from("trainer_athlete_connections")
    .insert({
      trainer_id: user.id,
      athlete_email: email.toLowerCase(),
      status: "pending",
      invited_at: new Date().toISOString(),
      invitation_message: message || null,
      invitation_expires_at: expiresAt.toISOString(),
    });

  if (insertError) {
    console.error("Failed to create invitation:", insertError);
    return { success: false, error: "INSERT_FAILED" };
  }

  revalidatePath("/organisation/athletes", "page");
  return { success: true };
}

// ── Accept Invitation ───────────────────────────────────────────

export async function acceptInvitation(
  connectionId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // BUG-6: Application-level authorization — verify invitation belongs to this user
  const { data: connection } = await supabase
    .from("trainer_athlete_connections")
    .select("id, athlete_email, status")
    .eq("id", connectionId)
    .eq("status", "pending")
    .single();

  if (!connection) {
    return { success: false, error: "NOT_FOUND" };
  }

  if (connection.athlete_email !== user.email?.toLowerCase()) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // BUG-4: Check if athlete already has an active trainer
  const { data: existingActive } = await supabase
    .from("trainer_athlete_connections")
    .select("id")
    .eq("athlete_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (existingActive) {
    return { success: false, error: "ALREADY_HAS_TRAINER" };
  }

  const { error: updateError } = await supabase
    .from("trainer_athlete_connections")
    .update({
      athlete_id: user.id,
      status: "active",
      connected_at: new Date().toISOString(),
    })
    .eq("id", connectionId)
    .eq("status", "pending");

  if (updateError) {
    console.error("Failed to accept invitation:", updateError);
    return { success: false, error: "UPDATE_FAILED" };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

// ── Reject Invitation ───────────────────────────────────────────

export async function rejectInvitation(
  connectionId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // BUG-7: Application-level authorization — verify invitation belongs to this user
  const { data: connection } = await supabase
    .from("trainer_athlete_connections")
    .select("id, athlete_email, status")
    .eq("id", connectionId)
    .eq("status", "pending")
    .single();

  if (!connection) {
    return { success: false, error: "NOT_FOUND" };
  }

  if (connection.athlete_email !== user.email?.toLowerCase()) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const { error: updateError } = await supabase
    .from("trainer_athlete_connections")
    .update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
    })
    .eq("id", connectionId)
    .eq("status", "pending");

  if (updateError) {
    console.error("Failed to reject invitation:", updateError);
    return { success: false, error: "UPDATE_FAILED" };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

// ── Disconnect (Trainer removes Athlete OR Athlete leaves) ──────

export async function disconnectAthlete(
  connectionId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // BUG-8: Application-level authorization — verify user is part of this connection
  const { data: connection } = await supabase
    .from("trainer_athlete_connections")
    .select("id, trainer_id, athlete_id, status")
    .eq("id", connectionId)
    .eq("status", "active")
    .single();

  if (!connection) {
    return { success: false, error: "NOT_FOUND" };
  }

  if (connection.trainer_id !== user.id && connection.athlete_id !== user.id) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const { error: updateError } = await supabase
    .from("trainer_athlete_connections")
    .update({
      status: "disconnected",
      disconnected_at: new Date().toISOString(),
    })
    .eq("id", connectionId)
    .eq("status", "active");

  if (updateError) {
    console.error("Failed to disconnect:", updateError);
    return { success: false, error: "UPDATE_FAILED" };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

// ── Resend Invitation ───────────────────────────────────────────

export async function resendInvitation(
  connectionId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // Check last invite time (rate limit: 1x per 24h)
  const { data: connection } = await supabase
    .from("trainer_athlete_connections")
    .select("invited_at")
    .eq("id", connectionId)
    .eq("trainer_id", user.id)
    .eq("status", "pending")
    .single();

  if (!connection) {
    return { success: false, error: "NOT_FOUND" };
  }

  const lastInvite = new Date(connection.invited_at);
  const dayAgo = new Date();
  dayAgo.setHours(dayAgo.getHours() - 24);

  if (lastInvite > dayAgo) {
    return { success: false, error: "RATE_LIMITED" };
  }

  // Update invitation timestamps
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { error: updateError } = await supabase
    .from("trainer_athlete_connections")
    .update({
      invited_at: new Date().toISOString(),
      invitation_expires_at: expiresAt.toISOString(),
    })
    .eq("id", connectionId)
    .eq("trainer_id", user.id);

  if (updateError) {
    console.error("Failed to resend invitation:", updateError);
    return { success: false, error: "UPDATE_FAILED" };
  }

  revalidatePath("/organisation/athletes", "page");
  return { success: true };
}
