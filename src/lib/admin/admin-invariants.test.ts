import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * PROJ-10 Admin-Bereich — Source Code Invariant Tests
 *
 * Covers:
 * - Server Actions: auth checks, self-protection, ban/unban, role change, revalidation
 * - Queries: filtering, sorting, pagination, user mapping
 * - Admin layout: is_platform_admin guard
 * - Route: searchParams handling, data fetching
 * - i18n: admin namespace completeness
 * - Component invariants: no server imports in client components
 */

function readSrc(relativePath: string): string {
  return fs.readFileSync(
    path.resolve(__dirname, "../..", relativePath),
    "utf-8"
  );
}

// ══════════════════════════════════════════════════════════════════
// 1. Server Actions Invariants (actions.ts)
// ══════════════════════════════════════════════════════════════════

describe("PROJ-10 Server Actions invariants", () => {
  let actions: string;

  beforeEach(() => {
    actions = readSrc("lib/admin/actions.ts");
  });

  it('should be marked as "use server"', () => {
    expect(actions).toMatch(/^"use server"/);
  });

  describe("exported actions", () => {
    const actionNames = [
      "banUser",
      "unbanUser",
      "changeUserRole",
      "sendPasswordReset",
      "verifyPlatformAdmin",
      "getUserStatsAction",
      "checkIsSelfUserAction",
    ];

    it("should export all 7 functions", () => {
      for (const name of actionNames) {
        expect(actions).toContain(`export async function ${name}`);
      }
    });
  });

  describe("admin verification on every mutation", () => {
    it("should call verifyPlatformAdmin in banUser", () => {
      const banSection = actions.slice(
        actions.indexOf("async function banUser"),
        actions.indexOf("async function unbanUser")
      );
      expect(banSection).toContain("verifyPlatformAdmin()");
      expect(banSection).toContain('"UNAUTHORIZED"');
    });

    it("should call verifyPlatformAdmin in unbanUser", () => {
      const section = actions.slice(
        actions.indexOf("async function unbanUser"),
        actions.indexOf("async function changeUserRole")
      );
      expect(section).toContain("verifyPlatformAdmin()");
    });

    it("should call verifyPlatformAdmin in changeUserRole", () => {
      const section = actions.slice(
        actions.indexOf("async function changeUserRole"),
        actions.indexOf("async function sendPasswordReset")
      );
      expect(section).toContain("verifyPlatformAdmin()");
    });

    it("should call verifyPlatformAdmin in sendPasswordReset", () => {
      const section = actions.slice(
        actions.indexOf("async function sendPasswordReset"),
        actions.indexOf("async function verifyPlatformAdmin")
      );
      expect(section).toContain("verifyPlatformAdmin()");
    });
  });

  describe("self-protection guards", () => {
    it("should prevent admin from banning themselves", () => {
      expect(actions).toContain("CANNOT_BAN_SELF");
      // Check the guard compares userId to adminId
      const banSection = actions.slice(
        actions.indexOf("async function banUser"),
        actions.indexOf("async function unbanUser")
      );
      expect(banSection).toContain("userId === adminId");
    });

    it("should prevent admin from changing their own role", () => {
      expect(actions).toContain("CANNOT_CHANGE_OWN_ROLE");
      const roleSection = actions.slice(
        actions.indexOf("async function changeUserRole"),
        actions.indexOf("async function sendPasswordReset")
      );
      expect(roleSection).toContain("userId === adminId");
    });
  });

  describe("ban/unban mechanism", () => {
    it("should use permanent ban duration for banning", () => {
      expect(actions).toContain('ban_duration: "876000h"');
    });

    it('should use ban_duration: "none" for unbanning', () => {
      expect(actions).toContain('ban_duration: "none"');
    });

    it("should use auth.admin.updateUserById for both operations", () => {
      const updateCalls = actions.match(/auth\.admin\.updateUserById/g) ?? [];
      expect(updateCalls.length).toBeGreaterThanOrEqual(3); // ban, unban, role change
    });
  });

  describe("role change preserves existing metadata", () => {
    it("should spread existing app_metadata before setting roles", () => {
      expect(actions).toContain("...existingUser.user.app_metadata");
      expect(actions).toContain("roles: [newRole]");
    });

    it("should fetch existing user before updating role", () => {
      expect(actions).toContain("getUserById(userId)");
    });

    it("should validate role is TRAINER or ATHLETE", () => {
      expect(actions).toContain('"TRAINER"');
      expect(actions).toContain('"ATHLETE"');
      expect(actions).toContain('"INVALID_ROLE"');
    });
  });

  describe("password reset", () => {
    it("should validate email format", () => {
      expect(actions).toContain("!email.includes");
      expect(actions).toContain('"INVALID_EMAIL"');
    });

    it("should use generateLink with recovery type", () => {
      expect(actions).toContain('type: "recovery"');
      expect(actions).toContain("generateLink");
    });
  });

  describe("revalidation", () => {
    it("should revalidate /admin/users after mutations", () => {
      const revalidations = actions.match(
        /revalidatePath\("\/admin\/users"/g
      ) ?? [];
      expect(revalidations.length).toBeGreaterThanOrEqual(4); // ban, unban, role, reset
    });

    it('should use "page" scope', () => {
      expect(actions).not.toContain('"layout"');
    });
  });

  describe("service-role key security", () => {
    it("should use createAdminClient or env.SUPABASE_SERVICE_ROLE_KEY (not process.env)", () => {
      const usesAdminClient = actions.includes("createAdminClient");
      const usesEnvKey = actions.includes("env.SUPABASE_SERVICE_ROLE_KEY");
      expect(usesAdminClient || usesEnvKey).toBe(true);
      expect(actions).not.toContain("process.env.SUPABASE_SERVICE_ROLE_KEY");
    });

    it("should disable autoRefreshToken and persistSession (in admin client or inline)", () => {
      // autoRefreshToken/persistSession may be in the shared admin client (src/lib/supabase/admin.ts)
      // rather than inline in actions.ts — check both locations
      const adminClientSrc = readSrc("lib/supabase/admin.ts");
      const combined = actions + adminClientSrc;
      expect(combined).toContain("autoRefreshToken: false");
      expect(combined).toContain("persistSession: false");
    });
  });

  describe("verifyPlatformAdmin", () => {
    it("should check is_platform_admin in app_metadata", () => {
      expect(actions).toContain("is_platform_admin");
      expect(actions).toContain("app_metadata");
    });

    it("should return user.id on success, null on failure", () => {
      expect(actions).toContain("return user.id");
      expect(actions).toContain("return null");
    });
  });
});

// ══════════════════════════════════════════════════════════════════
// 2. Queries Invariants (queries.ts)
// ══════════════════════════════════════════════════════════════════

describe("PROJ-10 Queries invariants", () => {
  let queries: string;

  beforeEach(() => {
    queries = readSrc("lib/admin/queries.ts");
  });

  it("should NOT import from @/lib/supabase/server", () => {
    expect(queries).not.toContain("@/lib/supabase/server");
  });

  it("should export listUsers and getUser", () => {
    expect(queries).toContain("export async function listUsers");
    expect(queries).toContain("export async function getUser");
  });

  describe("listUsers filtering", () => {
    it("should support search filter (name + email)", () => {
      expect(queries).toContain("displayName.toLowerCase().includes(q)");
      expect(queries).toContain("email.toLowerCase().includes(q)");
    });

    it("should support role filter", () => {
      expect(queries).toContain("u.role === roleFilter");
    });

    it("should support status filter (active/banned)", () => {
      expect(queries).toContain("u.isBanned");
      expect(queries).toContain("!u.isBanned");
    });
  });

  describe("listUsers sorting", () => {
    it("should support all 4 sort fields", () => {
      expect(queries).toContain('case "name"');
      expect(queries).toContain('case "email"');
      expect(queries).toContain('case "createdAt"');
      expect(queries).toContain('case "lastSignInAt"');
    });

    it("should support asc and desc order", () => {
      expect(queries).toContain('sortOrder === "desc"');
    });

    it("should handle null lastSignInAt (fallback to 0)", () => {
      expect(queries).toContain("? new Date(a.lastSignInAt).getTime()");
      expect(queries).toContain(": 0");
    });
  });

  describe("listUsers pagination", () => {
    it("should calculate startIndex from page and perPage", () => {
      expect(queries).toContain("(page - 1) * perPage");
    });

    it("should slice results for pagination", () => {
      expect(queries).toContain("users.slice(startIndex, startIndex + perPage)");
    });

    it("should return totalCount (before pagination)", () => {
      expect(queries).toContain("totalCount");
      expect(queries).toContain("users.length");
    });
  });

  describe("mapToAdminUser", () => {
    it("should handle missing name fields", () => {
      expect(queries).toContain("first_name");
      expect(queries).toContain("last_name");
      expect(queries).toContain('filter(Boolean).join(" ")');
    });

    it("should fallback to email then 'Unknown' for displayName", () => {
      expect(queries).toContain("user.email");
      expect(queries).toContain('"Unknown"');
    });

    it("should determine isBanned from banned_until date", () => {
      expect(queries).toContain("banned_until");
      expect(queries).toContain("new Date(user.banned_until) > new Date()");
    });

    it("should map is_platform_admin from app_metadata", () => {
      expect(queries).toContain("is_platform_admin === true");
    });

    it("should map onboarding_completed from app_metadata", () => {
      expect(queries).toContain("onboarding_completed === true");
    });
  });

  describe("error handling", () => {
    it("should return empty result on listUsers error", () => {
      expect(queries).toContain("users: [], totalCount: 0");
    });

    it("should return null on getUser error", () => {
      expect(queries).toContain("return null");
    });
  });
});

// ══════════════════════════════════════════════════════════════════
// 3. Admin Layout Invariants
// ══════════════════════════════════════════════════════════════════

describe("PROJ-10 Admin Layout invariants", () => {
  let layout: string;

  beforeEach(() => {
    layout = readSrc("app/[locale]/(protected)/admin/layout.tsx");
  });

  it("should check is_platform_admin", () => {
    expect(layout).toContain("is_platform_admin");
  });

  it("should redirect non-admins to /dashboard", () => {
    expect(layout).toContain('redirect("/dashboard")');
  });

  it("should render children for admins", () => {
    expect(layout).toContain("{children}");
  });

  it("should be a server component (no 'use client')", () => {
    expect(layout).not.toContain('"use client"');
  });
});

// ══════════════════════════════════════════════════════════════════
// 4. Route Invariants
// ══════════════════════════════════════════════════════════════════

describe("PROJ-10 Route invariants", () => {
  let page: string;

  beforeEach(() => {
    page = readSrc("app/[locale]/(protected)/admin/users/page.tsx");
  });

  it("should read searchParams for filters", () => {
    expect(page).toContain("searchParams");
    expect(page).toContain("sp.q");
    expect(page).toContain("sp.role");
    expect(page).toContain("sp.status");
    expect(page).toContain("sp.sort");
    expect(page).toContain("sp.page");
  });

  it("should have generateMetadata with admin namespace", () => {
    expect(page).toContain("generateMetadata");
    expect(page).toContain('"admin"');
  });

  it("should call listUsers with constructed params", () => {
    expect(page).toContain("listUsers(params)");
  });

  it("should handle backend not ready gracefully", () => {
    expect(page).toContain("catch");
    expect(page).toContain("users: []");
  });

  it("should pass initialData and params to AdminUsersPage", () => {
    expect(page).toContain("initialData={result}");
    expect(page).toContain("params={params}");
  });
});

// ══════════════════════════════════════════════════════════════════
// 5. i18n Invariants
// ══════════════════════════════════════════════════════════════════

describe("PROJ-10 i18n invariants", () => {
  let deJson: Record<string, unknown>;
  let enJson: Record<string, unknown>;

  beforeEach(() => {
    deJson = JSON.parse(readSrc("messages/de.json"));
    enJson = JSON.parse(readSrc("messages/en.json"));
  });

  it('should have "admin" namespace in both languages', () => {
    expect(deJson).toHaveProperty("admin");
    expect(enJson).toHaveProperty("admin");
  });

  it("should have matching keys in de and en admin namespace", () => {
    const deKeys = Object.keys(
      deJson.admin as Record<string, unknown>
    ).sort();
    const enKeys = Object.keys(
      enJson.admin as Record<string, unknown>
    ).sort();
    expect(deKeys).toEqual(enKeys);
  });

  it("should have essential admin strings", () => {
    const de = deJson.admin as Record<string, string>;
    expect(de.pageTitle).toBeDefined();
    expect(de.searchPlaceholder).toBeDefined();
    expect(de.banUser).toBeDefined();
    expect(de.unbanUser).toBeDefined();
    expect(de.changeRole).toBeDefined();
    expect(de.sendPasswordReset).toBeDefined();
    expect(de.cannotBanSelf).toBeDefined();
    expect(de.cannotChangeOwnRole).toBeDefined();
  });

  it("should have correct German umlauts", () => {
    const de = deJson.admin as Record<string, string>;
    const allValues = Object.values(de).join(" ");
    expect(allValues).toContain("Ä"); // Älteste
    expect(allValues).not.toContain("Aelteste");
  });

  it("should have pagination strings", () => {
    const de = deJson.admin as Record<string, string>;
    expect(de.previousPage).toBeDefined();
    expect(de.nextPage).toBeDefined();
    expect(de.goToPage).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════════════════
// 6. Component Source Invariants
// ══════════════════════════════════════════════════════════════════

describe("PROJ-10 Component source invariants", () => {
  it("should NOT import queries.ts in client components", () => {
    const slideOver = readSrc(
      "components/admin/user-detail-slide-over.tsx"
    );
    // Should import from actions (server actions), not queries
    expect(slideOver).not.toContain('from "@/lib/admin/queries"');
    expect(slideOver).toContain("@/lib/admin/actions");
  });

  it("should use useTranslations in all admin components", () => {
    const components = [
      "components/admin/admin-users-page.tsx",
      "components/admin/users-table.tsx",
      "components/admin/user-detail-slide-over.tsx",
    ];
    for (const comp of components) {
      const source = readSrc(comp);
      expect(source).toContain("useTranslations");
    }
  });

  it("should use Sheet for user detail slide-over", () => {
    const slideOver = readSrc(
      "components/admin/user-detail-slide-over.tsx"
    );
    expect(slideOver).toContain("Sheet");
    expect(slideOver).toContain("SheetContent");
  });

  it("should use shadcn Table for users table", () => {
    const table = readSrc("components/admin/users-table.tsx");
    expect(table).toContain("Table");
    expect(table).toContain("TableHeader");
    expect(table).toContain("TableBody");
    expect(table).toContain("TableRow");
  });

  it("should have loading skeleton", () => {
    const loading = readSrc(
      "app/[locale]/(protected)/admin/users/loading.tsx"
    );
    expect(loading).toContain("Skeleton");
  });
});

// ══════════════════════════════════════════════════════════════════
// 7. Middleware Admin Guard (existing, verify still intact)
// ══════════════════════════════════════════════════════════════════

describe("PROJ-10 Middleware admin guard (existing)", () => {
  let middleware: string;

  beforeEach(() => {
    middleware = readSrc("middleware.ts");
  });

  it('should check is_platform_admin for /admin routes', () => {
    expect(middleware).toContain('startsWith("/admin")');
    expect(middleware).toContain("is_platform_admin");
  });

  it("should redirect non-admins to /dashboard", () => {
    // Check the admin guard redirects to dashboard
    const adminSection = middleware.slice(
      middleware.indexOf('startsWith("/admin")'),
      middleware.indexOf('startsWith("/admin")') + 200
    );
    expect(adminSection).toContain("dashboard");
  });
});

// ══════════════════════════════════════════════════════════════════
// 8. Nav Config Admin Entry (verify still intact)
// ══════════════════════════════════════════════════════════════════

describe("PROJ-10 Nav Config admin entry", () => {
  let navConfig: string;

  beforeEach(() => {
    navConfig = readSrc("lib/nav-config.ts");
  });

  it("should have admin nav section with requiresPlatformAdmin", () => {
    expect(navConfig).toContain('labelKey: "admin"');
    expect(navConfig).toContain("requiresPlatformAdmin: true");
    expect(navConfig).toContain('basePath: "/admin"');
  });

  it('should have users sub-item under admin section', () => {
    expect(navConfig).toContain('labelKey: "adminUsers"');
    expect(navConfig).toContain('path: "/admin/users"');
  });
});
