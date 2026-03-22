import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for POST /api/auth/set-role
 *
 * Validates auth guard, Zod validation, rate limiting (Finding #8),
 * metadata spread (Finding #15), and admin client usage (Finding #14).
 */

// ── Hoisted mocks (available inside vi.mock factories) ──────────

const {
  mockGetUser,
  mockMaybeSingle,
  mockSupabase,
  mockUpdateUserById,
  mockAdminClient,
  mockRateLimitCheck,
} = vi.hoisted(() => {
  const mockGetUser = vi.fn();
  const mockMaybeSingle = vi.fn();

  const mockSupabase = {
    auth: { getUser: mockGetUser },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: mockMaybeSingle,
            }),
          }),
        }),
      }),
    }),
  };

  const mockUpdateUserById = vi.fn();
  const mockAdminClient = {
    auth: {
      admin: {
        updateUserById: mockUpdateUserById,
      },
    },
  };

  const mockRateLimitCheck = vi.fn().mockReturnValue({ limited: false, remaining: 9, retryAfterMs: 0 });

  return { mockGetUser, mockMaybeSingle, mockSupabase, mockUpdateUserById, mockAdminClient, mockRateLimitCheck };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase)),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue(mockAdminClient),
}));

vi.mock("@/lib/rate-limit", () => ({
  authRateLimiter: { check: (...args: unknown[]) => mockRateLimitCheck(...args) },
  getRateLimitKey: vi.fn().mockReturnValue("user:test-user-id"),
}));

import { POST } from "./route";

// ── Helpers ─────────────────────────────────────────────────────

function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/set-role", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "127.0.0.1",
    },
    body: JSON.stringify(body),
  });
}

const MOCK_USER_NO_ROLES = {
  id: "test-user-id",
  email: "user@example.com",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
};

const MOCK_USER_WITH_TRAINER = {
  ...MOCK_USER_NO_ROLES,
  app_metadata: { roles: ["TRAINER"], provider: "email" },
};

const MOCK_USER_WITH_ATHLETE = {
  ...MOCK_USER_NO_ROLES,
  app_metadata: { roles: ["ATHLETE"], provider: "email" },
};

// ── Tests ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockRateLimitCheck.mockReturnValue({ limited: false, remaining: 9, retryAfterMs: 0 });
  mockUpdateUserById.mockResolvedValue({ error: null });
  mockMaybeSingle.mockResolvedValue({ data: { id: "consent-id" }, error: null });
});

describe("POST /api/auth/set-role: Auth guard", () => {
  it("should return 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const response = await POST(makeRequest({ role: "TRAINER" }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 when auth error occurs", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "JWT expired" },
    });

    const response = await POST(makeRequest({ role: "TRAINER" }));
    expect(response.status).toBe(401);
  });
});

describe("POST /api/auth/set-role: Rate limiting (Finding #8)", () => {
  it("should check rate limiter before processing", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER_NO_ROLES }, error: null });

    await POST(makeRequest({ role: "TRAINER" }));

    expect(mockRateLimitCheck).toHaveBeenCalled();
  });

  it("should return 429 when rate limited", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER_NO_ROLES }, error: null });
    mockRateLimitCheck.mockReturnValueOnce({ limited: true, remaining: 0, retryAfterMs: 30000 });

    const response = await POST(makeRequest({ role: "TRAINER" }));
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe("Too many requests");
  });
});

describe("POST /api/auth/set-role: Validation", () => {
  it("should return 400 for invalid role value", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER_NO_ROLES }, error: null });

    const response = await POST(makeRequest({ role: "ADMIN" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid role");
  });

  it("should return 400 for missing role field", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER_NO_ROLES }, error: null });

    const response = await POST(makeRequest({}));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid role");
  });

  it("should return 400 for numeric role", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER_NO_ROLES }, error: null });

    const response = await POST(makeRequest({ role: 123 }));
    expect(response.status).toBe(400);
  });

  it("should accept TRAINER as valid role", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER_NO_ROLES }, error: null });

    const response = await POST(makeRequest({ role: "TRAINER" }));

    expect(response.status).not.toBe(400);
  });

  it("should accept ATHLETE as valid role", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER_NO_ROLES }, error: null });

    const response = await POST(makeRequest({ role: "ATHLETE" }));

    expect(response.status).not.toBe(400);
  });
});

