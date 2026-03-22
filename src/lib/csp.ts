/**
 * Content Security Policy generation.
 *
 * Extracted from next.config.ts so it can be tested directly.
 */

/**
 * Generate a CSP header value.
 *
 * @param isDev  - true in development (allows 'unsafe-eval' for HMR)
 * @param supabaseUrl - the Supabase project URL for connect-src
 */
// Next.js requires 'unsafe-inline' for hydration scripts.
// TODO: Migrate to nonce-based CSP when Next.js 16+ provides native support.
export function generateCSP(
  isDev: boolean,
  supabaseUrl = "https://*.supabase.co"
): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    `connect-src 'self' ${supabaseUrl} https://*.supabase.co wss://*.supabase.co`,
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}
