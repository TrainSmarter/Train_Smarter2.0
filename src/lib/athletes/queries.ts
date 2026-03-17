import { createClient } from "@/lib/supabase/server";
import type {
  AthleteListItem,
  AthleteDetail,
  TrainerInfo,
  PendingInvitation,
} from "./types";

/**
 * Data queries for Athlete Management — PROJ-5
 *
 * All queries use the server-side Supabase client (RLS enforced).
 */

// ── Fetch Athletes for Trainer ──────────────────────────────────

const ATHLETES_PAGE_SIZE = 50;

export interface FetchAthletesResult {
  athletes: AthleteListItem[];
  totalCount: number;
  hasMore: boolean;
}

export async function fetchAthletes(
  page: number = 1
): Promise<FetchAthletesResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { athletes: [], totalCount: 0, hasMore: false };

  const from = (page - 1) * ATHLETES_PAGE_SIZE;
  const to = from + ATHLETES_PAGE_SIZE - 1;

  const { data, error, count } = await supabase
    .from("trainer_athlete_connections")
    .select(
      `
      id,
      athlete_id,
      athlete_email,
      status,
      connection_type,
      connected_at,
      invited_at,
      invitation_expires_at,
      athlete:profiles!trainer_athlete_connections_athlete_id_fkey (
        id,
        first_name,
        last_name,
        email,
        avatar_url
      )
    `,
      { count: "exact" }
    )
    .eq("trainer_id", user.id)
    .in("status", ["pending", "active"])
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Failed to fetch athletes:", error.message, error.code, error.details, error.hint);
    return { athletes: [], totalCount: 0, hasMore: false };
  }

  const totalCount = count ?? 0;
  const athletes = (data ?? []).map((row) => {
    const athlete = row.athlete as unknown as Record<string, unknown> | null;
    return {
      id: (athlete?.id as string) ?? row.athlete_id ?? "",
      connectionId: row.id,
      firstName: (athlete?.first_name as string) ?? "",
      lastName: (athlete?.last_name as string) ?? "",
      email: (athlete?.email as string) || row.athlete_email || "",
      avatarUrl: (athlete?.avatar_url as string) ?? null,
      status: row.status,
      connectionType: (row.connection_type as "invite" | "request") ?? "invite",
      connectedAt: row.connected_at,
      invitedAt: row.invited_at,
      invitationExpiresAt: row.invitation_expires_at,
    };
  });

  return {
    athletes,
    totalCount,
    hasMore: from + athletes.length < totalCount,
  };
}

// ── Fetch All Athletes for Trainer (no pagination) ──────────────

