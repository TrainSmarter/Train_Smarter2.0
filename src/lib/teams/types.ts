/**
 * Team Management types — PROJ-9
 *
 * Types for teams, team members, team athletes, and team invitations.
 */

export type TeamInvitationStatus = "pending" | "accepted" | "declined";

/** Team as displayed in the trainer's teams grid */
export interface TeamListItem {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  trainerCount: number;
  athleteCount: number;
  createdAt: string;
}

/** Full team detail with members and athletes */
export interface TeamDetail {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  createdBy: string;
  archivedAt: string | null;
  createdAt: string;
}

/** Trainer member in a team */
export interface TeamMember {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  joinedAt: string;
  athleteCount: number;
}

/** Athlete assigned to a team */
export interface TeamAthlete {
  id: string;
  athleteId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  assignedBy: string;
  assignedByName: string;
  assignedAt: string;
}

/** Pending team invitation */
export interface TeamInvitation {
  id: string;
  teamId: string;
  teamName: string;
  email: string;
  personalMessage: string | null;
  invitedByName: string;
  status: TeamInvitationStatus;
  expiresAt: string;
  createdAt: string;
}

/** Team info for athlete dashboard card (read-only) */
export interface AthleteTeamInfo {
  id: string;
  name: string;
  logoUrl: string | null;
  trainerCount: number;
}

/** Athlete available for assignment (from PROJ-5 connections) */
export interface AssignableAthlete {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  alreadyAssigned: boolean;
}

// ── Unified View Types (PROJ-9 v2) ─────────────────────────────

/** Map of athleteId -> teamId (or null if unassigned) */
export type TeamAthleteMap = Record<string, string | null>;

/** View mode for the unified organisation page */
export type OrganisationViewMode = "grid" | "table" | "kanban";

/** Sort options for the unified view */
export type OrganisationSortOption =
  | "teams-first"
  | "athletes-first"
  | "name-asc"
  | "name-desc"
  | "status";

/** Persisted preferences for the organisation view */
export interface OrganisationPreferences {
  viewMode: OrganisationViewMode;
  sortOption: OrganisationSortOption;
}
