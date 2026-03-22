import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests for PROJ-9 Team Management server actions.
 *
 * Covers: moveAthleteToTeam, createTeam, updateTeam, archiveTeam,
 * assignAthletes, cancelTeamInvitation, inviteTrainer,
 * removeAthleteFromTeam, removeTrainerFromTeam, leaveTeam,
 * acceptTeamInvitation, declineTeamInvitation.
 */

// ── Chainable Supabase mock builder ─────────────────────────────

/**
 * Creates a deeply chainable mock where every method returns the chain itself.
 * Terminal methods (single, maybeSingle) resolve with configurable data.
 * insert() also returns the chain so .insert().select().single() works.
 */
function createChainMock(opts?: {
  singleData?: unknown;
  singleError?: unknown;
  maybeSingleData?: unknown;
  maybeSingleError?: unknown;
  insertError?: unknown;
  deleteError?: unknown;
  updateError?: unknown;
  selectData?: unknown;
  selectError?: unknown;
  countData?: number | null;
}) {
  const o = opts ?? {};
  const chain: Record<string, unknown> = {};

  // Every chainable method returns chain
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.neq = vi.fn().mockReturnValue(chain);
  chain.is = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.upsert = vi.fn().mockResolvedValue({ error: o.insertError ?? null });

  // Terminal resolvers
  chain.single = vi.fn().mockResolvedValue({
    data: o.singleData ?? null,
    error: o.singleError ?? null,
  });
  chain.maybeSingle = vi.fn().mockResolvedValue({
    data: o.maybeSingleData ?? null,
    error: o.maybeSingleError ?? null,
  });

  // Make chain itself thenable for await-ed non-terminal chains
  // (e.g. `await supabase.from("x").delete().eq("a", b)`)
  chain.then = vi.fn().mockImplementation(
    (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => {
      return Promise.resolve({
        data: o.selectData ?? null,
        error: o.insertError ?? o.deleteError ?? o.updateError ?? o.selectError ?? null,
        count: o.countData ?? null,
      }).then(resolve, reject);
    }
  );

  return chain;
}

// ── Mock setup ──────────────────────────────────────────────────

const TRAINER_UUID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const ATHLETE_UUID = "11111111-2222-4333-8444-555555555555";
const TEAM_UUID = "99999999-8888-4777-8666-555555555555";
const INVITATION_UUID = "ffffffff-eeee-4ddd-8ccc-bbbbbbbbbbbb";

let fromHandler: (table: string) => unknown;

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn().mockImplementation((table: string) => {
    if (fromHandler) return fromHandler(table);
    return createChainMock();
  }),
  functions: {
    invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase)),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/validation/email", () => ({
  validateEmailPlausibility: vi.fn().mockResolvedValue({ valid: true }),
}));

// ── Helpers ─────────────────────────────────────────────────────

function setAuthenticated() {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: {
      user: {
        id: TRAINER_UUID,
        email: "trainer@example.com",
        app_metadata: { roles: ["TRAINER"] },
        user_metadata: { locale: "de" },
      },
    },
    error: null,
  });
}

function setUnauthenticated() {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: null },
    error: { message: "Not authenticated" },
  });
}

function setNonTrainerUser() {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: {
      user: {
        id: TRAINER_UUID,
        email: "trainer@example.com",
        app_metadata: { roles: ["ATHLETE"] },
        user_metadata: { locale: "de" },
      },
    },
    error: null,
  });
}

// ── Tests ───────────────────────────────────────────────────────

