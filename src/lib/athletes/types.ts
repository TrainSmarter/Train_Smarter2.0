/**
 * Athlete Management types — PROJ-5
 *
 * Types for trainer-athlete connections, invitations, and profiles.
 */

export type ConnectionStatus = "pending" | "active" | "rejected" | "disconnected";

export interface TrainerAthleteConnection {
  id: string;
  trainer_id: string;
  athlete_id: string;
  status: ConnectionStatus;
  invited_at: string;
  invitation_message: string | null;
  invitation_expires_at: string;
  connected_at: string | null;
  rejected_at: string | null;
  disconnected_at: string | null;
  can_see_body_data: boolean;
  can_see_nutrition: boolean;
  can_see_calendar: boolean;
  can_see_analysis: boolean;
  created_at: string;
  updated_at: string;
}

/** Athlete as displayed in the trainer's overview grid */
export interface AthleteListItem {
  id: string;
  connectionId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  status: ConnectionStatus;
  connectedAt: string | null;
  invitedAt: string;
  invitationExpiresAt: string;
}

/** Athlete detail for the profile page */
export interface AthleteDetail extends AthleteListItem {
  birthDate: string | null;
  invitationMessage: string | null;
  canSeeBodyData: boolean;
  canSeeNutrition: boolean;
  canSeeCalendar: boolean;
  canSeeAnalysis: boolean;
}

/** Trainer info as displayed on the athlete's profile */
export interface TrainerInfo {
  id: string;
  connectionId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  connectedAt: string | null;
  status: ConnectionStatus;
}

/** Pending invitation for the athlete dashboard banner */
export interface PendingInvitation {
  connectionId: string;
  trainerId: string;
  trainerFirstName: string;
  trainerLastName: string;
  trainerEmail: string;
  trainerAvatarUrl: string | null;
  invitedAt: string;
  invitationExpiresAt: string;
  invitationMessage: string | null;
  isExpired: boolean;
}

export type SortOption = "name-asc" | "name-desc" | "recent";
