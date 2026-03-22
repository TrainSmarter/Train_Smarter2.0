import { z } from "zod";

export const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const updateTeamSchema = z.object({
  teamId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const inviteTrainerSchema = z.object({
  teamId: z.string().uuid(),
  email: z.string().email().max(255),
  message: z.string().max(500).optional(),
});

export const assignAthletesSchema = z.object({
  teamId: z.string().uuid(),
  athleteIds: z.array(z.string().uuid()).min(0),
});

export const archiveTeamSchema = z.object({
  teamId: z.string().uuid(),
  confirmName: z.string().min(1),
});

export const removeAthleteFromTeamSchema = z.object({
  teamId: z.string().uuid(),
  athleteId: z.string().uuid(),
  disconnectFromProj5: z.boolean().optional(),
});

export const removeTrainerFromTeamSchema = z.object({
  teamId: z.string().uuid(),
  userId: z.string().uuid(),
});

export type CreateTeamFormData = z.infer<typeof createTeamSchema>;
export type UpdateTeamFormData = z.infer<typeof updateTeamSchema>;
export type InviteTrainerFormData = z.infer<typeof inviteTrainerSchema>;
export type AssignAthletesFormData = z.infer<typeof assignAthletesSchema>;
export const cancelTeamInvitationSchema = z.object({
  teamId: z.string().uuid(),
  invitationId: z.string().uuid(),
});

export type ArchiveTeamFormData = z.infer<typeof archiveTeamSchema>;
