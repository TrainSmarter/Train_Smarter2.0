"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { validateEmailPlausibility } from "@/lib/validation/email";

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

const connectionIdSchema = z.string().uuid();

const lookupEmailSchema = z.string().email().max(255);

// ── Constants ───────────────────────────────────────────────────

const MAX_INVITES_PER_DAY = 20;
const MAX_LOOKUPS_PER_MINUTE = 20;
const LOOKUP_WINDOW_MS = 60_000;
const LOOKUP_MIN_DELAY_MS = 150; // Constant-time floor to prevent timing attacks

// ── In-Memory Rate Limiter for Email Lookups (BUG-17) ───────────
// Resets on server restart — acceptable for rate limiting purposes.

const lookupTimestamps = new Map<string, number[]>();

function isLookupRateLimited(trainerId: string): boolean {
  const now = Date.now();
  const timestamps = lookupTimestamps.get(trainerId) ?? [];

  // Prune entries older than the window
  const recent = timestamps.filter((ts) => now - ts < LOOKUP_WINDOW_MS);

  if (recent.length >= MAX_LOOKUPS_PER_MINUTE) {
    lookupTimestamps.set(trainerId, recent);
    return true;
  }

  recent.push(now);
  lookupTimestamps.set(trainerId, recent);
  return false;
}

// ── Add Athlete (Blind-Invite: DSGVO-compliant unified flow) ────
// The client NEVER learns whether the email belongs to an existing account.
// Internally routes to inviteAthlete (new user) or sendConnectionRequest (existing).

