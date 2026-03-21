/**
 * Admin types for PROJ-10 — User Management
 *
 * All user data comes from Supabase Auth (auth.users) via Admin API.
 * No custom tables needed.
 */

export type UserRole = "TRAINER" | "ATHLETE";

export type UserStatus = "active" | "banned";

export type SortField = "name" | "email" | "createdAt" | "lastSignInAt";

export type SortOrder = "asc" | "desc";

/** Mapped user from Supabase Auth -> flat interface for the admin UI */
export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: UserRole | null;
  isPlatformAdmin: boolean;
  createdAt: string;
  lastSignInAt: string | null;
  isBanned: boolean;
  onboardingCompleted: boolean;
  aiEnabled: boolean;
}

/** Parameters for listing users with pagination, search, and filters */
export interface UserListParams {
  page: number;
  perPage: number;
  search?: string;
  roleFilter?: UserRole | "all" | null;
  statusFilter?: UserStatus | "all" | null;
  sortBy?: SortField;
  sortOrder?: SortOrder;
}

/** Paginated result from listUsers */
export interface UserListResult {
  users: AdminUser[];
  totalCount: number;
  page: number;
  perPage: number;
}

/** Stats for a single user (displayed in slide-over) */
export interface UserStats {
  athleteConnections: number;
  teamMemberships: number;
}