describe("POST /api/auth/set-role: Consent check", () => {
  it("should return 403 when user has no consent", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER_NO_ROLES }, error: null });
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const response = await POST(makeRequest({ role: "TRAINER" }));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("consent required");
  });

  it("should return 403 when consent query errors", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER_NO_ROLES }, error: null });
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: { message: "DB error" } });

    const response = await POST(makeRequest({ role: "TRAINER" }));
    expect(response.status).toBe(403);
  });
});

describe("POST /api/auth/set-role: Idempotent / role already set", () => {
  it("should return success when same role already set (idempotent)", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: MOCK_USER_WITH_TRAINER },
      error: null,
    });

    const response = await POST(makeRequest({ role: "TRAINER" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.role).toBe("TRAINER");
    // Should NOT call updateUserById since role already set
    expect(mockUpdateUserById).not.toHaveBeenCalled();
  });

  it("should return 409 when user tries to change role", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: MOCK_USER_WITH_TRAINER },
      error: null,
    });

    const response = await POST(makeRequest({ role: "ATHLETE" }));
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toContain("Cannot change");
  });
});

describe("POST /api/auth/set-role: Metadata spread (Finding #15)", () => {
  it("should spread existing app_metadata when setting role", async () => {
    const userWithMetadata = {
      ...MOCK_USER_NO_ROLES,
      app_metadata: { provider: "email", consent_given: true },
    };
    mockGetUser.mockResolvedValueOnce({ data: { user: userWithMetadata }, error: null });

    await POST(makeRequest({ role: "TRAINER" }));

    expect(mockUpdateUserById).toHaveBeenCalledWith("test-user-id", {
      app_metadata: {
        provider: "email",
        consent_given: true,
        roles: ["TRAINER"],
      },
    });
  });

  it("should NOT overwrite existing app_metadata fields", async () => {
    const userWithMetadata = {
      ...MOCK_USER_NO_ROLES,
      app_metadata: { provider: "google", some_flag: "keep_me" },
    };
    mockGetUser.mockResolvedValueOnce({ data: { user: userWithMetadata }, error: null });

    await POST(makeRequest({ role: "ATHLETE" }));

    const callArgs = mockUpdateUserById.mock.calls[0];
    expect(callArgs[1].app_metadata.provider).toBe("google");
    expect(callArgs[1].app_metadata.some_flag).toBe("keep_me");
    expect(callArgs[1].app_metadata.roles).toEqual(["ATHLETE"]);
  });
});

describe("POST /api/auth/set-role: Admin client (Finding #14)", () => {
  it("should use createAdminClient for role update", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER_NO_ROLES }, error: null });

    await POST(makeRequest({ role: "TRAINER" }));

    const { createAdminClient } = await import("@/lib/supabase/admin");
    expect(createAdminClient).toHaveBeenCalled();
  });

  it("should call admin.updateUserById with correct user ID", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER_NO_ROLES }, error: null });

    await POST(makeRequest({ role: "ATHLETE" }));

    expect(mockUpdateUserById).toHaveBeenCalledWith(
      "test-user-id",
      expect.objectContaining({
        app_metadata: expect.objectContaining({ roles: ["ATHLETE"] }),
      })
    );
  });
});

describe("POST /api/auth/set-role: Error handling", () => {
  it("should return 500 when updateUserById fails", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER_NO_ROLES }, error: null });
    mockUpdateUserById.mockResolvedValueOnce({ error: { message: "Service unavailable" } });

    const response = await POST(makeRequest({ role: "TRAINER" }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to set role");
  });

  it("should return 500 on unexpected errors", async () => {
    mockGetUser.mockRejectedValueOnce(new Error("Network failure"));

    const response = await POST(makeRequest({ role: "TRAINER" }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
