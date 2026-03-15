import { createClient } from "@/lib/supabase/server";
import type {
  TeamListItem,
  TeamDetail,
  TeamMember,
  TeamAthlete,
  TeamInvitation,
  AthleteTeamInfo,
  AssignableAthlete,
} from "./types";

/**
 * Data queries for Team Management — PROJ-9
 *
 * All queries use the server-side Supabase client (RLS enforced).
 */

// ── Fetch Teams for Trainer ─────────────────────────────────────

export async function fetchTeams(): Promise<TeamListItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Get team IDs where user is a member
  const { data: memberships, error: memberError } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id);

  if (memberError || !memberships?.length) return [];

  const teamIds = memberships.map((m) => m.team_id);

  // Get teams (non-archived)
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, name, description, logo_url, created_at")
    .in("id", teamIds)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (teamsError || !teams) return [];

  // Get member counts per team
  const { data: memberCounts } = await supabase
    .from("team_members")
    .select("team_id")
    .in("team_id", teamIds);

  // Get athlete counts per team
  const { data: athleteCounts } = await supabase
    .from("team_athletes")
    .select("team_id")
    .in("team_id", teamIds);

  // Count per team
  const trainerCountMap = new Map<string, number>();
  const athleteCountMap = new Map<string, number>();

  (memberCounts ?? []).forEach((m) => {
    trainerCountMap.set(m.team_id, (trainerCountMap.get(m.team_id) ?? 0) + 1);
  });

  (athleteCounts ?? []).forEach((a) => {
    athleteCountMap.set(a.team_id, (athleteCountMap.get(a.team_id) ?? 0) + 1);
  });

  return teams.map((team) => ({
    id: team.id,
    name: team.name,
    description: team.description,
    logoUrl: team.logo_url,
    trainerCount: trainerCountMap.get(team.id) ?? 0,
    athleteCount: athleteCountMap.get(team.id) ?? 0,
    createdAt: team.created_at,
  }));
}

// ── Fetch Single Team Detail ────────────────────────────────────

export async function fetchTeamDetail(
  teamId: string
): Promise<TeamDetail | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("teams")
    .select("id, name, description, logo_url, created_by, archived_at, created_at")
    .eq("id", teamId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    logoUrl: data.logo_url,
    createdBy: data.created_by,
    archivedAt: data.archived_at,
    createdAt: data.created_at,
  };
}

// ── Fetch Team Members (Trainers) ───────────────────────────────

export async function fetchTeamMembers(
  teamId: string
): Promise<TeamMember[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("team_members")
    .select(
      `
      id,
      user_id,
      joined_at,
      profile:profiles!team_members_user_id_fkey (
        id,
        first_name,
        last_name,
        email,
        avatar_url
      )
    `
    )
    .eq("team_id", teamId)
    .order("joined_at", { ascending: true });

  if (error || !data) return [];

  // Count how many athletes each trainer has assigned in this team
  const { data: athleteAssignments } = await supabase
    .from("team_athletes")
    .select("assigned_by")
    .eq("team_id", teamId);

  const assignmentCountMap = new Map<string, number>();
  (athleteAssignments ?? []).forEach((a) => {
    assignmentCountMap.set(
      a.assigned_by,
      (assignmentCountMap.get(a.assigned_by) ?? 0) + 1
    );
  });

  return data.map((row) => {
    const profile = row.profile as unknown as Record<string, unknown> | null;
    return {
      id: row.id,
      userId: row.user_id,
      firstName: (profile?.first_name as string) ?? "",
      lastName: (profile?.last_name as string) ?? "",
      email: (profile?.email as string) ?? "",
      avatarUrl: (profile?.avatar_url as string) ?? null,
      joinedAt: row.joined_at,
      athleteCount: assignmentCountMap.get(row.user_id) ?? 0,
    };
  });
}

// ── Fetch Team Athletes ─────────────────────────────────────────