export async function addAthlete(data: {
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

  // Only trainers can add athletes
  const roles = (user.app_metadata?.roles as string[]) ?? [];
  if (!roles.includes("TRAINER")) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const parsed = inviteSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  const normalizedEmail = parsed.data.email.toLowerCase().trim();

  // Self-invite check
  if (normalizedEmail === user.email?.toLowerCase()) {
    return { success: false, error: "SELF_INVITE" };
  }

  // Check if athlete account exists (server-side only — result NOT exposed to client)
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (profile && profile.role !== "TRAINER") {
    // Existing athlete → send connection request
    return sendConnectionRequest(data);
  }

  // No account or is a trainer → send normal invite
  // (IS_TRAINER error will be caught by inviteAthlete's own checks if needed,
  //  but we intentionally don't reveal account existence to the client)
  return inviteAthlete(data);
}

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

  // Only trainers can invite athletes
  const roles = (user.app_metadata?.roles as string[]) ?? [];
  if (!roles.includes("TRAINER")) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // Validate input
  const parsed = inviteSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  const { email, message } = parsed.data;

  // MX-Record plausibility check
  const emailCheck = await validateEmailPlausibility(email);
  if (!emailCheck.valid) {
    return { success: false, error: "EMAIL_DOMAIN_INVALID" };
  }

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

  // Send invitation email via Edge Function
  try {
    // Get trainer's display name
    const { data: trainerProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .single();

    const trainerName = trainerProfile
      ? `${trainerProfile.first_name ?? ""} ${trainerProfile.last_name ?? ""}`.trim()
      : user.email ?? "Trainer";

    // Determine locale from trainer's metadata
    const locale =
      (user.user_metadata?.locale as string) === "en" ? "en" : "de";
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.train-smarter.at";

    await supabase.functions.invoke("send-invitation-email", {
      body: {
        recipientEmail: email.toLowerCase(),
        trainerName,
        personalMessage: message || undefined,
        inviteLink: `${siteUrl}/${locale}/register`,
        expiresAt: expiresAt.toISOString(),
        locale,
      },
    });
  } catch (emailError) {
    // Email failure should NOT prevent the invitation from being created
    console.error("Failed to send invitation email:", emailError);
  }

  revalidatePath("/organisation/athletes", "page");
  return { success: true };
}

// ── Lookup Athlete by Email (for InviteModal auto-detection) ────

export interface LookupAthleteResult {
  exists: boolean;
  displayName?: string;
  avatarInitials?: string;
  error:
    | "SELF_INVITE"
    | "IS_TRAINER"
    | "ALREADY_CONNECTED"
    | "ALREADY_PENDING"
    | "ALREADY_HAS_OTHER_TRAINER"
    | null;
}

export async function lookupAthleteByEmail(
  email: string
): Promise<LookupAthleteResult> {
  const startTime = Date.now();

  // BUG-19: Zod validation on email input
  const emailParsed = lookupEmailSchema.safeParse(email);
  if (!emailParsed.success) {
    // Still enforce constant-time delay even for invalid input
    await enforceMinDelay(startTime);
    return { exists: false, error: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    await enforceMinDelay(startTime);
    return { exists: false, error: null };
  }

  // BUG-20: TRAINER role check
  const roles = (user.app_metadata?.roles as string[]) ?? [];
  if (!roles.includes("TRAINER")) {
    await enforceMinDelay(startTime);
    return { exists: false, error: null };
  }

  // BUG-17: Rate limiting — max lookups per minute per trainer
  if (isLookupRateLimited(user.id)) {
    await enforceMinDelay(startTime);
    return { exists: false, error: null };
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Self-invite check
  if (normalizedEmail === user.email?.toLowerCase()) {
    await enforceMinDelay(startTime);
    return { exists: false, error: "SELF_INVITE" };
  }

  // Look up profile by email
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (!profile) {
    // BUG-18: Still run the same number of queries to prevent timing attacks
    await supabase
      .from("trainer_athlete_connections")
      .select("id, status")
      .eq("trainer_id", user.id)
      .eq("athlete_email", normalizedEmail)
      .in("status", ["pending", "active"])
      .maybeSingle();

    await enforceMinDelay(startTime);
    return { exists: false, error: null };
  }

  // Check if the account is a trainer
  if (profile.role === "TRAINER") {
    await enforceMinDelay(startTime);
    return { exists: true, error: "IS_TRAINER" };
  }

  // Build display name: "Max M."
  const firstName = (profile.first_name as string) ?? "";
  const lastName = (profile.last_name as string) ?? "";
  const displayName = lastName
    ? `${firstName} ${lastName.charAt(0)}.`
    : firstName;
  const avatarInitials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  // Check if already connected to this trainer
  const { data: existingConnection } = await supabase
    .from("trainer_athlete_connections")
    .select("id, status")
    .eq("trainer_id", user.id)
    .eq("athlete_email", normalizedEmail)
    .in("status", ["pending", "active"])
    .maybeSingle();

  if (existingConnection?.status === "active") {
    await enforceMinDelay(startTime);
    return { exists: true, displayName, avatarInitials, error: "ALREADY_CONNECTED" };
  }

  if (existingConnection?.status === "pending") {
    await enforceMinDelay(startTime);
    return { exists: true, displayName, avatarInitials, error: "ALREADY_PENDING" };
  }

  // Check if athlete already has another active trainer (1-trainer rule)
  const { data: otherTrainer } = await supabase
    .from("trainer_athlete_connections")
    .select("id")
    .eq("athlete_id", profile.id)
    .eq("status", "active")
    .neq("trainer_id", user.id)
    .maybeSingle();

  if (otherTrainer) {
    await enforceMinDelay(startTime);
    return { exists: true, displayName, avatarInitials, error: "ALREADY_HAS_OTHER_TRAINER" };
  }

  await enforceMinDelay(startTime);
  return { exists: true, displayName, avatarInitials, error: null };
}

// BUG-18: Constant-time floor to prevent timing attacks on email lookups
async function enforceMinDelay(startTime: number): Promise<void> {
  const elapsed = Date.now() - startTime;
  const remaining = LOOKUP_MIN_DELAY_MS - elapsed;
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }
}

// ── Send Connection Request (existing athlete) ─────────────────

const connectionRequestSchema = z.object({
  email: z.string().email().max(255),
  message: z.string().max(500).optional(),
});

export async function sendConnectionRequest(data: {
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

  // BUG-20: TRAINER role check
  const roles = (user.app_metadata?.roles as string[]) ?? [];
  if (!roles.includes("TRAINER")) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const parsed = connectionRequestSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  const { email, message } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  // Self-invite check
  if (normalizedEmail === user.email?.toLowerCase()) {
    return { success: false, error: "SELF_INVITE" };
  }

  // Rate limit check (shared with invites)
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

  // Look up athlete profile (include locale for email language — W5)
  const { data: athleteProfile } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role, locale")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (!athleteProfile) {
    return { success: false, error: "ACCOUNT_NOT_FOUND" };
  }

  if (athleteProfile.role === "TRAINER") {
    return { success: false, error: "IS_TRAINER" };
  }

  // Check if already connected or pending
  const { data: existing } = await supabase
    .from("trainer_athlete_connections")
    .select("id, status")
    .eq("trainer_id", user.id)
    .eq("athlete_email", normalizedEmail)
    .in("status", ["pending", "active"])
    .maybeSingle();

  if (existing?.status === "active") {
    return { success: false, error: "ALREADY_CONNECTED" };
  }

  if (existing?.status === "pending") {
    return { success: false, error: "ALREADY_PENDING" };
  }

  // Check 1-trainer rule
  const { data: otherTrainer } = await supabase
    .from("trainer_athlete_connections")
    .select("id")
    .eq("athlete_id", athleteProfile.id)
    .eq("status", "active")
    .neq("trainer_id", user.id)
    .maybeSingle();

  if (otherTrainer) {
    return { success: false, error: "ALREADY_HAS_OTHER_TRAINER" };
  }

  // Create connection request (athlete_id set directly, no expiry for requests)
  const { error: insertError } = await supabase
    .from("trainer_athlete_connections")
    .insert({
      trainer_id: user.id,
      athlete_id: athleteProfile.id,
      athlete_email: normalizedEmail,
      status: "pending",
      connection_type: "request",
      invited_at: new Date().toISOString(),
      invitation_message: message || null,
      // No expiry for connection requests (only invites expire)
      invitation_expires_at: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      ).toISOString(),
    });

  if (insertError) {
    console.error("Failed to create connection request:", insertError);
    return { success: false, error: "INSERT_FAILED" };
  }

  // Send connection request email via Edge Function
  try {
    const { data: trainerProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .single();

    const trainerName = trainerProfile
      ? `${trainerProfile.first_name ?? ""} ${trainerProfile.last_name ?? ""}`.trim()
      : user.email ?? "Trainer";

    // W5: Use athlete's locale preference, not trainer's
    const locale =
      (athleteProfile.locale as string) === "en" ? "en" : "de";
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.train-smarter.at";

    await supabase.functions.invoke("send-connection-request-email", {
      body: {
        recipientEmail: normalizedEmail,
        trainerName,
        personalMessage: message || undefined,
        dashboardLink: `${siteUrl}/${locale}/dashboard`,
        locale,
      },
    });
  } catch (emailError) {
    // Email failure should NOT prevent the request from being created
    console.error("Failed to send connection request email:", emailError);
  }

  revalidatePath("/organisation/athletes", "page");
  return { success: true };
}

// ── Accept Invitation ───────────────────────────────────────────

export async function acceptInvitation(
  connectionId: string
): Promise<{ success: boolean; error?: string }> {
  // Validate input
  const parsed = connectionIdSchema.safeParse(connectionId);
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

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
    .select("id, trainer_id, athlete_email, status")
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

  // PROJ-18: Copy trainer's default category settings to the new athlete
  if (connection.trainer_id) {
    const { error: copyError } = await supabase.rpc("copy_trainer_defaults_to_athlete", {
      p_trainer_id: connection.trainer_id,
      p_athlete_id: user.id,
    });

    if (copyError) {
      // Non-blocking: defaults copy failure should not prevent connection acceptance
      console.error("Failed to copy trainer defaults to athlete:", copyError);
    }
  }

  revalidatePath("/", "layout");
  return { success: true };
}

// ── Reject Invitation ───────────────────────────────────────────

export async function rejectInvitation(
  connectionId: string
): Promise<{ success: boolean; error?: string }> {
  // Validate input
  const parsed = connectionIdSchema.safeParse(connectionId);
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

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
  // Validate input
  const parsed = connectionIdSchema.safeParse(connectionId);
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

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

// ── Withdraw Invitation ─────────────────────────────────────────

export async function withdrawInvitation(
  connectionId: string
): Promise<{ success: boolean; error?: string }> {
  // Validate input
  const parsed = connectionIdSchema.safeParse(connectionId);
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // Verify: only the trainer who sent the invitation can withdraw it
  const { data: connection } = await supabase
    .from("trainer_athlete_connections")
    .select("id, trainer_id, status")
    .eq("id", connectionId)
    .single();

  if (!connection) {
    return { success: false, error: "NOT_FOUND" };
  }

  if (connection.trainer_id !== user.id) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // Only pending invitations can be withdrawn
  if (connection.status !== "pending") {
    return { success: false, error: "NOT_PENDING" };
  }

  // Hard delete from trainer_athlete_connections
  const { error: deleteError } = await supabase
    .from("trainer_athlete_connections")
    .delete()
    .eq("id", connectionId)
    .eq("trainer_id", user.id)
    .eq("status", "pending");

  if (deleteError) {
    console.error("Failed to withdraw invitation:", deleteError);
    return { success: false, error: "DELETE_FAILED" };
  }

  revalidatePath("/organisation");
  return { success: true };
}

// ── Resend Invitation ───────────────────────────────────────────

export async function resendInvitation(
  connectionId: string
): Promise<{ success: boolean; error?: string }> {
  // Validate input
  const parsed = connectionIdSchema.safeParse(connectionId);
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

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
    .select("invited_at, athlete_email, invitation_message")
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

  // Re-send invitation email via Edge Function
  try {
    const { data: trainerProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .single();

    const trainerName = trainerProfile
      ? `${trainerProfile.first_name ?? ""} ${trainerProfile.last_name ?? ""}`.trim()
      : user.email ?? "Trainer";

    const locale =
      (user.user_metadata?.locale as string) === "en" ? "en" : "de";
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.train-smarter.at";

    await supabase.functions.invoke("send-invitation-email", {
      body: {
        recipientEmail: connection.athlete_email,
        trainerName,
        personalMessage: connection.invitation_message || undefined,
        inviteLink: `${siteUrl}/${locale}/register`,
        expiresAt: expiresAt.toISOString(),
        locale,
      },
    });
  } catch (emailError) {
    console.error("Failed to send invitation email:", emailError);
  }

  revalidatePath("/organisation/athletes", "page");
  return { success: true };
}
