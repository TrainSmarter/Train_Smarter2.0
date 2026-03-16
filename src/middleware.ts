import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase/middleware";

const intlMiddleware = createIntlMiddleware(routing);

// Routes that don't require authentication
const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"];

// Public legal pages (accessible without login — DSGVO requirement)
// Both DE and EN variants needed because auth checks run before intl rewriting
const PUBLIC_ROUTES = ["/datenschutz", "/impressum", "/agb", "/privacy", "/imprint", "/terms"];

// Routes that authenticated users should not access (redirect to dashboard)
const GUEST_ONLY_ROUTES = ["/login", "/register"];

// Routes excluded from onboarding redirect (to avoid infinite loops)
const ONBOARDING_ROUTES = ["/onboarding"];

// Routes excluded from email verification redirect
const VERIFY_EMAIL_ROUTES = ["/verify-email"];

function getPathnameWithoutLocale(pathname: string): string {
  // Strip locale prefix: /de/login -> /login, /en/dashboard -> /dashboard
  const localePattern = /^\/(de|en)(\/|$)/;
  const match = pathname.match(localePattern);
  if (match) {
    const rest = pathname.slice(match[1].length + 1);
    return rest.startsWith("/") ? rest : `/${rest}`;
  }
  return pathname;
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isGuestOnlyRoute(pathname: string): boolean {
  return GUEST_ONLY_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isOnboardingRoute(pathname: string): boolean {
  return ONBOARDING_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isVerifyEmailRoute(pathname: string): boolean {
  return VERIFY_EMAIL_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isProtectedRoute(pathname: string): boolean {
  return !isAuthRoute(pathname) && !isPublicRoute(pathname) && !pathname.startsWith("/auth/callback") && !pathname.startsWith("/auth/confirm") && pathname !== "/";
}

/**
 * Validates returnUrl to prevent open redirects.
 * Only allows same-origin relative paths (starts with /, no ://).
 */
function isValidReturnUrl(url: string): boolean {
  // Must start with exactly one slash (blocks protocol-relative //evil.com)
  return url.startsWith("/") && !url.startsWith("//") && !url.includes("://");
}

/**
 * Detect preferred locale from Accept-Language header.
 * Returns "de" if any German variant is detected, otherwise "en".
 */
function detectLocaleFromAcceptLanguage(request: NextRequest): "de" | "en" {
  const acceptLanguage = request.headers.get("accept-language") ?? "";
  // Check if any German variant appears in the header
  const hasGerman = /\bde\b/i.test(acceptLanguage);
  return hasGerman ? "de" : "en";
}

/** Old paths that need 301 redirects to consolidated /account page */
const LEGACY_REDIRECTS: Record<string, string> = {
  "/profile": "/account",
  "/account/settings": "/account",
  "/account/datenschutz": "/account",
  // Localized variants
  "/konto/einstellungen": "/account",
  "/konto/datenschutz": "/account",
};

/** Check if path needs a 301 redirect (consolidated old routes) */
function getLegacyRedirectTarget(cleanPath: string): string | null {
  // Check exact match for legacy paths
  for (const [oldPath, newPath] of Object.entries(LEGACY_REDIRECTS)) {
    if (cleanPath === oldPath) {
      // Datenschutz routes redirect to privacy tab
      if (oldPath.includes("datenschutz")) {
        return `${newPath}#datenschutz`;
      }
      return newPath;
    }
  }
  return null;
}

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip auth check for static files, API routes, and auth callback
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/auth/callback") ||
    pathname.includes("/auth/confirm") ||
    pathname.includes(".")
  ) {
    return intlMiddleware(request);
  }

  // 1. Run Supabase session refresh first (token refresh + cookie write)
  const { user, supabaseResponse } = await updateSession(request);

  const cleanPathname = getPathnameWithoutLocale(pathname);

  // Detect locale from URL for redirects
  const localeMatch = pathname.match(/^\/(de|en)(\/|$)/);
  const locale = localeMatch ? localeMatch[1] : routing.defaultLocale;

  // 1.5 Browser language detection for non-logged-in visitors without locale prefix
  if (!user && !localeMatch && cleanPathname === "/" && pathname === "/") {
    const detectedLocale = detectLocaleFromAcceptLanguage(request);
    // Let next-intl handle the redirect with the detected locale
    // We set the cookie so next-intl picks it up
    const response = intlMiddleware(request);
    if (detectedLocale !== routing.defaultLocale) {
      const redirectUrl = new URL(`/${detectedLocale}${cleanPathname}`, request.url);
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

  // 1.6 301 redirects for consolidated old routes
  const legacyTarget = getLegacyRedirectTarget(cleanPathname);
  if (legacyTarget) {
    const redirectUrl = new URL(`/${locale}${legacyTarget}`, request.url);
    return NextResponse.redirect(redirectUrl, 301);
  }

  // 2. No session + protected route -> redirect to /login
  if (!user && isProtectedRoute(cleanPathname)) {
    const returnUrl = cleanPathname;
    const loginUrl = new URL(`/${locale}/login`, request.url);
    if (returnUrl && returnUrl !== "/dashboard") {
      loginUrl.searchParams.set("returnUrl", returnUrl);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 3. Session + guest-only route -> redirect to /dashboard
  if (user && isGuestOnlyRoute(cleanPathname)) {
    const dashboardUrl = new URL(`/${locale}/dashboard`, request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // 4. Session + email not verified -> redirect to /verify-email
  if (user && !user.email_confirmed_at && isProtectedRoute(cleanPathname) && !isVerifyEmailRoute(cleanPathname)) {
    const verifyUrl = new URL(`/${locale}/verify-email`, request.url);
    if (user.email) {
      verifyUrl.searchParams.set("email", user.email);
    }
    // Preserve returnUrl through the redirect chain
    const returnUrl = request.nextUrl.searchParams.get("returnUrl");
    if (returnUrl && isValidReturnUrl(returnUrl)) {
      verifyUrl.searchParams.set("returnUrl", returnUrl);
    }
    return NextResponse.redirect(verifyUrl);
  }

  // 5. Session + onboarding not completed -> redirect to /onboarding
  // Uses app_metadata (server-only writable via service-role key) — not bypassable by client.
  if (
    user &&
    user.email_confirmed_at &&
    isProtectedRoute(cleanPathname) &&
    !isOnboardingRoute(cleanPathname) &&
    !isVerifyEmailRoute(cleanPathname)
  ) {
    const onboardingCompleted = user.app_metadata?.onboarding_completed === true;
    if (!onboardingCompleted) {
      const returnUrl = request.nextUrl.searchParams.get("returnUrl");
      const onboardingUrl = new URL(`/${locale}/onboarding`, request.url);
      if (returnUrl && isValidReturnUrl(returnUrl)) {
        onboardingUrl.searchParams.set("returnUrl", returnUrl);
      }
      return NextResponse.redirect(onboardingUrl);
    }
  }

  // 6. Locale redirect: if user has a preferred locale in metadata, redirect to it
  if (
    user &&
    user.email_confirmed_at &&
    user.app_metadata?.onboarding_completed === true &&
    isProtectedRoute(cleanPathname) &&
    user.user_metadata?.locale &&
    routing.locales.includes(user.user_metadata.locale) &&
    user.user_metadata.locale !== locale
  ) {
    const preferredLocale = user.user_metadata.locale as string;
    const redirectUrl = new URL(
      `/${preferredLocale}${cleanPathname}`,
      request.url
    );
    // Preserve query params
    request.nextUrl.searchParams.forEach((value, key) => {
      redirectUrl.searchParams.set(key, value);
    });
    return NextResponse.redirect(redirectUrl);
  }

  // 7. Role-based route protection (was step 6)
  if (user && user.app_metadata?.onboarding_completed) {
    const roles = (user.app_metadata?.roles as string[]) ?? [];

    // Trainer-only routes
    if (cleanPathname.startsWith("/organisation") && !roles.includes("TRAINER")) {
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
    }

    // Admin-only routes
    if (cleanPathname.startsWith("/admin") && user.app_metadata?.is_platform_admin !== true) {
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
    }
  }

  // 8. Run next-intl middleware on the supabase response
  const intlResponse = intlMiddleware(request);

  // Merge cookies from supabase response into intl response
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value, {
      ...cookie,
    });
  });

  return intlResponse;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