export async function fetchAllAthletes(): Promise<AthleteListItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("trainer_athlete_connections")
    .select(
      `
      id,
      athlete_id,
      athlete_email,
      status,
      connection_type,
      connected_at,
      invited_at,
      invitation_expires_at,
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
    .in("status", ["pending", "active"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch all athletes:", error.message, error.code, error.details, error.hint);
    return [];
  }

  return (data ?? []).map((row) => {
    const athlete = row.athlete as unknown as Record<string, unknown> | null;
    return {
      id: (athlete?.id as string) ?? row.athlete_id ?? "",
      connectionId: row.id,
      firstName: (athlete?.first_name as string) ?? "",
      lastName: (athlete?.last_name as string) ?? "",
      email: (athlete?.email as string) || row.athlete_email || "",
      avatarUrl: (athlete?.avatar_url as string) ?? null,
      status: row.status,
      connectionType: (row.connection_type as "invite" | "request") ?? "invite",
      connectedAt: row.connected_at,
      invitedAt: row.invited_at,
      invitationExpiresAt: row.invitation_expires_at,
    };
  });
}

// ── Fetch Single Athlete Detail ─────────────────────────────────

export async function fetchAthleteDetail(
  athleteId: string
): Promise<AthleteDetail | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("trainer_athlete_connections")
    .select(
      `
      id,
      athlete_id,
      status,
      connection_type,
      connected_at,
      invited_at,
      invitation_expires_at,
      invitation_message,
      can_see_body_data,
      can_see_nutrition,
      can_see_calendar,
      can_see_analysis,
      athlete:profiles!trainer_athlete_connections_athlete_id_fkey (
        id,
        first_name,
        last_name,
        email,
        avatar_url,
        birth_date
      )
    `
    )
    .eq("trainer_id", user.id)
    .eq("athlete_id", athleteId)
    .in("status", ["pending", "active"])
    .single();

  if (error || !data) return null;

  const athlete = data.athlete as unknown as Record<string, unknown> | null;
  return {
    id: (athlete?.id as string) ?? data.athlete_id ?? "",
    connectionId: data.id,
    firstName: (athlete?.first_name as string) ?? "",
    lastName: (athlete?.last_name as string) ?? "",
    email: (athlete?.email as string) ?? "",
    avatarUrl: (athlete?.avatar_url as string) ?? null,
    status: data.status,
    connectionType: (data.connection_type as "invite" | "request") ?? "invite",
    connectedAt: data.connected_at,
    invitedAt: data.invited_at,
    invitationExpiresAt: data.invitation_expires_at,
    birthDate: (athlete?.birth_date as string) ?? null,
    invitationMessage: data.invitation_message,
    canSeeBodyData: data.can_see_body_data,
    canSeeNutrition: data.can_see_nutrition,
    canSeeCalendar: data.can_see_calendar,
    canSeeAnalysis: data.can_see_analysis,
  };
}

// ── Fetch Trainer Info for Athlete ──────────────────────────────

export async function fetchMyTrainer(): Promise<TrainerInfo | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("trainer_athlete_connections")
    .select(
      `
      id,
      trainer_id,
      status,
      connected_at,
      trainer:profiles!trainer_athlete_connections_trainer_id_fkey (
        id,
        first_name,
        last_name,
        email,
        avatar_url
      )
    `
    )
    .eq("athlete_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return null;

  const trainer = data.trainer as unknown as Record<string, unknown> | null;
  return {
    id: (trainer?.id as string) ?? data.trainer_id,
    connectionId: data.id,
    firstName: (trainer?.first_name as string) ?? "",
    lastName: (trainer?.last_name as string) ?? "",
    email: (trainer?.email as string) ?? "",
    avatarUrl: (trainer?.avatar_url as string) ?? null,
    connectedAt: data.connected_at,
    status: data.status,
  };
}

// ── Fetch Pending Invitations for Athlete ───────────────────────

export async function fetchPendingInvitations(): Promise<PendingInvitation[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("trainer_athlete_connections")
    .select(
      `
      id,
      trainer_id,
      invited_at,
      invitation_expires_at,
      invitation_message,
      connection_type,
      trainer:profiles!trainer_athlete_connections_trainer_id_fkey (
        first_name,
        last_name,
        email,
        avatar_url
      )
    `
    )
    .eq("athlete_email", user.email?.toLowerCase())
    .eq("status", "pending")
    .order("invited_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch pending invitations:", error);
    return [];
  }

  const now = new Date();

  return (data ?? []).map((row) => {
    const trainer = row.trainer as unknown as Record<string, unknown> | null;
    return {
      connectionId: row.id,
      trainerId: row.trainer_id,
      trainerFirstName: (trainer?.first_name as string) ?? "",
      trainerLastName: (trainer?.last_name as string) ?? "",
      trainerEmail: (trainer?.email as string) ?? "",
      trainerAvatarUrl: (trainer?.avatar_url as string) ?? null,
      invitedAt: row.invited_at,
      invitationExpiresAt: row.invitation_expires_at,
      invitationMessage: row.invitation_message,
      connectionType: (row.connection_type as "invite" | "request") ?? "invite",
      isExpired: new Date(row.invitation_expires_at) < now,
    };
  });
}
