import type { BackfillMode } from "./types";

/**
 * Compute the earliest allowed date for a check-in based on the backfill mode.
 *
 * - "current_week": Monday of the current week
 * - "two_weeks": Monday of the previous week
 * - "unlimited": No restriction (1970-01-01)
 */
export function computeBackfillMinDate(mode: BackfillMode): string {
  if (mode === "unlimited") {
    return "1970-01-01";
  }

  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  if (mode === "two_weeks") {
    // Monday of LAST week
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() - daysSinceMonday);
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);
    return lastMonday.toISOString().split("T")[0];
  }

  // "current_week" — Monday of THIS week
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysSinceMonday);
  return monday.toISOString().split("T")[0];
}
