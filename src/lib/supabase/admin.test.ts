import { describe, it, expect, vi, afterEach } from "vitest";

// Mock @supabase/supabase-js before importing the module under test
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn().mockReturnValue({ from: vi.fn() }),
}));

// Mock @/lib/env to provide test values
vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://test-project.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key-123",
  },
}));

import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "./admin";

const mockCreateClient = vi.mocked(createClient);

describe("createAdminClient", () => {
  afterEach(() => {
    mockCreateClient.mockClear();
  });

  it("calls createClient with the correct Supabase URL", () => {
    createAdminClient();
    expect(mockCreateClient).toHaveBeenCalledWith(
      "https://test-project.supabase.co",
      expect.any(String),
      expect.any(Object)
    );
  });

  it("calls createClient with the service role key", () => {
    createAdminClient();
    expect(mockCreateClient).toHaveBeenCalledWith(
      expect.any(String),
      "test-service-role-key-123",
      expect.any(Object)
    );
  });

  it("disables autoRefreshToken in auth options", () => {
    createAdminClient();
    const options = mockCreateClient.mock.calls[0][2] as {
      auth: { autoRefreshToken: boolean };
    };
    expect(options.auth.autoRefreshToken).toBe(false);
  });

  it("disables persistSession in auth options", () => {
    createAdminClient();
    const options = mockCreateClient.mock.calls[0][2] as {
      auth: { persistSession: boolean };
    };
    expect(options.auth.persistSession).toBe(false);
  });

  it("returns the client created by createClient", () => {
    const fakeClient = { from: vi.fn(), auth: {} };
    mockCreateClient.mockReturnValueOnce(fakeClient as never);

    const result = createAdminClient();
    expect(result).toBe(fakeClient);
  });
});