describe("PROJ-9: Team Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthenticated();
    fromHandler = () => createChainMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // moveAthleteToTeam
  // ═══════════════════════════════════════════════════════════════

  describe("moveAthleteToTeam", () => {
    it("returns UNAUTHORIZED when user is not authenticated", async () => {
      setUnauthenticated();
      const { moveAthleteToTeam } = await import("./actions");
      const result = await moveAthleteToTeam({
        athleteId: ATHLETE_UUID,
        targetTeamId: TEAM_UUID,
      });
      expect(result).toEqual({ success: false, error: "UNAUTHORIZED" });
    });

    it("returns UNAUTHORIZED when user is not a TRAINER", async () => {
      setNonTrainerUser();
      const { moveAthleteToTeam } = await import("./actions");
      const result = await moveAthleteToTeam({
        athleteId: ATHLETE_UUID,
        targetTeamId: TEAM_UUID,
      });
      expect(result).toEqual({ success: false, error: "UNAUTHORIZED" });
    });

    it("returns INVALID_INPUT for non-UUID athleteId", async () => {
      const { moveAthleteToTeam } = await import("./actions");
      const result = await moveAthleteToTeam({
        athleteId: "not-a-uuid",
        targetTeamId: TEAM_UUID,
      });
      expect(result).toEqual({ success: false, error: "INVALID_INPUT" });
    });

    it("returns INVALID_INPUT for non-UUID targetTeamId", async () => {
      const { moveAthleteToTeam } = await import("./actions");
      const result = await moveAthleteToTeam({
        athleteId: ATHLETE_UUID,
        targetTeamId: "bad-id",
      });
      expect(result).toEqual({ success: false, error: "INVALID_INPUT" });
    });

    it("allows null targetTeamId (unassign from team)", async () => {
      // trainer_athlete_connections: returns active connection
      // team_athletes: delete succeeds
      fromHandler = (table: string) => {
        if (table === "trainer_athlete_connections") {
          return createChainMock({ maybeSingleData: { id: "conn-1" } });
        }
        if (table === "team_athletes") {
          return createChainMock(); // delete resolves with no error
        }
        return createChainMock();
      };

      const { moveAthleteToTeam } = await import("./actions");
      const result = await moveAthleteToTeam({
        athleteId: ATHLETE_UUID,
        targetTeamId: null,
      });
      expect(result.error).not.toBe("INVALID_INPUT");
    });

    it("returns INVALID_ATHLETES when no active PROJ-5 connection exists", async () => {
      fromHandler = (table: string) => {
        if (table === "trainer_athlete_connections") {
          return createChainMock({ maybeSingleData: null });
        }
        return createChainMock();
      };

      const { moveAthleteToTeam } = await import("./actions");
      const result = await moveAthleteToTeam({
        athleteId: ATHLETE_UUID,
        targetTeamId: TEAM_UUID,
      });
      expect(result).toEqual({ success: false, error: "INVALID_ATHLETES" });
    });

    it("returns UNAUTHORIZED when user is not a member of target team", async () => {
      fromHandler = (table: string) => {
        if (table === "trainer_athlete_connections") {
          return createChainMock({ maybeSingleData: { id: "conn-1" } });
        }
        if (table === "team_members") {
          return createChainMock({ maybeSingleData: null }); // not a member
        }
        return createChainMock();
      };

      const { moveAthleteToTeam } = await import("./actions");
      const result = await moveAthleteToTeam({
        athleteId: ATHLETE_UUID,
        targetTeamId: TEAM_UUID,
      });
      expect(result).toEqual({ success: false, error: "UNAUTHORIZED" });
    });

    it("returns success when move completes successfully", async () => {
      fromHandler = (table: string) => {
        if (table === "trainer_athlete_connections") {
          return createChainMock({ maybeSingleData: { id: "conn-1" } });
        }
        if (table === "team_members") {
          return createChainMock({ maybeSingleData: { id: "member-1" } });
        }
        if (table === "team_athletes") {
          return createChainMock(); // delete + insert both succeed
        }
        return createChainMock();
      };

      const { moveAthleteToTeam } = await import("./actions");
      const result = await moveAthleteToTeam({
        athleteId: ATHLETE_UUID,
        targetTeamId: TEAM_UUID,
      });
      expect(result.success).toBe(true);
    });

    it("returns DELETE_FAILED when old assignment delete fails", async () => {
      fromHandler = (table: string) => {
        if (table === "trainer_athlete_connections") {
          return createChainMock({ maybeSingleData: { id: "conn-1" } });
        }
        if (table === "team_members") {
          return createChainMock({ maybeSingleData: { id: "member-1" } });
        }
        if (table === "team_athletes") {
          return createChainMock({ deleteError: { message: "delete failed" } });
        }
        return createChainMock();
      };

      const { moveAthleteToTeam } = await import("./actions");
      const result = await moveAthleteToTeam({
        athleteId: ATHLETE_UUID,
        targetTeamId: TEAM_UUID,
      });
      expect(result).toEqual({ success: false, error: "DELETE_FAILED" });
    });

    it("queries trainer_athlete_connections table", async () => {
      fromHandler = (table: string) => {
        if (table === "trainer_athlete_connections") {
          return createChainMock({ maybeSingleData: null });
        }
        return createChainMock();
      };

      const { moveAthleteToTeam } = await import("./actions");
      await moveAthleteToTeam({
        athleteId: ATHLETE_UUID,
        targetTeamId: TEAM_UUID,
      });

      const fromCalls = mockSupabase.from.mock.calls.map((c: string[]) => c[0]);
      expect(fromCalls).toContain("trainer_athlete_connections");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // createTeam
  // ═══════════════════════════════════════════════════════════════

  describe("createTeam", () => {
    it("returns UNAUTHORIZED when not authenticated", async () => {
      setUnauthenticated();
      const { createTeam } = await import("./actions");
      const result = await createTeam({ name: "Test Team" });
      expect(result).toEqual({ success: false, error: "UNAUTHORIZED" });
    });

    it("returns INVALID_INPUT when name is empty", async () => {
      const { createTeam } = await import("./actions");
      const result = await createTeam({ name: "" });
      expect(result).toEqual({ success: false, error: "INVALID_INPUT" });
    });

    it("returns INVALID_INPUT when name exceeds 100 characters", async () => {
      const { createTeam } = await import("./actions");
      const result = await createTeam({ name: "A".repeat(101) });
      expect(result).toEqual({ success: false, error: "INVALID_INPUT" });
    });

    it("returns INVALID_INPUT when description exceeds 500 characters", async () => {
      const { createTeam } = await import("./actions");
      const result = await createTeam({ name: "Team", description: "A".repeat(501) });
      expect(result).toEqual({ success: false, error: "INVALID_INPUT" });
    });

    it("creates team and adds creator as member on valid input", async () => {
      let teamInserted = false;
      fromHandler = (table: string) => {
        if (table === "teams") {
          if (!teamInserted) {
            teamInserted = true;
            return createChainMock({ singleData: { id: TEAM_UUID } });
          }
          return createChainMock(); // cleanup path if needed
        }
        if (table === "team_members") {
          return createChainMock(); // insert succeeds (resolves with no error)
        }
        return createChainMock();
      };

      const { createTeam } = await import("./actions");
      const result = await createTeam({ name: "My Team", description: "Desc" });
      expect(result.success).toBe(true);
      expect(result.teamId).toBe(TEAM_UUID);
    });

    it("returns INSERT_FAILED when team insert fails", async () => {
      fromHandler = (table: string) => {
        if (table === "teams") {
          return createChainMock({
            singleData: null,
            singleError: { message: "insert error" },
          });
        }
        return createChainMock();
      };

      const { createTeam } = await import("./actions");
      const result = await createTeam({ name: "My Team" });
      expect(result).toEqual({ success: false, error: "INSERT_FAILED" });
    });

    it("cleans up team when member insert fails", async () => {
      let teamCallCount = 0;
      fromHandler = (table: string) => {
        if (table === "teams") {
          teamCallCount++;
          if (teamCallCount === 1) {
            return createChainMock({ singleData: { id: TEAM_UUID } });
          }
          return createChainMock(); // cleanup delete
        }
        if (table === "team_members") {
          // member insert fails -- insert returns a thenable with error
          return createChainMock({ insertError: { message: "member failed" } });
        }
        return createChainMock();
      };

      const { createTeam } = await import("./actions");
      const result = await createTeam({ name: "My Team" });
      expect(result).toEqual({ success: false, error: "INSERT_FAILED" });
      // Verify teams table was accessed for cleanup
      expect(teamCallCount).toBeGreaterThanOrEqual(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // updateTeam
  // ═══════════════════════════════════════════════════════════════

  describe("updateTeam", () => {
    it("returns UNAUTHORIZED when not authenticated", async () => {
      setUnauthenticated();
      const { updateTeam } = await import("./actions");
      const result = await updateTeam({ teamId: TEAM_UUID, name: "New Name" });
      expect(result).toEqual({ success: false, error: "UNAUTHORIZED" });
    });

    it("returns INVALID_INPUT for non-UUID teamId", async () => {
      const { updateTeam } = await import("./actions");
      const result = await updateTeam({ teamId: "not-uuid", name: "New Name" });
      expect(result).toEqual({ success: false, error: "INVALID_INPUT" });
    });

    it("returns INVALID_INPUT for empty name", async () => {
      const { updateTeam } = await import("./actions");
      const result = await updateTeam({ teamId: TEAM_UUID, name: "" });
      expect(result).toEqual({ success: false, error: "INVALID_INPUT" });
    });

    it("returns UNAUTHORIZED when user is not a team member", async () => {
      fromHandler = (table: string) => {
        if (table === "team_members") {
          return createChainMock({ maybeSingleData: null });
        }
        return createChainMock();
      };

      const { updateTeam } = await import("./actions");
      const result = await updateTeam({ teamId: TEAM_UUID, name: "New Name" });
      expect(result).toEqual({ success: false, error: "UNAUTHORIZED" });
    });

    it("returns success on valid update", async () => {
      fromHandler = (table: string) => {
        if (table === "team_members") {
          return createChainMock({ maybeSingleData: { id: "member-1" } });
        }
        if (table === "teams") {
          return createChainMock(); // update succeeds
        }
        return createChainMock();
      };

      const { updateTeam } = await import("./actions");
      const result = await updateTeam({ teamId: TEAM_UUID, name: "Updated Team" });
      expect(result.success).toBe(true);
    });

    it("returns UPDATE_FAILED when update errors", async () => {
      fromHandler = (table: string) => {
        if (table === "team_members") {
          return createChainMock({ maybeSingleData: { id: "member-1" } });
        }
        if (table === "teams") {
          return createChainMock({ updateError: { message: "update failed" } });
        }
        return createChainMock();
      };

      const { updateTeam } = await import("./actions");
      const result = await updateTeam({ teamId: TEAM_UUID, name: "New" });
      expect(result).toEqual({ success: false, error: "UPDATE_FAILED" });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // archiveTeam
  // ═══════════════════════════════════════════════════════════════

  describe("archiveTeam", () => {
    it("returns UNAUTHORIZED when not authenticated", async () => {
      setUnauthenticated();
      const { archiveTeam } = await import("./actions");
      const result = await archiveTeam({ teamId: TEAM_UUID, confirmName: "Team" });
      expect(result).toEqual({ success: false, error: "UNAUTHORIZED" });
    });

    it("returns INVALID_INPUT for non-UUID teamId", async () => {
      const { archiveTeam } = await import("./actions");
      const result = await archiveTeam({ teamId: "bad", confirmName: "Team" });
      expect(result).toEqual({ success: false, error: "INVALID_INPUT" });
    });

    it("returns INVALID_INPUT for empty confirmName", async () => {
      const { archiveTeam } = await import("./actions");
      const result = await archiveTeam({ teamId: TEAM_UUID, confirmName: "" });
      expect(result).toEqual({ success: false, error: "INVALID_INPUT" });
    });

    it("returns NAME_MISMATCH when confirmName does not match", async () => {
      fromHandler = (table: string) => {
        if (table === "team_members") {
          return createChainMock({ maybeSingleData: { id: "member-1" } });
        }
        if (table === "teams") {
          return createChainMock({ singleData: { name: "Actual Team Name" } });
        }
        return createChainMock();
      };

      const { archiveTeam } = await import("./actions");
      const result = await archiveTeam({ teamId: TEAM_UUID, confirmName: "Wrong Name" });
      expect(result).toEqual({ success: false, error: "NAME_MISMATCH" });
    });

    it("returns success when team is archived correctly", async () => {
      let teamCallCount = 0;
      fromHandler = (table: string) => {
        if (table === "team_members") {
          return createChainMock({ maybeSingleData: { id: "member-1" } });
        }
        if (table === "teams") {
          teamCallCount++;
          if (teamCallCount === 1) {
            return createChainMock({ singleData: { name: "My Team" } });
          }
          return createChainMock(); // update (archive)
        }
        return createChainMock();
      };

      const { archiveTeam } = await import("./actions");
      const result = await archiveTeam({ teamId: TEAM_UUID, confirmName: "My Team" });
      expect(result.success).toBe(true);
    });

    it("returns UPDATE_FAILED when archive update errors", async () => {
      let teamCallCount = 0;
      fromHandler = (table: string) => {
        if (table === "team_members") {
          return createChainMock({ maybeSingleData: { id: "member-1" } });
        }
        if (table === "teams") {
          teamCallCount++;
          if (teamCallCount === 1) {
            return createChainMock({ singleData: { name: "My Team" } });
          }
          return createChainMock({ updateError: { message: "update failed" } });
        }
        return createChainMock();
      };

      const { archiveTeam } = await import("./actions");
      const result = await archiveTeam({ teamId: TEAM_UUID, confirmName: "My Team" });
      expect(result).toEqual({ success: false, error: "UPDATE_FAILED" });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // cancelTeamInvitation
  // ═══════════════════════════════════════════════════════════════

  describe("cancelTeamInvitation", () => {
    it("returns UNAUTHORIZED when not authenticated", async () => {
      setUnauthenticated();
      const { cancelTeamInvitation } = await import("./actions");
      const result = await cancelTeamInvitation({
        teamId: TEAM_UUID,
        invitationId: INVITATION_UUID,
      });
      expect(result).toEqual({ success: false, error: "UNAUTHORIZED" });
    });

    it("returns INVALID_INPUT for non-UUID teamId", async () => {
      const { cancelTeamInvitation } = await import("./actions");
      const result = await cancelTeamInvitation({
        teamId: "not-a-uuid",
        invitationId: INVITATION_UUID,
      });
      expect(result).toEqual({ success: false, error: "INVALID_INPUT" });
    });

    it("returns INVALID_INPUT for non-UUID invitationId", async () => {
      const { cancelTeamInvitation } = await import("./actions");
      const result = await cancelTeamInvitation({
        teamId: TEAM_UUID,
        invitationId: "not-a-uuid",
      });
      expect(result).toEqual({ success: false, error: "INVALID_INPUT" });
    });

    it("returns UNAUTHORIZED when user is not a team member", async () => {
      fromHandler = (table: string) => {
        if (table === "team_members") {
          return createChainMock({ maybeSingleData: null });
        }
        return createChainMock();
      };

      const { cancelTeamInvitation } = await import("./actions");
      const result = await cancelTeamInvitation({
        teamId: TEAM_UUID,
        invitationId: INVITATION_UUID,
      });
      expect(result).toEqual({ success: false, error: "UNAUTHORIZED" });
    });

    it("returns success when invitation is cancelled", async () => {
      fromHandler = (table: string) => {
        if (table === "team_members") {
          return createChainMock({ maybeSingleData: { id: "member-1" } });
        }
        if (table === "team_invitations") {
          return createChainMock(); // delete succeeds
        }
        return createChainMock();
      };

      const { cancelTeamInvitation } = await import("./actions");
      const result = await cancelTeamInvitation({
        teamId: TEAM_UUID,
        invitationId: INVITATION_UUID,
      });
      expect(result.success).toBe(true);
    });

    it("returns DELETE_FAILED when delete fails", async () => {
      fromHandler = (table: string) => {
        if (table === "team_members") {
          return createChainMock({ maybeSingleData: { id: "member-1" } });
        }
        if (table === "team_invitations") {
          return createChainMock({ deleteError: { message: "delete error" } });
        }
        return createChainMock();
      };

      const { cancelTeamInvitation } = await import("./actions");
      const result = await cancelTeamInvitation({
        teamId: TEAM_UUID,
        invitationId: INVITATION_UUID,
      });
      expect(result).toEqual({ success: false, error: "DELETE_FAILED" });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // assignAthletes
  // ═══════════════════════════════════════════════════════════════

  describe("assignAthletes", () => {
    it("returns UNAUTHORIZED when not authenticated", async () => {
      setUnauthenticated();
      const { assignAthletes } = await import("./actions");
      const result = await assignAthletes({
        teamId: TEAM_UUID,
        athleteIds: [ATHLETE_UUID],
      });
      expect(result).toEqual({ success: false, error: "UNAUTHORIZED" });
    });

    it("returns INVALID_INPUT for non-UUID teamId", async () => {
      const { assignAthletes } = await import("./actions");
      const result = await assignAthletes({
        teamId: "not-uuid",
        athleteIds: [ATHLETE_UUID],
      });
      expect(result).toEqual({ success: false, error: "INVALID_INPUT" });
    });

    it("returns INVALID_INPUT for non-UUID athleteId in array", async () => {
      const { assignAthletes } = await import("./actions");
      const result = await assignAthletes({
        teamId: TEAM_UUID,
        athleteIds: ["not-a-uuid"],
      });
      expect(result).toEqual({ success: false, error: "INVALID_INPUT" });
    });

    it("accepts empty athleteIds array (no-op when no current assignments)", async () => {
      fromHandler = (table: string) => {
        if (table === "team_members") {
          return createChainMock({ maybeSingleData: { id: "member-1" } });
        }
        if (table === "team_athletes") {
          return createChainMock({ selectData: [] }); // no current assignments
        }
        return createChainMock();
      };

      const { assignAthletes } = await import("./actions");
      const result = await assignAthletes({
        teamId: TEAM_UUID,
        athleteIds: [],
      });
      expect(result.success).toBe(true);
    });

    it("returns UNAUTHORIZED when user is not a team member", async () => {
      fromHandler = (table: string) => {
        if (table === "team_members") {
          return createChainMock({ maybeSingleData: null });
        }
        return createChainMock();
      };

      const { assignAthletes } = await import("./actions");
      const result = await assignAthletes({
        teamId: TEAM_UUID,
        athleteIds: [ATHLETE_UUID],
      });
      expect(result).toEqual({ success: false, error: "UNAUTHORIZED" });
    });

    it("returns INVALID_ATHLETES when connection is not active", async () => {
      fromHandler = (table: string) => {
        if (table === "team_members") {
          return createChainMock({ maybeSingleData: { id: "member-1" } });
        }
        if (table === "team_athletes") {
          return createChainMock({ selectData: [] }); // no current
        }
        if (table === "trainer_athlete_connections") {
          return createChainMock({ selectData: [] }); // no valid connections
        }
        return createChainMock();
      };

      const { assignAthletes } = await import("./actions");
      const result = await assignAthletes({
        teamId: TEAM_UUID,
        athleteIds: [ATHLETE_UUID],
      });
      expect(result).toEqual({ success: false, error: "INVALID_ATHLETES" });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // inviteTrainer
  // ═══════════════════════════════════════════════════════════════

  describe("inviteTrainer", () => {
    it("returns UNAUTHORIZED when not authenticated", async () => {
      setUnauthenticated();
      const { inviteTrainer } = await import("./actions");
      const result = await inviteTrainer({
        teamId: TEAM_UUID,
        email: "other@example.com",
      });
      expect(result).toEqual({ success: false, error: "UNAUTHORIZED" });
    });

    it("returns INVALID_INPUT for invalid email", async () => {
      const { inviteTrainer } = await import("./actions");
      const result = await inviteTrainer({
        teamId: TEAM_UUID,
        email: "not-an-email",
      });
      expect(result).toEqual({ success: false, error: "INVALID_INPUT" });
    });

    it("returns INVALID_INPUT for non-UUID teamId", async () => {
      const { inviteTrainer } = await import("./actions");
      const result = await inviteTrainer({
        teamId: "bad",
        email: "other@example.com",
      });
      expect(result).toEqual({ success: false, error: "INVALID_INPUT" });
    });

    it("returns SELF_INVITE when inviting own email", async () => {
      const { inviteTrainer } = await import("./actions");
      const result = await inviteTrainer({
        teamId: TEAM_UUID,
        email: "trainer@example.com",
      });
      expect(result).toEqual({ success: false, error: "SELF_INVITE" });
    });

    it("returns SELF_INVITE case-insensitively", async () => {
      const { inviteTrainer } = await import("./actions");
      const result = await inviteTrainer({
        teamId: TEAM_UUID,
        email: "TRAINER@Example.com",
      });
      expect(result).toEqual({ success: false, error: "SELF_INVITE" });
    });

    it("returns UNAUTHORIZED when user is not a team member", async () => {
      fromHandler = (table: string) => {
        if (table === "team_members") {
          return createChainMock({ maybeSingleData: null });
        }
        return createChainMock();
      };

      const { inviteTrainer } = await import("./actions");
      const result = await inviteTrainer({
        teamId: TEAM_UUID,
        email: "new-trainer@example.com",
      });
      expect(result).toEqual({ success: false, error: "UNAUTHORIZED" });
    });

    it("returns ALREADY_MEMBER when trainer is already in the team", async () => {
      const otherUserId = "22222222-3333-4444-5555-666666666666";
      let memberCallCount = 0;
      fromHandler = (table: string) => {
        if (table === "team_members") {
          memberCallCount++;
          if (memberCallCount === 1) {
            // assertTeamMember: current user is a member
            return createChainMock({ maybeSingleData: { id: "member-1" } });
          }
          // Check if invited user is already a member
          return createChainMock({ maybeSingleData: { id: "existing-member" } });
        }
        if (table === "profiles") {
          return createChainMock({ maybeSingleData: { id: otherUserId } });
        }
        return createChainMock();
      };

      const { inviteTrainer } = await import("./actions");
      const result = await inviteTrainer({
        teamId: TEAM_UUID,
        email: "other-trainer@example.com",
      });
      expect(result).toEqual({ success: false, error: "ALREADY_MEMBER" });
    });

    it("returns ALREADY_INVITED when pending invitation exists", async () => {
      let memberCallCount = 0;
      fromHandler = (table: string) => {
        if (table === "team_members") {
          memberCallCount++;
          return createChainMock({ maybeSingleData: { id: "member-1" } });
        }
        if (table === "profiles") {
          return createChainMock({ maybeSingleData: null }); // no existing user
        }
        if (table === "team_invitations") {
          return createChainMock({ maybeSingleData: { id: "existing-invite" } });
        }
        return createChainMock();
      };

      const { inviteTrainer } = await import("./actions");
      const result = await inviteTrainer({
        teamId: TEAM_UUID,
        email: "new-trainer@example.com",
      });
      expect(result).toEqual({ success: false, error: "ALREADY_INVITED" });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // removeAthleteFromTeam
  // ═══════════════════════════════════════════════════════════════

  describe("removeAthleteFromTeam", () => {
    it("returns UNAUTHORIZED when not authenticated", async () => {
      setUnauthenticated();
      const { removeAthleteFromTeam } = await import("./actions");
      const result = await removeAthleteFromTeam({
        teamId: TEAM_UUID,
        athleteId: ATHLETE_UUID,
      });
      expect(result).toEqual({ success: false, error: "UNAUTHORIZED" });
    });

    it("returns INVALID_INPUT for non-UUID teamId", async () => {
      const { removeAthleteFromTeam } = await import("./actions");
      const result = await removeAthleteFromTeam({
        teamId: "bad",
        athleteId: ATHLETE_UUID,
      });
      expect(result).toEqual({ success: false, error: "INVALID_INPUT" });
    });

    it("returns INVALID_INPUT for non-UUID athleteId", async () => {
      const { removeAthleteFromTeam } = await import("./actions");
      const result = await removeAthleteFromTeam({
        teamId: TEAM_UUID,
        athleteId: "bad",
      });
      expect(result).toEqual({ success: false, error: "INVALID_INPUT" });
    });

    it("returns UNAUTHORIZED when user is not a team member", async () => {
      fromHandler = (table: string) => {
        if (table === "team_members") {
          return createChainMock({ maybeSingleData: null });
        }
        return createChainMock();
      };

      const { removeAthleteFromTeam } = await import("./actions");
      const result = await removeAthleteFromTeam({
        teamId: TEAM_UUID,
        athleteId: ATHLETE_UUID,
      });
      expect(result).toEqual({ success: false, error: "UNAUTHORIZED" });
    });

    it("returns success when athlete is removed", async () => {
      fromHandler = (table: string) => {
        if (table === "team_members") {
          return createChainMock({ maybeSingleData: { id: "member-1" } });
        }
        if (table === "team_athletes") {
          return createChainMock(); // delete succeeds
        }
        return createChainMock();
      };

      const { removeAthleteFromTeam } = await import("./actions");
      const result = await removeAthleteFromTeam({
        teamId: TEAM_UUID,
        athleteId: ATHLETE_UUID,
      });
      expect(result.success).toBe(true);
    });

    it("returns DELETE_FAILED when team_athletes delete fails", async () => {
      fromHandler = (table: string) => {
        if (table === "team_members") {
          return createChainMock({ maybeSingleData: { id: "member-1" } });
        }
        if (table === "team_athletes") {
          return createChainMock({ deleteError: { message: "delete error" } });
        }
        return createChainMock();
      };

      const { removeAthleteFromTeam } = await import("./actions");
      const result = await removeAthleteFromTeam({
        teamId: TEAM_UUID,
        athleteId: ATHLETE_UUID,
      });
      expect(result).toEqual({ success: false, error: "DELETE_FAILED" });
    });

    it("disconnects PROJ-5 connection when disconnectFromProj5 is true", async () => {
      fromHandler = (table: string) => {
        if (table === "team_members") {
          return createChainMock({ maybeSingleData: { id: "member-1" } });
        }
        if (table === "team_athletes") {
          return createChainMock(); // delete succeeds
        }
        if (table === "trainer_athlete_connections") {
          return createChainMock(); // update succeeds
        }
        return createChainMock();
      };

      const { removeAthleteFromTeam } = await import("./actions");
      const result = await removeAthleteFromTeam({
        teamId: TEAM_UUID,
        athleteId: ATHLETE_UUID,
        disconnectFromProj5: true,
      });
      expect(result.success).toBe(true);
      // Verify trainer_athlete_connections was accessed
      const fromCalls = mockSupabase.from.mock.calls.map((c: string[]) => c[0]);
      expect(fromCalls).toContain("trainer_athlete_connections");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // removeTrainerFromTeam
  // ═══════════════════════════════════════════════════════════════

  describe("removeTrainerFromTeam", () => {
    it("returns UNAUTHORIZED when not authenticated", async () => {
      setUnauthenticated();
      const { removeTrainerFromTeam } = await import("./actions");
      const result = await removeTrainerFromTeam({
        teamId: TEAM_UUID,
        userId: TRAINER_UUID,
      });
      expect(result).toEqual({ success: false, error: "UNAUTHORIZED" });
    });

    it("returns INVALID_INPUT for non-UUID teamId", async () => {
      const { removeTrainerFromTeam } = await import("./actions");
      const result = await removeTrainerFromTeam({
        teamId: "bad",
        userId: TRAINER_UUID,
      });
      expect(result).toEqual({ success: false, error: "INVALID_INPUT" });
    });

    it("returns INVALID_INPUT for non-UUID userId", async () => {
      const { removeTrainerFromTeam } = await import("./actions");
      const result = await removeTrainerFromTeam({
        teamId: TEAM_UUID,
        userId: "bad",
      });
      expect(result).toEqual({ success: false, error: "INVALID_INPUT" });
    });

    it("returns UNAUTHORIZED when user is not a team member", async () => {
      fromHandler = (table: string) => {
        if (table === "team_members") {
          return createChainMock({ maybeSingleData: null });
        }
        return createChainMock();
      };

      const { removeTrainerFromTeam } = await import("./actions");
      const result = await removeTrainerFromTeam({
        teamId: TEAM_UUID,
        userId: "22222222-3333-4444-8555-666666666666",
      });
      expect(result).toEqual({ success: false, error: "UNAUTHORIZED" });
    });

    it("returns success on self-leave", async () => {
      fromHandler = (table: string) => {
        if (table === "team_members") {
          return createChainMock({ maybeSingleData: { id: "member-1" } });
        }
        return createChainMock();
      };

      const { removeTrainerFromTeam } = await import("./actions");
      const result = await removeTrainerFromTeam({
        teamId: TEAM_UUID,
        userId: TRAINER_UUID,
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // leaveTeam
  // ═══════════════════════════════════════════════════════════════

  describe("leaveTeam", () => {
    it("returns UNAUTHORIZED when not authenticated", async () => {
      setUnauthenticated();
      const { leaveTeam } = await import("./actions");
      const result = await leaveTeam(TEAM_UUID);
      expect(result).toEqual({ success: false, error: "UNAUTHORIZED" });
    });

    it("returns INVALID_INPUT for non-UUID teamId", async () => {
      const { leaveTeam } = await import("./actions");
      const result = await leaveTeam("not-a-uuid");
      expect(result).toEqual({ success: false, error: "INVALID_INPUT" });
    });

    it("delegates to removeTrainerFromTeam with current user id", async () => {
      fromHandler = (table: string) => {
        if (table === "team_members") {
          return createChainMock({ maybeSingleData: { id: "member-1" } });
        }
        return createChainMock();
      };

      const { leaveTeam } = await import("./actions");
      const result = await leaveTeam(TEAM_UUID);
      expect(result.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // acceptTeamInvitation
  // ═══════════════════════════════════════════════════════════════

  describe("acceptTeamInvitation", () => {
    it("returns UNAUTHORIZED when not authenticated", async () => {
      setUnauthenticated();
      const { acceptTeamInvitation } = await import("./actions");
      const result = await acceptTeamInvitation(INVITATION_UUID);
      expect(result).toEqual({ success: false, error: "UNAUTHORIZED" });
    });

    it("returns NOT_FOUND when invitation does not exist", async () => {
      fromHandler = () => createChainMock({
        singleData: null,
        singleError: { message: "not found" },
      });

      const { acceptTeamInvitation } = await import("./actions");
      const result = await acceptTeamInvitation(INVITATION_UUID);
      expect(result).toEqual({ success: false, error: "NOT_FOUND" });
    });

    it("returns UNAUTHORIZED when invitation is for a different email", async () => {
      fromHandler = () => createChainMock({
        singleData: {
          id: INVITATION_UUID,
          team_id: TEAM_UUID,
          email: "other@example.com",
          status: "pending",
          expires_at: new Date(Date.now() + 86400000).toISOString(),
        },
      });

      const { acceptTeamInvitation } = await import("./actions");
      const result = await acceptTeamInvitation(INVITATION_UUID);
      expect(result).toEqual({ success: false, error: "UNAUTHORIZED" });
    });

    it("returns EXPIRED when invitation has expired", async () => {
      fromHandler = () => createChainMock({
        singleData: {
          id: INVITATION_UUID,
          team_id: TEAM_UUID,
          email: "trainer@example.com",
          status: "pending",
          expires_at: new Date(Date.now() - 86400000).toISOString(),
        },
      });

      const { acceptTeamInvitation } = await import("./actions");
      const result = await acceptTeamInvitation(INVITATION_UUID);
      expect(result).toEqual({ success: false, error: "EXPIRED" });
    });

    it("returns success with teamId on valid acceptance", async () => {
      let invitationCallCount = 0;
      fromHandler = (table: string) => {
        if (table === "team_invitations") {
          invitationCallCount++;
          if (invitationCallCount === 1) {
            return createChainMock({
              singleData: {
                id: INVITATION_UUID,
                team_id: TEAM_UUID,
                email: "trainer@example.com",
                status: "pending",
                expires_at: new Date(Date.now() + 86400000).toISOString(),
              },
            });
          }
          return createChainMock(); // update status to accepted
        }
        if (table === "team_members") {
          return createChainMock(); // upsert succeeds
        }
        return createChainMock();
      };

      const { acceptTeamInvitation } = await import("./actions");
      const result = await acceptTeamInvitation(INVITATION_UUID);
      expect(result.success).toBe(true);
      expect(result.teamId).toBe(TEAM_UUID);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // declineTeamInvitation
  // ═══════════════════════════════════════════════════════════════

  describe("declineTeamInvitation", () => {
    it("returns UNAUTHORIZED when not authenticated", async () => {
      setUnauthenticated();
      const { declineTeamInvitation } = await import("./actions");
      const result = await declineTeamInvitation(INVITATION_UUID);
      expect(result).toEqual({ success: false, error: "UNAUTHORIZED" });
    });

    it("returns NOT_FOUND when invitation does not exist", async () => {
      fromHandler = () => createChainMock({
        singleData: null,
        singleError: { message: "not found" },
      });

      const { declineTeamInvitation } = await import("./actions");
      const result = await declineTeamInvitation(INVITATION_UUID);
      expect(result).toEqual({ success: false, error: "NOT_FOUND" });
    });

    it("returns UNAUTHORIZED when invitation email does not match user", async () => {
      fromHandler = () => createChainMock({
        singleData: {
          id: INVITATION_UUID,
          email: "other@example.com",
          status: "pending",
        },
      });

      const { declineTeamInvitation } = await import("./actions");
      const result = await declineTeamInvitation(INVITATION_UUID);
      expect(result).toEqual({ success: false, error: "UNAUTHORIZED" });
    });

    it("returns success when invitation is declined", async () => {
      let invitationCallCount = 0;
      fromHandler = (table: string) => {
        if (table === "team_invitations") {
          invitationCallCount++;
          if (invitationCallCount === 1) {
            return createChainMock({
              singleData: {
                id: INVITATION_UUID,
                email: "trainer@example.com",
                status: "pending",
              },
            });
          }
          return createChainMock(); // update status to declined
        }
        return createChainMock();
      };

      const { declineTeamInvitation } = await import("./actions");
      const result = await declineTeamInvitation(INVITATION_UUID);
      expect(result.success).toBe(true);
    });

    it("returns UPDATE_FAILED when decline update errors", async () => {
      let invitationCallCount = 0;
      fromHandler = (table: string) => {
        if (table === "team_invitations") {
          invitationCallCount++;
          if (invitationCallCount === 1) {
            return createChainMock({
              singleData: {
                id: INVITATION_UUID,
                email: "trainer@example.com",
                status: "pending",
              },
            });
          }
          return createChainMock({ updateError: { message: "update failed" } });
        }
        return createChainMock();
      };

      const { declineTeamInvitation } = await import("./actions");
      const result = await declineTeamInvitation(INVITATION_UUID);
      expect(result).toEqual({ success: false, error: "UPDATE_FAILED" });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Zod schema validation
  // ═══════════════════════════════════════════════════════════════

  describe("cancelTeamInvitationSchema validation", () => {
    it("accepts valid UUIDs", async () => {
      const { cancelTeamInvitationSchema } = await import("@/lib/validations/teams");
      const result = cancelTeamInvitationSchema.safeParse({
        teamId: TEAM_UUID,
        invitationId: INVITATION_UUID,
      });
      expect(result.success).toBe(true);
    });

    it("rejects non-UUID teamId", async () => {
      const { cancelTeamInvitationSchema } = await import("@/lib/validations/teams");
      const result = cancelTeamInvitationSchema.safeParse({
        teamId: "not-a-uuid",
        invitationId: INVITATION_UUID,
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-UUID invitationId", async () => {
      const { cancelTeamInvitationSchema } = await import("@/lib/validations/teams");
      const result = cancelTeamInvitationSchema.safeParse({
        teamId: TEAM_UUID,
        invitationId: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing teamId", async () => {
      const { cancelTeamInvitationSchema } = await import("@/lib/validations/teams");
      const result = cancelTeamInvitationSchema.safeParse({
        invitationId: INVITATION_UUID,
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing invitationId", async () => {
      const { cancelTeamInvitationSchema } = await import("@/lib/validations/teams");
      const result = cancelTeamInvitationSchema.safeParse({
        teamId: TEAM_UUID,
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty object", async () => {
      const { cancelTeamInvitationSchema } = await import("@/lib/validations/teams");
      const result = cancelTeamInvitationSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("createTeamSchema validation", () => {
    it("accepts valid input", async () => {
      const { createTeamSchema } = await import("@/lib/validations/teams");
      const result = createTeamSchema.safeParse({ name: "My Team" });
      expect(result.success).toBe(true);
    });

    it("accepts name with description", async () => {
      const { createTeamSchema } = await import("@/lib/validations/teams");
      const result = createTeamSchema.safeParse({ name: "My Team", description: "A description" });
      expect(result.success).toBe(true);
    });

    it("rejects empty name", async () => {
      const { createTeamSchema } = await import("@/lib/validations/teams");
      const result = createTeamSchema.safeParse({ name: "" });
      expect(result.success).toBe(false);
    });

    it("rejects name over 100 chars", async () => {
      const { createTeamSchema } = await import("@/lib/validations/teams");
      const result = createTeamSchema.safeParse({ name: "A".repeat(101) });
      expect(result.success).toBe(false);
    });

    it("rejects description over 500 chars", async () => {
      const { createTeamSchema } = await import("@/lib/validations/teams");
      const result = createTeamSchema.safeParse({ name: "Team", description: "B".repeat(501) });
      expect(result.success).toBe(false);
    });
  });

  describe("assignAthletesSchema validation", () => {
    it("accepts valid input with athletes", async () => {
      const { assignAthletesSchema } = await import("@/lib/validations/teams");
      const result = assignAthletesSchema.safeParse({
        teamId: TEAM_UUID,
        athleteIds: [ATHLETE_UUID],
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty athleteIds array", async () => {
      const { assignAthletesSchema } = await import("@/lib/validations/teams");
      const result = assignAthletesSchema.safeParse({
        teamId: TEAM_UUID,
        athleteIds: [],
      });
      expect(result.success).toBe(true);
    });

    it("rejects non-UUID in athleteIds", async () => {
      const { assignAthletesSchema } = await import("@/lib/validations/teams");
      const result = assignAthletesSchema.safeParse({
        teamId: TEAM_UUID,
        athleteIds: ["bad-id"],
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-UUID teamId", async () => {
      const { assignAthletesSchema } = await import("@/lib/validations/teams");
      const result = assignAthletesSchema.safeParse({
        teamId: "bad",
        athleteIds: [ATHLETE_UUID],
      });
      expect(result.success).toBe(false);
    });
  });
});
