import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests for PROJ-9 Team Management query functions.
 *
 * Covers: fetchTeams, fetchTeamDetail, fetchTeamMembers, fetchTeamAthletes,
 * fetchAssignableAthletes, fetchTeamInvitations, fetchAthleteTeams,
 * fetchAllTeamAthletes, fetchTeamInvitationByToken, fetchMyTeamInvitations.
 */

// ── Chainable Supabase mock builder ─────────────────────────────

function createChainMock(opts?: {
  singleData?: unknown;
  singleError?: unknown;
  maybeSingleData?: unknown;
  maybeSingleError?: unknown;
  selectData?: unknown;
  selectError?: unknown;
  countData?: number | null;
}) {
  const o = opts ?? {};
  const chain: Record<string, unknown> = {};
  const result = {
    data: o.selectData ?? null,
    error: o.selectError ?? null,
    count: o.countData ?? null,
  };

  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.is = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);

  chain.single = vi.fn().mockResolvedValue({
    data: o.singleData ?? null,
    error: o.singleError ?? null,
  });
  chain.maybeSingle = vi.fn().mockResolvedValue({
    data: o.maybeSingleData ?? null,
    error: o.maybeSingleError ?? null,
  });

  // Make chain thenable for Promise.all and direct await
  chain.then = vi.fn().mockImplementation(
    (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => {
      return Promise.resolve(result).then(resolve, reject);
    }
  );

  return chain;
}

// ── Mock setup ──────────────────────────────────────────────────

const TRAINER_UUID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const TEAM_UUID = "99999999-8888-4777-8666-555555555555";

let fromHandler: (table: string) => unknown;

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn().mockImplementation((table: string) => {
    if (fromHandler) return fromHandler(table);
    return createChainMock();
  }),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase)),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
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

// ── Tests ───────────────────────────────────────────────────────

