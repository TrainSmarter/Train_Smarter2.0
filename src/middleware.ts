import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase/middleware";

const intlMiddleware = createIntlMiddleware(routing);

// Routes that don't require authentication
const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"];

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

function isProtectedRoute(pathname: string): boolean {
  return !isAuthRoute(pathname) && !pathname.startsWith("/auth/callback") && pathname !== "/";
}

/**
 * Validates returnUrl to prevent open redirects.
 * Only allows same-origin relative paths (starts with /, no ://).
 */
function isValidReturnUrl(url: string): boolean {
  return url.startsWith("/") && !url.includes("://");
}

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip auth check for static files, API routes, and auth callback
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/auth/callback") ||
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
    return NextResponse.redirect(verifyUrl);
  }

  // 5. Session + onboarding not completed -> redirect to /onboarding
  // Check app_metadata for onboarding_completed flag
  // Note: In production, this would check the profiles table or a JWT claim.
  // For now, we check user_metadata which will be set after onboarding.
  if (
    user &&
    user.email_confirmed_at &&
    isProtectedRoute(cleanPathname) &&
    !isOnboardingRoute(cleanPathname) &&
    !isVerifyEmailRoute(cleanPathname)
  ) {
    const onboardingCompleted = user.user_metadata?.onboarding_completed === true;
    if (!onboardingCompleted) {
      const returnUrl = request.nextUrl.searchParams.get("returnUrl");
      const onboardingUrl = new URL(`/${locale}/onboarding`, request.url);
      if (returnUrl && isValidReturnUrl(returnUrl)) {
        onboardingUrl.searchParams.set("returnUrl", returnUrl);
      }
      return NextResponse.redirect(onboardingUrl);
    }
  }

  // 6. Run next-intl middleware on the supabase response
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
