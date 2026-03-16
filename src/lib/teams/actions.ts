"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateEmailPlausibility } from "@/lib/validation/email";
import {
  createTeamSchema,
  updateTeamSchema,
  inviteTrainerSchema,
  assignAthletesSchema,
  archiveTeamSchema,
  removeAthleteFromTeamSchema,
  removeTrainerFromTeamSchema,
} from "@/lib/validations/teams";

/**
 * Server Actions for Team Management — PROJ-9
 *
 * Pattern: authenticate -> validate -> authorize -> mutate -> revalidate -> return result
 */

// ── Constants ───────────────────────────────────────────────────

const MAX_TEAM_INVITES_PER_DAY = 20;

// ── Helper: check team membership ───────────────────────────────

async function assertTeamMember(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  teamId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("team_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .maybeSingle();

  return !!data;
}

// ── Move Athlete to Team (Drag & Drop) ──────────────────────────

/**
 * Moves an athlete to a new team (or removes from team if targetTeamId is null).
 * Used by the Unified View's Drag & Drop.
 */
export async function moveAthleteToTeam(data: {
  athleteId: string;
  targetTeamId: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // Role check: only trainers can move athletes
  const roles = (user.app_metadata?.roles as string[]) ?? [];
  if (!roles.includes("TRAINER")) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const { athleteId, targetTeamId } = data;

  // Validate UUIDs
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(athleteId)) {
    return { success: false, error: "INVALID_INPUT" };
  }
  if (targetTeamId !== null && !uuidRegex.test(targetTeamId)) {
    return { success: false, error: "INVALID_INPUT" };
  }

  // Verify PROJ-5 connection: user must have an active trainer-athlete connection
  const { data: connection } = await supabase
    .from("trainer_athlete_connections")
    .select("id")
    .eq("trainer_id", user.id)
    .eq("athlete_id", athleteId)
    .eq("status", "active")
    .maybeSingle();

  if (!connection) {
    return { success: false, error: "INVALID_ATHLETES" };
  }

  // If target team specified, verify membership
  if (targetTeamId) {
    const isMember = await assertTeamMember(supabase, user.id, targetTeamId);
    if (!isMember) {
      return { success: false, error: "UNAUTHORIZED" };
    }
  }

  // Remove existing team assignment (if any)
  const { error: deleteError } = await supabase
    .from("team_athletes")
    .delete()
    .eq("athlete_id", athleteId);

  if (deleteError) {
    console.error("Failed to remove old team assignment:", deleteError);
    return { success: false, error: "DELETE_FAILED" };
  }

  // If moving to a new team (not "unassigned"), create new assignment
  if (targetTeamId) {
    const { error: insertError } = await supabase
      .from("team_athletes")
      .insert({
        team_id: targetTeamId,
        athlete_id: athleteId,
        assigned_by: user.id,
      });

    if (insertError) {
      console.error("Failed to assign athlete to team:", insertError);
      return { success: false, error: "INSERT_FAILED" };
    }
  }

  revalidatePath("/organisation", "page");
  return { success: true };
}

// ── Create Team ─────────────────────────────────────────────────

export async function createTeam(data: {
  name: string;
  description?: string;
}): Promise<{ success: boolean; teamId?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const parsed = createTeamSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  const { name, description } = parsed.data;

  // Create the team
  const { data: team, error: insertError } = await supabase
    .from("teams")
    .insert({
      name,
      description: description || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (insertError || !team) {
    console.error("Failed to create team:", insertError);
    return { success: false, error: "INSERT_FAILED" };
  }

  // Add creator as first team member
  const { error: memberError } = await supabase
    .from("team_members")
    .insert({
      team_id: team.id,
      user_id: user.id,
    });

  if (memberError) {
    console.error("Failed to add creator as member:", memberError);
    // Clean up: delete the team if member insert fails
    await supabase.from("teams").delete().eq("id", team.id);
    return { success: false, error: "INSERT_FAILED" };
  }

  revalidatePath("/organisation", "page");
  return { success: true, teamId: team.id };
}

// ── Update Team ─────────────────────────────────────────────────

export async function updateTeam(data: {
  teamId: string;
  name: string;
  description?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const parsed = updateTeamSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  const { teamId, name, description } = parsed.data;

  // Authorize: must be team member
  const isMember = await assertTeamMember(supabase, user.id, teamId);
  if (!isMember) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const { error: updateError } = await supabase
    .from("teams")
    .update({
      name,
      description: description || null,
    })
    .eq("id", teamId);

  if (updateError) {
    console.error("Failed to update team:", updateError);
    return { success: false, error: "UPDATE_FAILED" };
  }

  revalidatePath("/organisation", "page");
  revalidatePath(`/organisation/teams/${teamId}`, "page");
  return { success: true };
}

// ── Archive Team ────────────────────────────────────────────────

export async function archiveTeam(data: {
  teamId: string;
  confirmName: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const parsed = archiveTeamSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  const { teamId, confirmName } = parsed.data;

  // Authorize: must be team member
  const isMember = await assertTeamMember(supabase, user.id, teamId);
  if (!isMember) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // Verify confirmation name matches
  const { data: team } = await supabase
    .from("teams")
    .select("name")
    .eq("id", teamId)
    .single();

  if (!team || team.name !== confirmName) {
    return { success: false, error: "NAME_MISMATCH" };
  }

  const { error: updateError } = await supabase
    .from("teams")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", teamId);

  if (updateError) {
    console.error("Failed to archive team:", updateError);
    return { success: false, error: "UPDATE_FAILED" };
  }

  revalidatePath("/organisation", "page");
  return { success: true };
}

// ── Invite Trainer ──────────────────────────────────────────────

export async function inviteTrainer(data: {
  teamId: string;
  email: string;
  message?: string;
}): Promise<{ success: boolean; token?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const parsed = inviteTrainerSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  const { teamId, email, message } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  // MX-Record plausibility check
  const emailCheck = await validateEmailPlausibility(normalizedEmail);
  if (!emailCheck.valid) {
    return { success: false, error: "EMAIL_DOMAIN_INVALID" };
  }

  // Cannot invite yourself
  if (normalizedEmail === user.email?.toLowerCase()) {
    return { success: false, error: "SELF_INVITE" };
  }

  // Authorize: must be team member
  const isMember = await assertTeamMember(supabase, user.id, teamId);
  if (!isMember) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // Check if trainer is already a member (lookup profile by email, then check membership)
  const { data: profileByEmail } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (profileByEmail) {
    const { data: alreadyMember } = await supabase
      .from("team_members")
      .select("id")
      .eq("team_id", teamId)
      .eq("user_id", profileByEmail.id)
      .maybeSingle();

    if (alreadyMember) {
      return { success: false, error: "ALREADY_MEMBER" };
    }
  }

  // Check if already invited (pending)
  const { data: existingInvite } = await supabase
    .from("team_invitations")
    .select("id")
    .eq("team_id", teamId)
    .eq("email", normalizedEmail)
    .eq("status", "pending")
    .maybeSingle();

  if (existingInvite) {
    return { success: false, error: "ALREADY_INVITED" };
  }

  // Rate limit: max invitations per day per user
  const dayAgo = new Date();
  dayAgo.setHours(dayAgo.getHours() - 24);

  const { count: recentCount } = await supabase
    .from("team_invitations")
    .select("id", { count: "exact", head: true })
    .eq("invited_by", user.id)
    .gte("created_at", dayAgo.toISOString());

  if ((recentCount ?? 0) >= MAX_TEAM_INVITES_PER_DAY) {
    return { success: false, error: "RATE_LIMITED" };
  }

  // Create invitation (token is auto-generated by DB default)
  const { data: invitation, error: insertError } = await supabase
    .from("team_invitations")
    .insert({
      team_id: teamId,
      email: normalizedEmail,
      personal_message: message || null,
      invited_by: user.id,
    })
    .select("token")
    .single();

  if (insertError || !invitation) {
    console.error("Failed to create team invitation:", insertError);
    return { success: false, error: "INSERT_FAILED" };
  }

  // TODO (PROJ-13): Send invitation email automatically once email infrastructure is ready.
  // Until then, the frontend shows a copyable invite link.

  revalidatePath(`/organisation/teams/${teamId}`, "page");
  return { success: true, token: invitation.token };
}

// ── Accept Team Invitation ──────────────────────────────────────

export async function acceptTeamInvitation(
  invitationId: string
): Promise<{ success: boolean; teamId?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // Fetch and verify invitation
  const { data: invitation } = await supabase
    .from("team_invitations")
    .select("id, team_id, email, status, expires_at")
    .eq("id", invitationId)
    .eq("status", "pending")
    .single();

  if (!invitation) {
    return { success: false, error: "NOT_FOUND" };
  }

  // Verify this invitation is for the current user
  if (invitation.email !== user.email?.toLowerCase()) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // Check if expired
  if (new Date(invitation.expires_at) < new Date()) {
    return { success: false, error: "EXPIRED" };
  }

  // Upsert team member — handles race condition where two concurrent requests
  // could both pass the existence check. ON CONFLICT DO NOTHING is safe.
  const { error: memberError } = await supabase
    .from("team_members")
    .upsert(
      { team_id: invitation.team_id, user_id: user.id },
      { onConflict: "team_id,user_id", ignoreDuplicates: true }
    );

  if (memberError) {
    console.error("Failed to add team member:", memberError);
    return { success: false, error: "INSERT_FAILED" };
  }

  // Only mark invitation as accepted AFTER membership is confirmed
  const { error: acceptError } = await supabase
    .from("team_invitations")
    .update({ status: "accepted" })
    .eq("id", invitationId);

  if (acceptError) {
    console.error("Failed to mark invitation as accepted:", acceptError);
    // Non-fatal: membership was already added
  }

  revalidatePath("/", "layout");
  return { success: true, teamId: invitation.team_id };
}

// ── Decline Team Invitation ─────────────────────────────────────

export async function declineTeamInvitation(
  invitationId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const { data: invitation } = await supabase
    .from("team_invitations")
    .select("id, email, status")
    .eq("id", invitationId)
    .eq("status", "pending")
    .single();

  if (!invitation) {
    return { success: false, error: "NOT_FOUND" };
  }

  if (invitation.email !== user.email?.toLowerCase()) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const { error: updateError } = await supabase
    .from("team_invitations")
    .update({ status: "declined" })
    .eq("id", invitationId);

  if (updateError) {
    console.error("Failed to decline team invitation:", updateError);
    return { success: false, error: "UPDATE_FAILED" };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

// ── Assign Athletes to Team ─────────────────────────────────────

export async function assignAthletes(data: {
  teamId: string;
  athleteIds: string[];
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const parsed = assignAthletesSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  const { teamId, athleteIds } = parsed.data;

  // Authorize: must be team member
  const isMember = await assertTeamMember(supabase, user.id, teamId);
  if (!isMember) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // Get current assignments for this team by this trainer
  const { data: currentAssignments } = await supabase
    .from("team_athletes")
    .select("athlete_id")
    .eq("team_id", teamId)
    .eq("assigned_by", user.id);

  const currentIds = new Set(
    (currentAssignments ?? []).map((a) => a.athlete_id)
  );
  const newIds = new Set(athleteIds);

  // Athletes to add (in new list but not in current)
  const toAdd = athleteIds.filter((id) => !currentIds.has(id));

  // Athletes to remove (in current but not in new list)
  const toRemove = [...currentIds].filter((id) => !newIds.has(id));

  // Verify all athletes to add have active PROJ-5 connections
  if (toAdd.length > 0) {
    const { data: validConnections } = await supabase
      .from("trainer_athlete_connections")
      .select("athlete_id")
      .eq("trainer_id", user.id)
      .eq("status", "active")
      .in("athlete_id", toAdd);

    const validIds = new Set(
      (validConnections ?? []).map((c) => c.athlete_id)
    );

    const invalidIds = toAdd.filter((id) => !validIds.has(id));
    if (invalidIds.length > 0) {
      return { success: false, error: "INVALID_ATHLETES" };
    }

    // "Ein Athlet = Ein Team": remove any existing team assignment before
    // inserting the new one. The UNIQUE(athlete_id) constraint enforces
    // that each athlete can only belong to one team at a time.
    const { error: cleanupError } = await supabase
      .from("team_athletes")
      .delete()
      .in("athlete_id", toAdd);

    if (cleanupError) {
      console.error("Failed to remove old team assignments:", cleanupError);
      return { success: false, error: "DELETE_FAILED" };
    }

    // Insert new assignments
    const { error: insertError } = await supabase
      .from("team_athletes")
      .insert(
        toAdd.map((athleteId) => ({
          team_id: teamId,
          athlete_id: athleteId,
          assigned_by: user.id,
        }))
      );

    if (insertError) {
      console.error("Failed to assign athletes:", insertError);
      return { success: false, error: "INSERT_FAILED" };
    }
  }

  // Remove unselected athletes (only those assigned by this trainer)
  if (toRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from("team_athletes")
      .delete()
      .eq("team_id", teamId)
      .eq("assigned_by", user.id)
      .in("athlete_id", toRemove);

    if (deleteError) {
      console.error("Failed to remove athletes:", deleteError);
      return { success: false, error: "DELETE_FAILED" };
    }
  }

  revalidatePath(`/organisation/teams/${teamId}`, "page");
  return { success: true };
}

// ── Remove Athlete from Team ────────────────────────────────────

export async function removeAthleteFromTeam(data: {
  teamId: string;
  athleteId: string;
  disconnectFromProj5?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const parsed = removeAthleteFromTeamSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  const { teamId, athleteId, disconnectFromProj5 } = parsed.data;

  // Authorize: must be team member
  const isMember = await assertTeamMember(supabase, user.id, teamId);
  if (!isMember) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // Remove from team
  const { error: deleteError } = await supabase
    .from("team_athletes")
    .delete()
    .eq("team_id", teamId)
    .eq("athlete_id", athleteId);

  if (deleteError) {
    console.error("Failed to remove athlete from team:", deleteError);
    return { success: false, error: "DELETE_FAILED" };
  }

  // Optionally disconnect PROJ-5 connection
  if (disconnectFromProj5) {
    const { error: disconnectError } = await supabase
      .from("trainer_athlete_connections")
      .update({
        status: "disconnected",
        disconnected_at: new Date().toISOString(),
      })
      .eq("trainer_id", user.id)
      .eq("athlete_id", athleteId)
      .eq("status", "active");

    if (disconnectError) {
      console.error("Failed to disconnect PROJ-5 connection:", disconnectError);
      // Non-fatal: team removal succeeded
    }
  }

  revalidatePath(`/organisation/teams/${teamId}`, "page");
  revalidatePath("/organisation", "page");
  return { success: true };
}

// ── Remove Trainer from Team ────────────────────────────────────

export async function removeTrainerFromTeam(data: {
  teamId: string;
  userId: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const parsed = removeTrainerFromTeamSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  const { teamId, userId: targetUserId } = parsed.data;

  // Authorize: must be team member to remove others, or self to leave
  const isMember = await assertTeamMember(supabase, user.id, teamId);
  const isSelfLeave = user.id === targetUserId;

  if (!isMember) {
    // Non-members cannot do anything — even self-leave requires actual membership
    return { success: false, error: "UNAUTHORIZED" };
  }

  if (!isSelfLeave && !isMember) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const { error: deleteError } = await supabase
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("user_id", targetUserId);

  if (deleteError) {
    console.error("Failed to remove trainer from team:", deleteError);
    return { success: false, error: "DELETE_FAILED" };
  }

  // DB trigger handle_last_trainer_leaves will auto-archive if last trainer

  revalidatePath(`/organisation/teams/${teamId}`, "page");
  revalidatePath("/organisation", "page");
  return { success: true };
}

// ── Leave Team (self) ───────────────────────────────────────────

export async function leaveTeam(
  teamId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  return removeTrainerFromTeam({ teamId, userId: user.id });
}

// ── Cancel Invitation ───────────────────────────────────────────

export async function cancelTeamInvitation(data: {
  teamId: string;
  invitationId: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const { teamId, invitationId } = data;

  // Authorize: must be team member
  const isMember = await assertTeamMember(supabase, user.id, teamId);
  if (!isMember) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const { error: deleteError } = await supabase
    .from("team_invitations")
    .delete()
    .eq("id", invitationId)
    .eq("team_id", teamId);

  if (deleteError) {
    console.error("Failed to cancel invitation:", deleteError);
    return { success: false, error: "DELETE_FAILED" };
  }

  revalidatePath(`/organisation/teams/${teamId}`, "page");
  return { success: true };
}
