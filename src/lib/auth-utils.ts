/**
 * Cookie helpers for session marker management.
 *
 * ts_remember — persistent (30 days), set when "Remember me" is checked
 * ts_session  — session-only (no Max-Age), set when "Remember me" is off
 *
 * Only one of the two should be active at any time; the other is cleared.
 */

/** 30 days in seconds */
const REMEMBER_MAX_AGE = 2592000;

/**
 * Returns the cookie strings that should be set via `document.cookie` when
 * a user logs in with or without "Remember me".
 *
 * Returns a tuple of two strings — both must be applied (one sets the
 * marker, the other clears the opposite marker).
 */
export function getSessionCookies(rememberMe: boolean): [string, string] {
  if (rememberMe) {
    return [
      `ts_remember=1; path=/; SameSite=Lax; Max-Age=${REMEMBER_MAX_AGE}`,
      "ts_session=; path=/; SameSite=Lax; Max-Age=0",
    ];
  }
  return [
    "ts_session=1; path=/; SameSite=Lax",
    "ts_remember=; path=/; SameSite=Lax; Max-Age=0",
  ];
}

/**
 * Apply session cookies to the document.
 * Convenience wrapper around `getSessionCookies` for use in components.
 */
export function setSessionCookies(rememberMe: boolean): void {
  const [cookieA, cookieB] = getSessionCookies(rememberMe);
  document.cookie = cookieA;
  document.cookie = cookieB;
}

/**
 * Returns the cookie strings that clear both session markers.
 * Used during logout and account deletion.
 */
export function getClearSessionCookies(): [string, string] {
  return [
    "ts_session=; path=/; SameSite=Lax; Max-Age=0",
    "ts_remember=; path=/; SameSite=Lax; Max-Age=0",
  ];
}

/**
 * Clear all session markers (cookies + legacy localStorage).
 * Should be called before `supabase.auth.signOut()`.
 */
export function clearSessionMarkers(): void {
  const [cookieA, cookieB] = getClearSessionCookies();
  document.cookie = cookieA;
  document.cookie = cookieB;
  // Legacy cleanup — safe to call even when absent
  localStorage.removeItem("ts_no_remember");
}
