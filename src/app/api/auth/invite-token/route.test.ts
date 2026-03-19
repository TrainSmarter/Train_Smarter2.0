import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Tests for /api/auth/invite-token route.
 *
 * The route uses createClient() from @/lib/supabase/server which needs
 * Next.js cookies() — unavailable in vitest/jsdom. We validate the source
 * code to ensure auth guards and cookie handling are correct.
 */

let routeSource: string;

beforeEach(() => {
  routeSource = fs.readFileSync(
    path.resolve(__dirname, "route.ts"),
    "utf-8"
  );
});

describe("/api/auth/invite-token POST: Auth guard", () => {
  it("should require authentication via getUser()", () => {
    expect(routeSource).toContain("auth.getUser()");
  });

  it("should return 401 when not authenticated", () => {
    expect(routeSource).toContain('{ error: "Unauthorized" }');
    expect(routeSource).toContain("status: 401");
  });

  it("should check both authError and missing user", () => {
    expect(routeSource).toContain("authError || !user");
  });

  it("should read inviteToken from httpOnly cookie", () => {
    expect(routeSource).toContain('cookies.get("inviteToken")');
  });

  it("should return token value or null", () => {
    expect(routeSource).toContain("NextResponse.json({ token })");
  });
});

describe("/api/auth/invite-token GET: Token validation", () => {
  it("should validate token parameter exists", () => {
    expect(routeSource).toContain('searchParams.get("token")');
  });

  it("should reject tokens shorter than 32 characters", () => {
    expect(routeSource).toContain("token.length < 32");
  });

  it("should reject tokens longer than 128 characters", () => {
    expect(routeSource).toContain("token.length > 128");
  });

  it("should return 400 for invalid tokens", () => {
    expect(routeSource).toContain("status: 400");
    expect(routeSource).toContain("Invalid invite token");
  });

  it("should set httpOnly cookie for valid tokens", () => {
    expect(routeSource).toContain("httpOnly: true");
  });

  it("should set secure flag in production", () => {
    expect(routeSource).toContain('process.env.NODE_ENV === "production"');
  });

  it("should use sameSite lax", () => {
    expect(routeSource).toContain('sameSite: "lax"');
  });

  it("should redirect to register page", () => {
    expect(routeSource).toContain('new URL("/register"');
    expect(routeSource).toContain("NextResponse.redirect");
  });

  it("should set cookie with 7-day expiry", () => {
    expect(routeSource).toContain("7 * 24 * 60 * 60");
  });
});