export async function fetchTeamAthletes(
  teamId: string
): Promise<TeamAthlete[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("team_athletes")
    .select(
      `
      id,
      athlete_id,
      assigned_by,
      assigned_at,
      athlete:profiles!team_athletes_athlete_id_fkey (
        id,
        first_name,
        last_name,
        email,
        avatar_url
      ),
      assigner:profiles!team_athletes_assigned_by_fkey (
        first_name,
        last_name
      )
    `
    )
    .eq("team_id", teamId)
    .order("assigned_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => {
    const athlete = row.athlete as unknown as Record<string, unknown> | null;
    const assigner = row.assigner as unknown as Record<string, unknown> | null;
    return {
      id: row.id,
      athleteId: row.athlete_id,
      firstName: (athlete?.first_name as string) ?? "",
      lastName: (athlete?.last_name as string) ?? "",
      email: (athlete?.email as string) ?? "",
      avatarUrl: (athlete?.avatar_url as string) ?? null,
      assignedBy: row.assigned_by,
      assignedByName: `${(assigner?.first_name as string) ?? ""} ${(assigner?.last_name as string) ?? ""}`.trim(),
      assignedAt: row.assigned_at,
    };
  });
}

// ── Fetch Assignable Athletes (from PROJ-5) ─────────────────────

export async function fetchAssignableAthletes(
  teamId: string
): Promise<AssignableAthlete[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Get trainer's active PROJ-5 connections
  const { data: connections, error: connError } = await supabase
    .from("trainer_athlete_connections")
    .select(
      `
      athlete_id,
      athlete:profiles!trainer_athlete_connections_athlete_id_fkey (
        id,
        first_name,
        last_name,
        email,
        avatar_url
      )
    `
    )
    .eq("trainer_id", user.id)
    .eq("status", "active");

  if (connError || !connections) return [];

  // Get already-assigned athletes in this team
  const { data: assigned } = await supabase
    .from("team_athletes")
    .select("athlete_id")
    .eq("team_id", teamId);

  const assignedIds = new Set((assigned ?? []).map((a) => a.athlete_id));

  return connections
    .filter((c) => c.athlete_id != null)
    .map((c) => {
      const athlete = c.athlete as unknown as Record<string, unknown> | null;
      const athleteId = (athlete?.id as string) ?? c.athlete_id ?? "";
      return {
        id: athleteId,
        firstName: (athlete?.first_name as string) ?? "",
        lastName: (athlete?.last_name as string) ?? "",
        email: (athlete?.email as string) ?? "",
        avatarUrl: (athlete?.avatar_url as string) ?? null,
        alreadyAssigned: assignedIds.has(athleteId),
      };
    });
}

// ── Fetch Team Invitations ──────────────────────────────────────

export async function fetchTeamInvitations(
  teamId: string
): Promise<TeamInvitation[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("team_invitations")
    .select(
      `
      id,
      team_id,
      email,
      personal_message,
      status,
      expires_at,
      created_at,
      inviter:profiles!team_invitations_invited_by_fkey (
        first_name,
        last_name
      ),
      team:teams!team_invitations_team_id_fkey (
        name
      )
    `
    )
    .eq("team_id", teamId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => {
    const inviter = row.inviter as unknown as Record<string, unknown> | null;
    const team = row.team as unknown as Record<string, unknown> | null;
    return {
      id: row.id,
      teamId: row.team_id,
      teamName: (team?.name as string) ?? "",
      email: row.email,
      personalMessage: row.personal_message,
      invitedByName: `${(inviter?.first_name as string) ?? ""} ${(inviter?.last_name as string) ?? ""}`.trim(),
      status: row.status,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    };
  });
}

// ── Fetch Athlete's Teams (Dashboard Card) ──────────────────────

