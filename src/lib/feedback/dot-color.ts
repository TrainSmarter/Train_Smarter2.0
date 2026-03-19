/**
 * Week strip dot color computation — PROJ-18
 *
 * Extracted from week-strip.tsx for testability.
 */

export interface CheckinEntryValues {
  values: Record<string, { numericValue: number | null; textValue: string | null }>;
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
