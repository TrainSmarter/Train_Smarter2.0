import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get initials from first and last name (e.g. "Max Mustermann" → "MM").
 */
export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * Get initials from a full name string (e.g. "Team Alpha" → "TA").
 * Takes the first character of each word, max 2 characters.
 */
export function getNameInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** Only allow https: URLs to prevent javascript:/data: injection from client-writable user_metadata */
export function getSafeAvatarUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? url : undefined;
  } catch {
    return undefined;
  }
}