export async function fetchAthleteTeams(): Promise<AthleteTeamInfo[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: assignments, error } = await supabase
    .from("team_athletes")
    .select(
      `
      team_id,
      team:teams!team_athletes_team_id_fkey (
        id,
        name,
        logo_url,
        archived_at
      )
    `
    )
    .eq("athlete_id", user.id);

  if (error || !assignments) return [];

  // Filter out archived teams
  const activeAssignments = assignments.filter((a) => {
    const team = a.team as unknown as Record<string, unknown> | null;
    return team?.archived_at == null;
  });

  if (activeAssignments.length === 0) return [];

  const teamIds = activeAssignments.map((a) => a.team_id);

  // Get trainer counts per team
  const { data: memberCounts } = await supabase
    .from("team_members")
    .select("team_id")
    .in("team_id", teamIds);

  const trainerCountMap = new Map<string, number>();
  (memberCounts ?? []).forEach((m) => {
    trainerCountMap.set(m.team_id, (trainerCountMap.get(m.team_id) ?? 0) + 1);
  });

  return activeAssignments.map((a) => {
    const team = a.team as unknown as Record<string, unknown> | null;
    const id = (team?.id as string) ?? a.team_id;
    return {
      id,
      name: (team?.name as string) ?? "",
      logoUrl: (team?.logo_url as string) ?? null,
      trainerCount: trainerCountMap.get(a.team_id) ?? 0,
    };
  });
}

// ── Fetch All Team Athletes (Unified View) ─────────────────────

/**
 * Returns a flat map of athleteId -> teamId for all teams the trainer is a member of.
 * Used by the Unified View to know which athlete is in which team.
 */
export async function fetchAllTeamAthletes(): Promise<
  Record<string, string | null>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return {};

  // Get team IDs where user is a member
  const { data: memberships } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id);

  if (!memberships?.length) return {};

  const teamIds = memberships.map((m) => m.team_id);

  // Get all athlete-team assignments for those teams
  const { data: assignments, error } = await supabase
    .from("team_athletes")
    .select("athlete_id, team_id")
    .in("team_id", teamIds);

  if (error || !assignments) return {};

  const map: Record<string, string | null> = {};
  for (const a of assignments) {
    map[a.athlete_id] = a.team_id;
  }
  return map;
}

// ── Fetch Invitation by Token ───────────────────────────────────

export async function fetchTeamInvitationByToken(token: string): Promise<{
  invitation: TeamInvitation;
  isExpired: boolean;
} | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("team_invitations")
    .select(
      `
      id,
      team_id,
      email,
      personal_message,
      status,
      expires_at,
      created_at,
      inviter:profiles!team_invitations_invited_by_fkey (
        first_name,
        last_name
      ),
      team:teams!team_invitations_team_id_fkey (
        name
      )
    `
    )
    .eq("token", token)
    .eq("status", "pending")
    .single();

  if (error || !data) return null;

  const inviter = data.inviter as unknown as Record<string, unknown> | null;
  const team = data.team as unknown as Record<string, unknown> | null;

  return {
    invitation: {
      id: data.id,
      teamId: data.team_id,
      teamName: (team?.name as string) ?? "",
      email: data.email,
      personalMessage: data.personal_message,
      invitedByName: `${(inviter?.first_name as string) ?? ""} ${(inviter?.last_name as string) ?? ""}`.trim(),
      status: data.status,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
    },
    isExpired: new Date(data.expires_at) < new Date(),
  };
}

// ── Fetch Pending Team Invitations for Current User ─────────────

export async function fetchMyTeamInvitations(): Promise<TeamInvitation[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return [];

  const { data, error } = await supabase
    .from("team_invitations")
    .select(
      `
      id,
      team_id,
      email,
      personal_message,
      status,
      expires_at,
      created_at,
      inviter:profiles!team_invitations_invited_by_fkey (
        first_name,
        last_name
      ),
      team:teams!team_invitations_team_id_fkey (
        name
      )
    `
    )
    .eq("email", user.email.toLowerCase())
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const now = new Date();

  return data
    .filter((row) => new Date(row.expires_at) > now)
    .map((row) => {
      const inviter = row.inviter as unknown as Record<string, unknown> | null;
      const team = row.team as unknown as Record<string, unknown> | null;
      return {
        id: row.id,
        teamId: row.team_id,
        teamName: (team?.name as string) ?? "",
        email: row.email,
        personalMessage: row.personal_message,
        invitedByName: `${(inviter?.first_name as string) ?? ""} ${(inviter?.last_name as string) ?? ""}`.trim(),
        status: row.status,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
      };
    });
}
