import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/auth/invite-token?token=xxx
 * Stores an invite token as an httpOnly cookie (not readable by client JS).
 * Called when a user clicks an invite link.
 *
 * POST /api/auth/invite-token (no body)
 * Returns the invite token from the httpOnly cookie (server-side read).
 * Called by the onboarding page to check if an invite exists.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token || token.length < 32 || token.length > 128) {
    return NextResponse.json(
      { error: "Invalid invite token" },
      { status: 400 }
    );
  }

  // Redirect to register page with invite context
  const registerUrl = new URL("/register", request.url);
  const response = NextResponse.redirect(registerUrl);

  // httpOnly — prevents XSS exfiltration. Read server-side via POST handler.
  response.cookies.set("inviteToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: "/",
  });

  return response;
}

/**
 * POST /api/auth/invite-token — reads the httpOnly cookie server-side.
 * Returns { token: "..." } if present, or { token: null }.
 * Requires authenticated user to prevent token enumeration.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = request.cookies.get("inviteToken")?.value ?? null;
  return NextResponse.json({ token });
}
