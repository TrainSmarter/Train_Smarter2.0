/**
 * Lightweight error logger that wraps console.error.
 * When a real error reporting service (e.g. Sentry) is added,
 * only this file needs to change.
 *
 * Usage:
 *   import { logError } from "@/lib/logger";
 *   logError("Failed to save check-in", error, { categoryId });
 */

const IS_DEV = process.env.NODE_ENV === "development";

/**
 * Log an error with optional context. In development, logs to console.
 * In production, silently captures for future Sentry integration.
 */
export function logError(
  message: string,
  error?: unknown,
  context?: Record<string, unknown>
): void {
  if (IS_DEV) {
     
    console.error(`[TrainSmarter] ${message}`, error, context);
  }
  // TODO: Send to Sentry / error reporting service in production
  // Sentry.captureException(error, { extra: { message, ...context } });
}
