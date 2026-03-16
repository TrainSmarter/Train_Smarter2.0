"use client";

import * as React from "react";

interface EmailValidationResult {
  /** Whether validation is currently in progress */
  isValidating: boolean;
  /** Whether the email domain has a valid MX record (null = not yet checked) */
  isValid: boolean | null;
  /** Translated error key or null */
  error: string | null;
}

/**
 * Custom hook that validates email domains via MX record lookup.
 *
 * - Debounces input by 500ms before calling POST /api/validate-email
 * - Only fires when the email is syntactically valid (contains @)
 * - Returns { isValidating, isValid, error }
 *
 * @param email — The current email input value
 * @returns EmailValidationResult
 */
export function useEmailValidation(email: string): EmailValidationResult {
  const [isValidating, setIsValidating] = React.useState(false);
  const [isValid, setIsValid] = React.useState<boolean | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    // Reset when email changes
    setIsValid(null);
    setError(null);

    // Only validate if email looks syntactically valid
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@") || trimmed.indexOf("@") === trimmed.length - 1) {
      setIsValidating(false);
      return;
    }

    // Extract domain — must have something after the @
    const domain = trimmed.split("@").pop();
    if (!domain || !domain.includes(".")) {
      setIsValidating(false);
      return;
    }

    setIsValidating(true);

    const timeoutId = setTimeout(async () => {
      // Abort any previous in-flight request
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await fetch("/api/validate-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmed }),
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (!res.ok) {
          // API error — don't block the user, just clear validation
          setIsValid(null);
          setError(null);
          setIsValidating(false);
          return;
        }

        const data = await res.json();

        if (controller.signal.aborted) return;

        if (data.valid) {
          setIsValid(true);
          setError(null);
        } else {
          setIsValid(false);
          setError(data.reason === "no_mx_record" ? "emailNoMxRecord" : "emailInvalidDomain");
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Network error — don't block the user
        setIsValid(null);
        setError(null);
      } finally {
        if (!controller.signal.aborted) {
          setIsValidating(false);
        }
      }
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      abortControllerRef.current?.abort();
    };
  }, [email]);

  return { isValidating, isValid, error };
}
