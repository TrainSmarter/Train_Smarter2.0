import { useLocale } from "next-intl";

/**
 * Returns the current locale with a typed return value.
 * Avoids repeating `useLocale() as "de" | "en"` throughout the codebase.
 */
export function useTypedLocale() {
  return useLocale() as "de" | "en";
}
