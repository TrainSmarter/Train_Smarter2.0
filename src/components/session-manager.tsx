"use client";

/**
 * Session lifecycle is now handled entirely in the middleware via
 * ts_session / ts_remember cookies. This component is kept as a
 * no-op placeholder so existing imports don't break.
 */
export function SessionManager() {
  return null;
}
