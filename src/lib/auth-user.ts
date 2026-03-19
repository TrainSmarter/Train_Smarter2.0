/**
 * Auth user types and Supabase-to-AuthUser converter.
 *
 * Role architecture (Phase 1 — defined in PROJ-4):
 * - `app_metadata.roles`: UserRole[] — stored as ARRAY (e.g. ["TRAINER"]) for Dual-Role readiness (PROJ-11+)
 * - `app_metadata.is_platform_admin`: boolean — grants access to /admin area (manual SQL-only)
 * - NO "ADMIN" UserRole: platform admins are regular TRAINER/ATHLETE accounts with is_platform_admin=true
 */

import type { User } from "@supabase/supabase-js";

export type UserRole = "ATHLETE" | "TRAINER";

export interface AuthUser {
  id: string;
  email: string;
  /** Client-editable profile data (display only, never used for access control) */
  user_metadata: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  /** Server-controlled auth data (set via Supabase Edge Function with service-role key) */
  app_metadata: {
    /** Array of roles — use roles[0] for single-role access; supports future Dual-Role (PROJ-11+) */
    roles: UserRole[];
    is_platform_admin: boolean;
  };
}

/** @deprecated Use AuthUser instead */
export type MockUser = AuthUser;

/**
 * Convert a Supabase User object into a serializable AuthUser.
 * Safe to pass from Server Components to Client Components as props.
 */
export function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email ?? "",
    user_metadata: {
      first_name: user.user_metadata?.first_name ?? "",
      last_name: user.user_metadata?.last_name ?? "",
      avatar_url: user.user_metadata?.avatar_url,
    },
    app_metadata: {
      roles: (user.app_metadata?.roles as UserRole[]) ?? [],
      is_platform_admin: user.app_metadata?.is_platform_admin === true,
    },
  };
}
