"use server";

/**
 * Server Actions for PROJ-10 — Admin User Management
 *
 * Pattern: verify admin -> validate input -> guard self-action -> mutate -> revalidate
 * All mutations use Supabase Admin API with service-role key.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import type { UserStats } from "./types";

type ActionResult = { success: boolean; error?: string };

// ── Admin Client ────────────────────────────────────────────────

function createAdminClient() {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// ── Ban User ────────────────────────────────────────────────────

export async function banUser(userId: string): Promise<ActionResult> {
  const adminId = await verifyPlatformAdmin();
  if (!adminId) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // Guard: admin cannot ban themselves
  if (userId === adminId) {
    return { success: false, error: "CANNOT_BAN_SELF" };
  }

  const adminClient = createAdminClient();

  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: "876000h", // ~100 years = permanent ban
  });

  if (error) {
    console.error("Failed to ban user:", error);
    return { success: false, error: "BAN_FAILED" };
  }

  revalidatePath("/admin/users", "page");
  return { success: true };
}

// ── Unban User ──────────────────────────────────────────────────

export async function unbanUser(userId: string): Promise<ActionResult> {
  const adminId = await verifyPlatformAdmin();
  if (!adminId) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const adminClient = createAdminClient();

  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: "none",
  });

  if (error) {
    console.error("Failed to unban user:", error);
    return { success: false, error: "UNBAN_FAILED" };
  }

  revalidatePath("/admin/users", "page");
  return { success: true };
}

// ── Change User Role ────────────────────────────────────────────

export async function changeUserRole(
  userId: string,
  newRole: "TRAINER" | "ATHLETE"
): Promise<ActionResult> {
  const adminId = await verifyPlatformAdmin();
  if (!adminId) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // Guard: admin cannot change their own role
  if (userId === adminId) {
    return { success: false, error: "CANNOT_CHANGE_OWN_ROLE" };
  }

  // Validate role value
  if (newRole !== "TRAINER" && newRole !== "ATHLETE") {
    return { success: false, error: "INVALID_ROLE" };
  }

  const adminClient = createAdminClient();

  // Fetch existing app_metadata to preserve other fields
  const { data: existingUser, error: fetchError } =
    await adminClient.auth.admin.getUserById(userId);

  if (fetchError || !existingUser?.user) {
    console.error("Failed to fetch user for role change:", fetchError);
    return { success: false, error: "USER_NOT_FOUND" };
  }

  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...existingUser.user.app_metadata,
      roles: [newRole],
    },
  });

  if (error) {
    console.error("Failed to change user role:", error);
    return { success: false, error: "ROLE_CHANGE_FAILED" };
  }

  revalidatePath("/admin/users", "page");
  return { success: true };
}

// ── Send Password Reset ─────────────────────────────────────────

export async function sendPasswordReset(
  email: string
): Promise<ActionResult> {
  const adminId = await verifyPlatformAdmin();
  if (!adminId) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  if (!email || !email.includes("@")) {
    return { success: false, error: "INVALID_EMAIL" };
  }

  const adminClient = createAdminClient();

  const { error } = await adminClient.auth.admin.generateLink({
    type: "recovery",
    email,
  });

  if (error) {
    console.error("Failed to send password reset:", error);
    return { success: false, error: "RESET_FAILED" };
  }

  revalidatePath("/admin/users", "page");
  return { success: true };
}

// ── Verify Platform Admin ──────────────────────────────────────

export async function verifyPlatformAdmin(): Promise<string | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  if (user.app_metadata?.is_platform_admin !== true) return null;

  return user.id;
}

// ── Get User Stats (Server Action) ────────────────────────────

export async function getUserStatsAction(
  userId: string
): Promise<UserStats> {
  const adminId = await verifyPlatformAdmin();
  if (!adminId) return { athleteConnections: 0, teamMemberships: 0 };

  const adminClient = createAdminClient();

  const { count: trainerCount } = await adminClient
    .from("trainer_athlete_connections")
    .select("*", { count: "exact", head: true })
    .eq("trainer_id", userId)
    .neq("status", "disconnected");

  const { count: athleteCount } = await adminClient
    .from("trainer_athlete_connections")
    .select("*", { count: "exact", head: true })
    .eq("athlete_id", userId)
    .neq("status", "disconnected");

  const { count: teamAthleteCount } = await adminClient
    .from("team_athletes")
    .select("*", { count: "exact", head: true })
    .eq("athlete_id", userId);

  const { count: teamOwnerCount } = await adminClient
    .from("teams")
    .select("*", { count: "exact", head: true })
    .eq("created_by", userId);

  return {
    athleteConnections: (trainerCount ?? 0) + (athleteCount ?? 0),
    teamMemberships: (teamAthleteCount ?? 0) + (teamOwnerCount ?? 0),
  };
}

// ── Check If User Is Self (Server Action) ─────────────────────

export async function checkIsSelfUserAction(
  userId: string
): Promise<boolean> {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return false;
  return user.id === userId;
}
