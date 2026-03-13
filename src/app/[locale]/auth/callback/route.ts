import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Extract locale from URL path
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const locale = pathParts[1] === "de" || pathParts[1] === "en" ? pathParts[1] : "de";

  // Handle error from Supabase (e.g., expired link)
  if (error) {
    if (type === "recovery") {
      return NextResponse.redirect(
        new URL(
          `/${locale}/reset-password?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || "")}`,
          origin
        )
      );
    }
    // For signup verification errors, redirect to verify-email with error
    return NextResponse.redirect(
      new URL(
        `/${locale}/verify-email?error=${encodeURIComponent(error)}`,
        origin
      )
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      // Exchange failed — redirect with error
      if (type === "recovery") {
        return NextResponse.redirect(
          new URL(
            `/${locale}/reset-password?error=exchange_failed`,
            origin
          )
        );
      }
      return NextResponse.redirect(
        new URL(
          `/${locale}/verify-email?error=exchange_failed`,
          origin
        )
      );
    }

    // Password recovery: redirect to reset-password form
    if (type === "recovery") {
      return NextResponse.redirect(
        new URL(`/${locale}/reset-password`, origin)
      );
    }

    // Email verification: redirect to onboarding
    return NextResponse.redirect(
      new URL(`/${locale}/onboarding`, origin)
    );
  }

  // No code and no error — redirect to login
  return NextResponse.redirect(new URL(`/${locale}/login`, origin));
}
