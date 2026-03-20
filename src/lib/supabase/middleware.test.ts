import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for the session-persistence logic in updateSession().
 *
 * The middleware checks if an authenticated user still has a marker cookie
 * (ts_session or ts_remember). If neither is present, the user chose
 * "don't remember me" and has since closed the browser — so the middleware
 * signs them out server-side.
 *
 * Because updateSession relies on @supabase/ssr createServerClient which
 * binds to the real NextRequest/NextResponse cookie API, we test the
 * LOGIC by replicating the core branching from middleware.ts.
 */

// ── Replicate the session-check logic from middleware.ts ──────────
interface MockUser {
  id: string;
  email: string;
}

interface SessionCheckResult {
  user: MockUser | null;
  signedOut: boolean;
}

/**
 * Pure-function extraction of the session marker check.
 * Mirrors the `if (user) { ... }` block in updateSession().
 */
function checkSessionMarkers(
  user: MockUser | null,
  hasSessionMarker: boolean,
  hasRememberMarker: boolean
): SessionCheckResult {
  if (user) {
    if (!hasSessionMarker && !hasRememberMarker) {
      // Would call supabase.auth.signOut() and clear sb- cookies
      return { user: null, signedOut: true };
    }
  }
  return { user, signedOut: false };
}

describe("Middleware session-persistence logic", () => {
  describe("when user is authenticated", () => {
    const mockUser: MockUser = { id: "user-1", email: "test@example.com" };

    it("should keep user when ts_remember cookie is present", () => {
      const result = checkSessionMarkers(mockUser, false, true);
      expect(result.user).toBe(mockUser);
      expect(result.signedOut).toBe(false);
    });

    it("should keep user when ts_session cookie is present", () => {
      const result = checkSessionMarkers(mockUser, true, false);
      expect(result.user).toBe(mockUser);
      expect(result.signedOut).toBe(false);
    });

    it("should keep user when BOTH marker cookies are present", () => {
      const result = checkSessionMarkers(mockUser, true, true);
      expect(result.user).toBe(mockUser);
      expect(result.signedOut).toBe(false);
    });

    it("should sign out user when NO marker cookie is present", () => {
      const result = checkSessionMarkers(mockUser, false, false);
      expect(result.user).toBeNull();
      expect(result.signedOut).toBe(true);
    });
  });

  describe("when user is NOT authenticated", () => {
    it("should not trigger marker check logic when user is null", () => {
      const result = checkSessionMarkers(null, false, false);
      expect(result.user).toBeNull();
      expect(result.signedOut).toBe(false);
    });

    it("should return null user regardless of marker cookies", () => {
      const result = checkSessionMarkers(null, true, true);
      expect(result.user).toBeNull();
      expect(result.signedOut).toBe(false);
    });
  });
});

describe("Middleware source code invariants", () => {
  /**
   * Verify the actual middleware.ts source contains the expected logic
   * to guard against accidental removal during refactoring.
   */
  let middlewareSource: string;

  beforeEach(async () => {
    const fs = await import("fs");
    const path = await import("path");
    middlewareSource = fs.readFileSync(
      path.resolve(__dirname, "middleware.ts"),
      "utf-8"
    );
  });

  it("should use getSession() for lightweight cookie-based auth (not getUser API call)", () => {
    expect(middlewareSource).toContain("auth.getSession()");
    expect(middlewareSource).not.toContain(".auth.getUser()");
  });

  it("should check for ts_session marker cookie", () => {
    expect(middlewareSource).toContain('cookies.has("ts_session")');
  });

  it("should check for ts_remember marker cookie", () => {
    expect(middlewareSource).toContain('cookies.has("ts_remember")');
  });

  it("should call signOut when no marker cookie is present", () => {
    expect(middlewareSource).toContain("auth.signOut()");
  });

  it("should clean up sb- prefixed cookies on sign-out", () => {
    expect(middlewareSource).toContain('cookie.name.startsWith("sb-")');
    expect(middlewareSource).toContain("cookies.delete(cookie.name)");
  });

  it("should return user: null after sign-out", () => {
    expect(middlewareSource).toContain("return { user: null, supabaseResponse }");
  });
});
