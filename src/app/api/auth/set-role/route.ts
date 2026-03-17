import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { z } from "zod";

const setRoleSchema = z.object({
  role: z.enum(["TRAINER", "ATHLETE"]),
});

// Note: In-memory rate limiting removed — ineffective in Vercel serverless (each invocation
// has its own memory). This endpoint is auth-gated and idempotent (role can only be set once).
// For proper rate limiting, use Vercel KV or Supabase in a future iteration.

export async function POST(request: Request) {
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

    // 2. Parse and validate the request body with Zod
    const body = await request.json();
    const parsed = setRoleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid role. Must be TRAINER or ATHLETE." },
        { status: 400 }
      );
    }

    const { role } = parsed.data;

    // 3. Check if user already has a different role set (prevent role change)
    const existingRoles = user.app_metadata?.roles as string[] | undefined;
    if (existingRoles && existingRoles.length > 0) {
      if (existingRoles.includes(role)) {
        // Idempotent: same role already set
        return NextResponse.json({ success: true, role });
      }
      // Different role already set — block
      return NextResponse.json(
        { error: "Role already set. Cannot change." },
        { status: 409 }
      );
    }

    // 4. Verify consent exists before allowing role assignment
    const { data: consent, error: consentError } = await supabase
      .from("user_consents")
      .select("id")
      .eq("user_id", user.id)
      .eq("consent_type", "terms_privacy")
      .eq("granted", true)
      .maybeSingle();

    if (consentError || !consent) {
      return NextResponse.json(
        { error: "Terms and privacy consent required before role selection." },
        { status: 403 }
      );
    }

    // 5. Use service-role key to set app_metadata.roles
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
          roles: [role],
        },
      }
    );

    if (updateError) {
      console.error("Failed to set user role:", updateError);
      return NextResponse.json(
        { error: "Failed to set role" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, role });
  } catch (err) {
    console.error("set-role error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
