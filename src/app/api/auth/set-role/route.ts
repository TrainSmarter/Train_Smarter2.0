import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const VALID_ROLES = ["TRAINER", "ATHLETE"] as const;

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

    // 2. Parse and validate the request body
    const body = await request.json();
    const { role } = body;

    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be TRAINER or ATHLETE." },
        { status: 400 }
      );
    }

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

    // 4. Use service-role key to set app_metadata.roles
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
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