describe("PROJ-9: Team Queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthenticated();
    fromHandler = () => createChainMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // fetchTeams
  // ═══════════════════════════════════════════════════════════════

  describe("fetchTeams", () => {
    it("returns empty array when user is not authenticated", async () => {
      setUnauthenticated();
      const { fetchTeams } = await import("./queries");
      const result = await fetchTeams();
      expect(result).toEqual([]);
    });

    it("returns empty array when user has no team memberships", async () => {
      fromHandler = () => createChainMock({ selectData: [] });

      const { fetchTeams } = await import("./queries");
      const result = await fetchTeams();
      expect(result).toEqual([]);
    });

    it("returns empty array when memberships query errors", async () => {
      fromHandler = () => createChainMock({
        selectData: null,
        selectError: { message: "error" },
      });

      const { fetchTeams } = await import("./queries");
      const result = await fetchTeams();
      expect(result).toEqual([]);
    });

    it("uses Promise.all to run teams, members, athletes queries in parallel", async () => {
      const teamMemberships = [{ team_id: TEAM_UUID }];
      const teams = [
        {
          id: TEAM_UUID,
          name: "Test Team",
          description: "A team",
          logo_url: null,
          created_at: "2026-03-20T00:00:00Z",
        },
      ];
      const memberCounts = [{ team_id: TEAM_UUID }, { team_id: TEAM_UUID }];
      const athleteCounts = [{ team_id: TEAM_UUID }];

      let memberCallCount = 0;
      fromHandler = (table: string) => {
        if (table === "team_members") {
          memberCallCount++;
          if (memberCallCount === 1) {
            return createChainMock({ selectData: teamMemberships });
          }
          return createChainMock({ selectData: memberCounts });
        }
        if (table === "teams") {
          return createChainMock({ selectData: teams });
        }
        if (table === "team_athletes") {
          return createChainMock({ selectData: athleteCounts });
        }
        return createChainMock();
      };

      const { fetchTeams } = await import("./queries");
      const result = await fetchTeams();

      // Verify from() was called for all expected tables
      const fromCalls = mockSupabase.from.mock.calls.map((c: string[]) => c[0]);
      expect(fromCalls).toContain("team_members");
      expect(fromCalls).toContain("teams");
      expect(fromCalls).toContain("team_athletes");
    });

    it("returns teams with correct trainerCount and athleteCount", async () => {
      const teamMemberships = [{ team_id: TEAM_UUID }];
      const teams = [
        {
          id: TEAM_UUID,
          name: "My Team",
          description: null,
          logo_url: null,
          created_at: "2026-03-20T00:00:00Z",
        },
      ];
      const memberCounts = [{ team_id: TEAM_UUID }, { team_id: TEAM_UUID }];
      const athleteCounts = [
        { team_id: TEAM_UUID },
        { team_id: TEAM_UUID },
        { team_id: TEAM_UUID },
      ];

      let memberCallCount = 0;
      fromHandler = (table: string) => {
        if (table === "team_members") {
          memberCallCount++;
          if (memberCallCount === 1) {
            return createChainMock({ selectData: teamMemberships });
          }
          return createChainMock({ selectData: memberCounts });
        }
        if (table === "teams") {
          return createChainMock({ selectData: teams });
        }
        if (table === "team_athletes") {
          return createChainMock({ selectData: athleteCounts });
        }
        return createChainMock();
      };

      const { fetchTeams } = await import("./queries");
      const result = await fetchTeams();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(TEAM_UUID);
      expect(result[0].name).toBe("My Team");
      expect(result[0].trainerCount).toBe(2);
      expect(result[0].athleteCount).toBe(3);
      expect(result[0].description).toBeNull();
    });

    it("returns empty array when teams query errors", async () => {
      let memberCallCount = 0;
      fromHandler = (table: string) => {
        if (table === "team_members") {
          memberCallCount++;
          if (memberCallCount === 1) {
            return createChainMock({ selectData: [{ team_id: TEAM_UUID }] });
          }
          return createChainMock({ selectData: [] });
        }
        if (table === "teams") {
          return createChainMock({
            selectData: null,
            selectError: { message: "query error" },
          });
        }
        return createChainMock({ selectData: [] });
      };

      const { fetchTeams } = await import("./queries");
      const result = await fetchTeams();
      expect(result).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // fetchTeamDetail
  // ═══════════════════════════════════════════════════════════════

  describe("fetchTeamDetail", () => {
    it("returns null when user is not authenticated", async () => {
      setUnauthenticated();
      const { fetchTeamDetail } = await import("./queries");
      const result = await fetchTeamDetail(TEAM_UUID);
      expect(result).toBeNull();
    });

    it("returns null when team is not found", async () => {
      fromHandler = () => createChainMock({
        singleData: null,
        singleError: { message: "not found" },
      });

      const { fetchTeamDetail } = await import("./queries");
      const result = await fetchTeamDetail(TEAM_UUID);
      expect(result).toBeNull();
    });

    it("returns team detail with correct field mapping", async () => {
      fromHandler = () => createChainMock({
        singleData: {
          id: TEAM_UUID,
          name: "Test Team",
          description: "A description",
          logo_url: "https://example.com/logo.png",
          created_by: TRAINER_UUID,
          archived_at: null,
          created_at: "2026-03-20T00:00:00Z",
        },
      });

      const { fetchTeamDetail } = await import("./queries");
      const result = await fetchTeamDetail(TEAM_UUID);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(TEAM_UUID);
      expect(result?.name).toBe("Test Team");
      expect(result?.description).toBe("A description");
      expect(result?.logoUrl).toBe("https://example.com/logo.png");
      expect(result?.createdBy).toBe(TRAINER_UUID);
      expect(result?.archivedAt).toBeNull();
      expect(result?.createdAt).toBe("2026-03-20T00:00:00Z");
    });

    it("returns archived team detail when archived_at is set", async () => {
      const archivedAt = "2026-03-21T00:00:00Z";
      fromHandler = () => createChainMock({
        singleData: {
          id: TEAM_UUID,
          name: "Archived Team",
          description: null,
          logo_url: null,
          created_by: TRAINER_UUID,
          archived_at: archivedAt,
          created_at: "2026-03-20T00:00:00Z",
        },
      });

      const { fetchTeamDetail } = await import("./queries");
      const result = await fetchTeamDetail(TEAM_UUID);

      expect(result).not.toBeNull();
      expect(result?.archivedAt).toBe(archivedAt);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // fetchTeamMembers
  // ═══════════════════════════════════════════════════════════════

  describe("fetchTeamMembers", () => {
    it("returns empty array when user is not authenticated", async () => {
      setUnauthenticated();
      const { fetchTeamMembers } = await import("./queries");
      const result = await fetchTeamMembers(TEAM_UUID);
      expect(result).toEqual([]);
    });

    it("returns empty array when no members found", async () => {
      fromHandler = () => createChainMock({ selectData: [] });

      const { fetchTeamMembers } = await import("./queries");
      const result = await fetchTeamMembers(TEAM_UUID);
      expect(result).toEqual([]);
    });

    it("returns empty array on query error", async () => {
      fromHandler = () => createChainMock({
        selectData: null,
        selectError: { message: "error" },
      });

      const { fetchTeamMembers } = await import("./queries");
      const result = await fetchTeamMembers(TEAM_UUID);
      expect(result).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // fetchTeamAthletes
  // ═══════════════════════════════════════════════════════════════

  describe("fetchTeamAthletes", () => {
    it("returns empty array when user is not authenticated", async () => {
      setUnauthenticated();
      const { fetchTeamAthletes } = await import("./queries");
      const result = await fetchTeamAthletes(TEAM_UUID);
      expect(result).toEqual([]);
    });

    it("returns empty array on error", async () => {
      fromHandler = () => createChainMock({
        selectData: null,
        selectError: { message: "err" },
      });

      const { fetchTeamAthletes } = await import("./queries");
      const result = await fetchTeamAthletes(TEAM_UUID);
      expect(result).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // fetchAssignableAthletes
  // ═══════════════════════════════════════════════════════════════

  describe("fetchAssignableAthletes", () => {
    it("returns empty array when user is not authenticated", async () => {
      setUnauthenticated();
      const { fetchAssignableAthletes } = await import("./queries");
      const result = await fetchAssignableAthletes(TEAM_UUID);
      expect(result).toEqual([]);
    });

    it("returns empty array when no active connections", async () => {
      fromHandler = () => createChainMock({
        selectData: null,
        selectError: { message: "none" },
      });

      const { fetchAssignableAthletes } = await import("./queries");
      const result = await fetchAssignableAthletes(TEAM_UUID);
      expect(result).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // fetchTeamInvitations
  // ═══════════════════════════════════════════════════════════════

  describe("fetchTeamInvitations", () => {
    it("returns empty array when user is not authenticated", async () => {
      setUnauthenticated();
      const { fetchTeamInvitations } = await import("./queries");
      const result = await fetchTeamInvitations(TEAM_UUID);
      expect(result).toEqual([]);
    });

    it("returns empty array on error", async () => {
      fromHandler = () => createChainMock({
        selectData: null,
        selectError: { message: "err" },
      });

      const { fetchTeamInvitations } = await import("./queries");
      const result = await fetchTeamInvitations(TEAM_UUID);
      expect(result).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // fetchAthleteTeams
  // ═══════════════════════════════════════════════════════════════

  describe("fetchAthleteTeams", () => {
    it("returns empty array when user is not authenticated", async () => {
      setUnauthenticated();
      const { fetchAthleteTeams } = await import("./queries");
      const result = await fetchAthleteTeams();
      expect(result).toEqual([]);
    });

    it("returns empty array when athlete has no team assignments", async () => {
      fromHandler = () => createChainMock({ selectData: [] });

      const { fetchAthleteTeams } = await import("./queries");
      const result = await fetchAthleteTeams();
      expect(result).toEqual([]);
    });

    it("returns empty array on query error", async () => {
      fromHandler = () => createChainMock({
        selectData: null,
        selectError: { message: "error" },
      });

      const { fetchAthleteTeams } = await import("./queries");
      const result = await fetchAthleteTeams();
      expect(result).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // fetchAllTeamAthletes
  // ═══════════════════════════════════════════════════════════════

  describe("fetchAllTeamAthletes", () => {
    it("returns empty object when user is not authenticated", async () => {
      setUnauthenticated();
      const { fetchAllTeamAthletes } = await import("./queries");
      const result = await fetchAllTeamAthletes();
      expect(result).toEqual({});
    });

    it("returns empty object when no memberships exist", async () => {
      fromHandler = () => createChainMock({ selectData: [] });

      const { fetchAllTeamAthletes } = await import("./queries");
      const result = await fetchAllTeamAthletes();
      expect(result).toEqual({});
    });

    it("returns empty object when assignments query errors", async () => {
      let memberCallCount = 0;
      fromHandler = (table: string) => {
        if (table === "team_members") {
          memberCallCount++;
          if (memberCallCount === 1) {
            return createChainMock({ selectData: [{ team_id: TEAM_UUID }] });
          }
        }
        if (table === "team_athletes") {
          return createChainMock({
            selectData: null,
            selectError: { message: "error" },
          });
        }
        return createChainMock({ selectData: [] });
      };

      const { fetchAllTeamAthletes } = await import("./queries");
      const result = await fetchAllTeamAthletes();
      expect(result).toEqual({});
    });

    it("returns athlete-team map for valid data", async () => {
      const athleteId1 = "11111111-2222-4333-8444-555555555555";
      const athleteId2 = "22222222-3333-4444-8555-666666666666";

      let memberCallCount = 0;
      fromHandler = (table: string) => {
        if (table === "team_members") {
          memberCallCount++;
          return createChainMock({ selectData: [{ team_id: TEAM_UUID }] });
        }
        if (table === "team_athletes") {
          return createChainMock({
            selectData: [
              { athlete_id: athleteId1, team_id: TEAM_UUID },
              { athlete_id: athleteId2, team_id: TEAM_UUID },
            ],
          });
        }
        return createChainMock({ selectData: [] });
      };

      const { fetchAllTeamAthletes } = await import("./queries");
      const result = await fetchAllTeamAthletes();
      expect(result[athleteId1]).toBe(TEAM_UUID);
      expect(result[athleteId2]).toBe(TEAM_UUID);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // fetchTeamInvitationByToken
  // ═══════════════════════════════════════════════════════════════

  describe("fetchTeamInvitationByToken", () => {
    it("returns null when token is not found", async () => {
      fromHandler = () => createChainMock({
        singleData: null,
        singleError: { message: "not found" },
      });

      const { fetchTeamInvitationByToken } = await import("./queries");
      const result = await fetchTeamInvitationByToken("invalid-token");
      expect(result).toBeNull();
    });

    it("returns invitation with isExpired=true for expired invite", async () => {
      fromHandler = () => createChainMock({
        singleData: {
          id: "invite-1",
          team_id: TEAM_UUID,
          email: "invited@example.com",
          personal_message: null,
          status: "pending",
          expires_at: new Date(Date.now() - 86400000).toISOString(),
          created_at: "2026-03-19T00:00:00Z",
          inviter: { first_name: "Max", last_name: "Trainer" },
          team: { name: "Test Team" },
        },
      });

      const { fetchTeamInvitationByToken } = await import("./queries");
      const result = await fetchTeamInvitationByToken("valid-token");

      expect(result).not.toBeNull();
      expect(result?.isExpired).toBe(true);
      expect(result?.invitation.email).toBe("invited@example.com");
      expect(result?.invitation.teamName).toBe("Test Team");
      expect(result?.invitation.invitedByName).toBe("Max Trainer");
    });

    it("returns invitation with isExpired=false for valid invite", async () => {
      fromHandler = () => createChainMock({
        singleData: {
          id: "invite-1",
          team_id: TEAM_UUID,
          email: "invited@example.com",
          personal_message: "Welcome!",
          status: "pending",
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          created_at: "2026-03-20T00:00:00Z",
          inviter: { first_name: "Max", last_name: "Trainer" },
          team: { name: "Test Team" },
        },
      });

      const { fetchTeamInvitationByToken } = await import("./queries");
      const result = await fetchTeamInvitationByToken("valid-token");

      expect(result).not.toBeNull();
      expect(result?.isExpired).toBe(false);
      expect(result?.invitation.personalMessage).toBe("Welcome!");
    });

    it("handles null inviter/team gracefully", async () => {
      fromHandler = () => createChainMock({
        singleData: {
          id: "invite-1",
          team_id: TEAM_UUID,
          email: "invited@example.com",
          personal_message: null,
          status: "pending",
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          created_at: "2026-03-20T00:00:00Z",
          inviter: null,
          team: null,
        },
      });

      const { fetchTeamInvitationByToken } = await import("./queries");
      const result = await fetchTeamInvitationByToken("some-token");

      expect(result).not.toBeNull();
      expect(result?.invitation.invitedByName).toBe("");
      expect(result?.invitation.teamName).toBe("");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // fetchMyTeamInvitations
  // ═══════════════════════════════════════════════════════════════

  describe("fetchMyTeamInvitations", () => {
    it("returns empty array when user is not authenticated", async () => {
      setUnauthenticated();
      const { fetchMyTeamInvitations } = await import("./queries");
      const result = await fetchMyTeamInvitations();
      expect(result).toEqual([]);
    });

    it("returns empty array when user has no email", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: TRAINER_UUID,
            email: null,
            app_metadata: { roles: ["TRAINER"] },
          },
        },
        error: null,
      });

      const { fetchMyTeamInvitations } = await import("./queries");
      const result = await fetchMyTeamInvitations();
      expect(result).toEqual([]);
    });

    it("returns empty array on query error", async () => {
      fromHandler = () => createChainMock({
        selectData: null,
        selectError: { message: "err" },
      });

      const { fetchMyTeamInvitations } = await import("./queries");
      const result = await fetchMyTeamInvitations();
      expect(result).toEqual([]);
    });

    it("filters out expired invitations", async () => {
      const validExpiry = new Date(Date.now() + 86400000).toISOString();
      const expiredExpiry = new Date(Date.now() - 86400000).toISOString();

      fromHandler = () => createChainMock({
        selectData: [
          {
            id: "inv-1",
            team_id: TEAM_UUID,
            email: "trainer@example.com",
            personal_message: null,
            status: "pending",
            expires_at: validExpiry,
            created_at: "2026-03-20T00:00:00Z",
            inviter: { first_name: "A", last_name: "B" },
            team: { name: "Team 1" },
          },
          {
            id: "inv-2",
            team_id: TEAM_UUID,
            email: "trainer@example.com",
            personal_message: null,
            status: "pending",
            expires_at: expiredExpiry,
            created_at: "2026-03-19T00:00:00Z",
            inviter: { first_name: "C", last_name: "D" },
            team: { name: "Team 2" },
          },
        ],
      });

      const { fetchMyTeamInvitations } = await import("./queries");
      const result = await fetchMyTeamInvitations();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("inv-1");
      expect(result[0].teamName).toBe("Team 1");
    });

    it("returns all invitations when none are expired", async () => {
      const validExpiry = new Date(Date.now() + 86400000).toISOString();

      fromHandler = () => createChainMock({
        selectData: [
          {
            id: "inv-1",
            team_id: TEAM_UUID,
            email: "trainer@example.com",
            personal_message: null,
            status: "pending",
            expires_at: validExpiry,
            created_at: "2026-03-20T00:00:00Z",
            inviter: { first_name: "A", last_name: "B" },
            team: { name: "Team 1" },
          },
          {
            id: "inv-2",
            team_id: TEAM_UUID,
            email: "trainer@example.com",
            personal_message: "Hi!",
            status: "pending",
            expires_at: validExpiry,
            created_at: "2026-03-20T00:00:00Z",
            inviter: { first_name: "C", last_name: "D" },
            team: { name: "Team 2" },
          },
        ],
      });

      const { fetchMyTeamInvitations } = await import("./queries");
      const result = await fetchMyTeamInvitations();

      expect(result).toHaveLength(2);
    });
  });
});
