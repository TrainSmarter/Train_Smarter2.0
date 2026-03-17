import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

/**
 * POST /api/auth/complete-onboarding
 *
 * Sets `app_metadata.onboarding_completed = true` via service-role key.
 * This flag is server-only writable — clients cannot bypass it.
 * Called at the end of the onboarding wizard (step 4).
 *
 * Pre-conditions verified:
 * - User must be authenticated
 * - User must have a role assigned (app_metadata.roles)
 * - User must have accepted terms (user_consents record)
 */
export async function POST() {
  try {
    // 1. Verify the requesting user's session
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Check pre-conditions: role must be set
    const roles = user.app_metadata?.roles as string[] | undefined;
    if (!roles || roles.length === 0) {
      return NextResponse.json(
        { error: "Role must be set before completing onboarding." },
        { status: 400 }
      );
    }

    // 3. Idempotent: already completed
    if (user.app_metadata?.onboarding_completed === true) {
      return NextResponse.json({ success: true });
    }

    // 4. Use service-role key to set app_metadata.onboarding_completed
    const adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      user.id,
      {
        app_metadata: {
          ...user.app_metadata,
          onboarding_completed: true,
        },
      }
    );

    if (updateError) {
      console.error("Failed to complete onboarding:", updateError);
      return NextResponse.json(
        { error: "Failed to complete onboarding" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("complete-onboarding error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
