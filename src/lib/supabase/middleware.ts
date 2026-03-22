import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // SECURITY NOTE: getSession() validates JWT locally without a server roundtrip.
  // A revoked/banned user's JWT remains valid until expiry (~1 hour).
  // For security-critical routes (admin, GDPR), server actions use getUser() instead.
  //
  // This is an accepted performance tradeoff: getSession() avoids an API roundtrip
  // on every single request. The JWT contains all the user data we need for
  // routing decisions (email_confirmed_at, app_metadata, user_metadata).
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user ?? null;

  // Session-only check: If user is authenticated but neither ts_session
  // nor ts_remember cookie is present, the user had "remember me" off and
  // the browser was closed (session cookie died). Sign them out server-side.
  if (user) {
    const hasSessionMarker = request.cookies.has("ts_session");
    const hasRememberMarker = request.cookies.has("ts_remember");

    if (!hasSessionMarker && !hasRememberMarker) {
      await supabase.auth.signOut();

      // Remove Supabase auth cookies from the response so the browser
      // doesn't keep a stale session token.
      const allCookies = supabaseResponse.cookies.getAll();
      for (const cookie of allCookies) {
        if (cookie.name.startsWith("sb-")) {
          supabaseResponse.cookies.delete(cookie.name);
        }
      }

      return { user: null, supabaseResponse };
    }
  }

  return { user, supabaseResponse };
}
