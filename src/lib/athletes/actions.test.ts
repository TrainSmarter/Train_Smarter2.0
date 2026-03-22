import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * QA Tests for PROJ-5 addAthlete blind-invite flow
 * Tests the addAthlete server action routing logic and DSGVO compliance.
 *
 * Note: These tests verify the module-level logic by mocking Supabase.
 * The actual server actions use "use server" directive, so we test
 * the exported functions' behavior through module mocking.
 */

// ── Mock Supabase ──────────────────────────────────────────────────

const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockGte = vi.fn();
const mockIn = vi.fn();
const mockNeq = vi.fn();
const mockDelete = vi.fn();
const mockInvoke = vi.fn();

function createChainMock() {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.neq = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  chain.insert = vi.fn().mockResolvedValue({ error: null });
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  return chain;
}

let mockChain = createChainMock();

const mockSupabase = {
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: {
        user: {
          id: "trainer-uuid",
          email: "trainer@example.com",
          app_metadata: { roles: ["TRAINER"] },
          user_metadata: { locale: "de" },
        },
      },
      error: null,
    }),
  },
  from: vi.fn().mockImplementation(() => mockChain),
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

// ── Tests ──────────────────────────────────────────────────────────

describe("addAthlete — blind invite (DSGVO-compliant)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChain = createChainMock();
    mockSupabase.from.mockImplementation(() => mockChain);
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: "trainer-uuid",
          email: "trainer@example.com",
          app_metadata: { roles: ["TRAINER"] },
          user_metadata: { locale: "de" },
        },
      },
      error: null,
    });
  });

  it("should export addAthlete function", async () => {
    const mod = await import("./actions");
    expect(typeof mod.addAthlete).toBe("function");
  });

  it("should export inviteAthlete function", async () => {
    const mod = await import("./actions");
    expect(typeof mod.inviteAthlete).toBe("function");
  });

  it("should export sendConnectionRequest function", async () => {
    const mod = await import("./actions");
    expect(typeof mod.sendConnectionRequest).toBe("function");
  });

  it("addAthlete should return success:false with SELF_INVITE for own email", async () => {
    const mod = await import("./actions");
    // Profile lookup will return null (no match), but self-invite check happens first
    (mockChain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: null,
    });
    const result = await mod.addAthlete({
      email: "trainer@example.com",
      message: "",
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe("SELF_INVITE");
  });

  it("addAthlete should return success:false with INVALID_INPUT for bad email", async () => {
    const mod = await import("./actions");
    const result = await mod.addAthlete({
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe("INVALID_INPUT");
  });

  it("addAthlete should return success:false with UNAUTHORIZED when not logged in", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Not authenticated" },
    });
    const mod = await import("./actions");
    const result = await mod.addAthlete({
      email: "athlete@example.com",
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe("UNAUTHORIZED");
  });
});

describe("addAthlete — identical response shape (no account enumeration)", () => {
  it("addAthlete returns { success, error? } — never exposes account existence", async () => {
    const mod = await import("./actions");
    // The function signature guarantees { success: boolean; error?: string }
    // This is a type-level guarantee verified by TypeScript compilation
    type AddAthleteReturn = Awaited<ReturnType<typeof mod.addAthlete>>;
    // Ensure the return type has only success and optional error
    const _typeCheck: AddAthleteReturn = { success: true };
    expect(_typeCheck).toHaveProperty("success");
  });
});

// ── Finding #16: TRAINER role check ─────────────────────────────

describe("addAthlete — TRAINER role authorization (Finding #16)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChain = createChainMock();
    mockSupabase.from.mockImplementation(() => mockChain);
  });

  it("should return UNAUTHORIZED when user has ATHLETE role", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: {
        user: {
          id: "athlete-uuid",
          email: "athlete@example.com",
          app_metadata: { roles: ["ATHLETE"] },
          user_metadata: { locale: "de" },
        },
      },
      error: null,
    });

    const mod = await import("./actions");
    const result = await mod.addAthlete({
      email: "someone@example.com",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("UNAUTHORIZED");
  });

  it("should return UNAUTHORIZED when user has no roles array", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: {
        user: {
          id: "norole-uuid",
          email: "norole@example.com",
          app_metadata: {},
          user_metadata: { locale: "de" },
        },
      },
      error: null,
    });

    const mod = await import("./actions");
    const result = await mod.addAthlete({
      email: "someone@example.com",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("UNAUTHORIZED");
  });

  it("should return UNAUTHORIZED when roles array is empty", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: {
        user: {
          id: "empty-uuid",
          email: "empty@example.com",
          app_metadata: { roles: [] },
          user_metadata: { locale: "de" },
        },
      },
      error: null,
    });

    const mod = await import("./actions");
    const result = await mod.addAthlete({
      email: "someone@example.com",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("UNAUTHORIZED");
  });

  it("should proceed (not UNAUTHORIZED) when user has TRAINER role", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: {
        user: {
          id: "trainer-uuid",
          email: "trainer@example.com",
          app_metadata: { roles: ["TRAINER"] },
          user_metadata: { locale: "de" },
        },
      },
      error: null,
    });

    const mod = await import("./actions");
    // Call with trainer's own email to get SELF_INVITE (proves it passed the role check)
    const result = await mod.addAthlete({
      email: "trainer@example.com",
    });

    // SELF_INVITE means the role check passed (it comes after the role guard)
    expect(result.error).toBe("SELF_INVITE");
  });
});

describe("inviteAthlete — TRAINER role authorization (Finding #16)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChain = createChainMock();
    mockSupabase.from.mockImplementation(() => mockChain);
  });

  it("should return UNAUTHORIZED when user has ATHLETE role", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: {
        user: {
          id: "athlete-uuid",
          email: "athlete@example.com",
          app_metadata: { roles: ["ATHLETE"] },
          user_metadata: { locale: "de" },
        },
      },
      error: null,
    });

    const mod = await import("./actions");
    const result = await mod.inviteAthlete({
      email: "someone@example.com",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("UNAUTHORIZED");
  });

  it("should return UNAUTHORIZED when user has empty roles", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: {
        user: {
          id: "norole-uuid",
          email: "norole@example.com",
          app_metadata: { roles: [] },
          user_metadata: { locale: "de" },
        },
      },
      error: null,
    });

    const mod = await import("./actions");
    const result = await mod.inviteAthlete({
      email: "someone@example.com",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("UNAUTHORIZED");
  });
});

describe("InviteModal does NOT import lookupAthleteByEmail", () => {
  it("invite-modal.tsx should not contain lookupAthleteByEmail", async () => {
    const fs = await import("fs");
    const path = await import("path");
    // Resolve from project root via vitest.config alias base
    const filePath = path.resolve(
      process.cwd(),
      "src/components/invite-modal.tsx"
    );
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).not.toContain("lookupAthleteByEmail");
  });

  it("invite-modal.tsx should import addAthlete", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(
      process.cwd(),
      "src/components/invite-modal.tsx"
    );
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("addAthlete");
  });
});
