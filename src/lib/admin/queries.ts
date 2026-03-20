/**
 * Server-side queries for PROJ-10 — Admin User Management
 *
 * Uses Supabase Admin API (service-role key) for auth.users access.
 * Client-side filtering/search because Admin API has limited filter options.
 */

import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type {
  AdminUser,
  UserListParams,
  UserListResult,
  UserRole,
} from "./types";

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

// ── Map Supabase User → AdminUser ───────────────────────────────

function mapToAdminUser(user: {
  id: string;
  email?: string;
  created_at: string;
  last_sign_in_at?: string | null;
  banned_until?: string | null;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}): AdminUser {
  const firstName =
    (user.user_metadata?.first_name as string) ?? "";
  const lastName =
    (user.user_metadata?.last_name as string) ?? "";
  const displayName =
    [firstName, lastName].filter(Boolean).join(" ") ||
    user.email ||
    "Unknown";

  const roles = (user.app_metadata?.roles as string[]) ?? [];
  const role = (roles[0] as UserRole) ?? null;

  // Supabase sets banned_until to a future date when user is banned.
  // A user is banned if banned_until exists and is in the future.
  const isBanned = user.banned_until
    ? new Date(user.banned_until) > new Date()
    : false;

  return {
    id: user.id,
    email: user.email ?? "",
    displayName,
    avatarUrl: (user.user_metadata?.avatar_url as string) ?? null,
    role,
    isPlatformAdmin: user.app_metadata?.is_platform_admin === true,
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at ?? null,
    isBanned,
    onboardingCompleted:
      user.app_metadata?.onboarding_completed === true,
  };
}

// ── List Users ──────────────────────────────────────────────────

/**
 * Fetches users from Supabase Auth Admin API with client-side filtering.
 *
 * Strategy: Fetch a larger batch from the Admin API, then apply search/filter
 * client-side because the Admin API does not support text search or metadata filtering.
 *
 * For <1000 users this is efficient. For larger user bases, consider a
 * materialized view or cron-synced table.
 */
export async function listUsers(
  params: UserListParams
): Promise<UserListResult> {
  const {
    page,
    perPage,
    search,
    roleFilter,
    statusFilter,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = params;

  const adminClient = createAdminClient();

  // Fetch all users (Admin API paginates internally — fetch up to 1000)
  // For larger user bases, implement cursor-based pagination
  const { data, error } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    console.error("Failed to list users:", error);
    return { users: [], totalCount: 0, page, perPage };
  }

  let users = (data?.users ?? []).map(mapToAdminUser);

  // ── Apply search filter ────────────────────────────────────
  if (search && search.trim().length > 0) {
    const q = search.toLowerCase().trim();
    users = users.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }

  // ── Apply role filter ──────────────────────────────────────
  if (roleFilter && roleFilter !== "all" && roleFilter !== null) {
    users = users.filter((u) => u.role === roleFilter);
  }

  // ── Apply status filter ────────────────────────────────────
  if (statusFilter === "banned") {
    users = users.filter((u) => u.isBanned);
  } else if (statusFilter === "active") {
    users = users.filter((u) => !u.isBanned);
  }

  // ── Sort ───────────────────────────────────────────────────
  users.sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case "name":
        cmp = a.displayName.localeCompare(b.displayName, "de");
        break;
      case "email":
        cmp = a.email.localeCompare(b.email);
        break;
      case "createdAt":
        cmp =
          new Date(a.createdAt).getTime() -
          new Date(b.createdAt).getTime();
        break;
      case "lastSignInAt": {
        const aTime = a.lastSignInAt
          ? new Date(a.lastSignInAt).getTime()
          : 0;
        const bTime = b.lastSignInAt
          ? new Date(b.lastSignInAt).getTime()
          : 0;
        cmp = aTime - bTime;
        break;
      }
    }
    return sortOrder === "desc" ? -cmp : cmp;
  });

  // ── Paginate ───────────────────────────────────────────────
  const totalCount = users.length;
  const startIndex = (page - 1) * perPage;
  const paginatedUsers = users.slice(startIndex, startIndex + perPage);

  return {
    users: paginatedUsers,
    totalCount,
    page,
    perPage,
  };
}

// ── Get Single User ─────────────────────────────────────────────

/**
 * Fetches a single user by ID from Supabase Auth Admin API.
 */
export async function getUser(userId: string): Promise<AdminUser | null> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient.auth.admin.getUserById(userId);

  if (error || !data?.user) {
    console.error("Failed to get user:", error);
    return null;
  }

  return mapToAdminUser(data.user);
}
