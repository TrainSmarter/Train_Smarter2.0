/**
 * Week strip dot color computation — PROJ-18
 *
 * Extracted from week-strip.tsx for testability.
 */

export interface CheckinEntryValues {
  values: Record<string, { numericValue: number | null; textValue: string | null }>;
}

/**
 * Compute the current streak — consecutive green days backwards from today.
 * If today is not green, start counting from yesterday (today is still in progress).
 */
export function computeStreak(
  checkinValues: Record<string, CheckinEntryValues>,
  requiredCategoryIds: string[] | undefined,
  today: string
): number {
  const filledDates = new Set(Object.keys(checkinValues));
  let streak = 0;

  // Check today first
  const todayColor = computeDotColor(today, filledDates, requiredCategoryIds, checkinValues, today);
  const startFromToday = todayColor === "green";

  // Walk backwards from today (or yesterday)
  const d = new Date(today + "T00:00:00");
  if (!startFromToday) {
    d.setDate(d.getDate() - 1); // start from yesterday
  }

  for (let i = 0; i < 365; i++) {
    const dateStr = toLocalDate(d);
    const color = computeDotColor(dateStr, filledDates, requiredCategoryIds, checkinValues, today);
    if (color === "green") {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/** Format Date to YYYY-MM-DD (local time) */
function toLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Check if a checkin entry has at least one real (non-null) value.
 */
export function hasRealValues(entry: CheckinEntryValues): boolean {
  return Object.values(entry.values).some(
    (v) => v.numericValue !== null || (v.textValue !== null && v.textValue !== "")
  );
}

/**
 * Compute dot color for a given date.
 * - "none":   no required fields AND no entries
 * - "red":    required fields defined but NO entries at all (past/today only)
 * - "yellow": has entries but not all required fields filled
 * - "green":  all required fields filled, OR no required fields and at least one entry
 */
export function computeDotColor(
  dateStr: string,
  filledDates: Set<string>,
  requiredCategoryIds?: string[],
  checkinValues?: Record<string, CheckinEntryValues>,
  today?: string
): "none" | "green" | "yellow" | "red" {
  const hasRequired = requiredCategoryIds && requiredCategoryIds.length > 0;
  const isFuture = today ? dateStr > today : false;

  // Check if there are real values (not just an empty DB record)
  const entry = checkinValues?.[dateStr];
  const hasRealEntry = entry ? hasRealValues(entry) : false;
  const hasAnyEntry = filledDates.has(dateStr) && hasRealEntry;

  // Future dates: never show a dot
  if (isFuture) return "none";

  // No entries at all
  if (!hasAnyEntry) {
    // Required fields defined but nothing entered → red (missed day)
    if (hasRequired) return "red";
    // No required fields and no entries → no dot
    return "none";
  }

  // Has entries — check required field completion
  if (!hasRequired) return "green"; // No required fields, any entry = green

  const allRequiredFilled = requiredCategoryIds.every((catId) => {
    const val = entry?.values[catId];
    if (!val) return false;
    // number/scale: numericValue is not null (0 counts as filled)
    return val.numericValue !== null && val.numericValue !== undefined;
  });

  return allRequiredFilled ? "green" : "yellow";
}
