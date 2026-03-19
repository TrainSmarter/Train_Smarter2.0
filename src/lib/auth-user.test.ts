import { describe, it, expect } from "vitest";
import { toAuthUser } from "./auth-user";
import type { User } from "@supabase/supabase-js";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-123",
    email: "test@example.com",
    app_metadata: {
      roles: ["TRAINER"],
      is_platform_admin: false,
    },
    user_metadata: {
      first_name: "Max",
      last_name: "Mustermann",
      avatar_url: "https://example.com/avatar.jpg",
    },
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as User;
}

describe("toAuthUser", () => {
  it("maps all fields correctly from a full Supabase User", () => {
    const user = makeUser();
    const result = toAuthUser(user);

    expect(result).toEqual({
      id: "user-123",
      email: "test@example.com",
      user_metadata: {
        first_name: "Max",
        last_name: "Mustermann",
        avatar_url: "https://example.com/avatar.jpg",
      },
      app_metadata: {
        roles: ["TRAINER"],
        is_platform_admin: false,
      },
    });
  });

  it("defaults email to empty string when null", () => {
    const user = makeUser({ email: undefined });
    const result = toAuthUser(user);
    expect(result.email).toBe("");
  });

  it("defaults first_name and last_name to empty strings when missing", () => {
    const user = makeUser({ user_metadata: {} });
    const result = toAuthUser(user);
    expect(result.user_metadata.first_name).toBe("");
    expect(result.user_metadata.last_name).toBe("");
  });

  it("defaults avatar_url to undefined when missing", () => {
    const user = makeUser({
      user_metadata: { first_name: "A", last_name: "B" },
    });
    const result = toAuthUser(user);
    expect(result.user_metadata.avatar_url).toBeUndefined();
  });

  it("defaults roles to empty array when missing", () => {
    const user = makeUser({ app_metadata: {} });
    const result = toAuthUser(user);
    expect(result.app_metadata.roles).toEqual([]);
  });

  it("defaults is_platform_admin to false when missing", () => {
    const user = makeUser({ app_metadata: { roles: ["ATHLETE"] } });
    const result = toAuthUser(user);
    expect(result.app_metadata.is_platform_admin).toBe(false);
  });

  it("correctly identifies platform admin", () => {
    const user = makeUser({
      app_metadata: {
        roles: ["TRAINER"],
        is_platform_admin: true,
      },
    });
    const result = toAuthUser(user);
    expect(result.app_metadata.is_platform_admin).toBe(true);
  });

  it("handles dual roles (future PROJ-11+)", () => {
    const user = makeUser({
      app_metadata: {
        roles: ["TRAINER", "ATHLETE"],
        is_platform_admin: false,
      },
    });
    const result = toAuthUser(user);
    expect(result.app_metadata.roles).toEqual(["TRAINER", "ATHLETE"]);
  });
});
