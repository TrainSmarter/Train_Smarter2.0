import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/teams/invite-token?token=xxx
 * Stores a team invite token as an httpOnly cookie (not readable by client JS).
 * Called when a trainer clicks a team invitation link.
 *
 * POST /api/teams/invite-token (no body)
 * Returns the team invite token from the httpOnly cookie (server-side read).
 * Called by the onboarding/dashboard page to check if a team invite exists.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token || token.length < 32 || token.length > 128) {
    return NextResponse.json(
      { error: "Invalid invite token" },
      { status: 400 }
    );
  }

  // Redirect to dashboard where the invitation banner will show
  const dashboardUrl = new URL("/dashboard", request.url);
  const response = NextResponse.redirect(dashboardUrl);

  // httpOnly — prevents XSS exfiltration. Read server-side via POST handler.
  response.cookies.set("teamInviteToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: "/",
  });

  return response;
}

/**
 * POST /api/teams/invite-token — reads the httpOnly cookie server-side.
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

  const token = request.cookies.get("teamInviteToken")?.value ?? null;
  return NextResponse.json({ token });
}
