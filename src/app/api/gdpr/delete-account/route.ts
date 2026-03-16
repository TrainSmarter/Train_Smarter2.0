import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const deleteSchema = z.object({
  email: z.string().email(),
});

/**
 * POST /api/gdpr/delete-account
 *
 * Account deletion (Art. 17 DSGVO — Recht auf Vergessenwerden).
 * Immediately pseudonymizes profile data and deactivates the auth account.
 * Creates a pending_deletions record for full cleanup after 30 days.
 */
export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Validate email confirmation (typo protection)
    const body = await request.json();
    const parsed = deleteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    if (parsed.data.email.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: "Email does not match account" },
        { status: 400 }
      );
    }

    // 3. Service-role client for admin operations
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const userId = user.id;

    // 4. Pseudonymize profile data
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({
        first_name: "[Gelöschter Benutzer]",
        last_name: "",
        birth_date: null,
        avatar_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (profileError) {
      console.error("Profile pseudonymization error:", profileError);
      return NextResponse.json(
        { error: "Failed to process deletion" },
        { status: 500 }
      );
    }

    // 5. Delete avatar from storage (if exists)
    const avatarPath = `${userId}/`;
    const { data: avatarFiles } = await adminClient.storage
      .from("avatars")
      .list(avatarPath);

    if (avatarFiles && avatarFiles.length > 0) {
      const filePaths = avatarFiles.map((f) => `${userId}/${f.name}`);
      await adminClient.storage.from("avatars").remove(filePaths);
    }

    // 6. Disconnect all trainer-athlete connections
    const { error: disconnectError } = await adminClient
      .from("trainer_athlete_connections")
      .update({
        status: "disconnected",
        disconnected_at: new Date().toISOString(),
        can_see_body_data: false,
        can_see_nutrition: false,
        can_see_calendar: false,
      })
      .or(`trainer_id.eq.${userId},athlete_id.eq.${userId}`)
      .neq("status", "disconnected");

    if (disconnectError) {
      console.error("Failed to disconnect connections:", disconnectError);
      // Non-fatal: continue with deletion process
    }

    // 7. Remove from teams
    const { error: teamRemoveError } = await adminClient
      .from("team_athletes")
      .delete()
      .eq("athlete_id", userId);

    if (teamRemoveError) {
      console.error("Failed to remove team assignments:", teamRemoveError);
      // Non-fatal: continue with deletion process
    }

    // 8. Record pending deletion (30-day grace period)
    const { error: pendingError } = await adminClient.from("pending_deletions").insert({
      user_id: userId,
      status: "pending",
    });

    if (pendingError) {
      console.error("Failed to create pending deletion:", pendingError);
      // Non-fatal: account is already pseudonymized
    }

    // 9. Anonymize email + clear user_metadata in auth.users + deactivate account
    //    Art. 17 DSGVO requires full data erasure — email, name, avatar must go.
    const anonymizedEmail = `deleted_${userId.slice(0, 8)}@anonymized.local`;
    const { error: banError } = await adminClient.auth.admin.updateUserById(
      userId,
      {
        email: anonymizedEmail,
        ban_duration: "876000h", // ~100 years — effectively permanent
        user_metadata: {
          first_name: null,
          last_name: null,
          avatar_url: null,
        },
        app_metadata: {
          ...user.app_metadata,
          deletion_requested: true,
          deletion_requested_at: new Date().toISOString(),
          original_email_hash: Buffer.from(
            await crypto.subtle.digest(
              "SHA-256",
              new TextEncoder().encode(user.email ?? "")
            )
          ).toString("base64"),
        },
      }
    );

    if (banError) {
      console.error("Auth ban error:", banError);
      // Profile is already pseudonymized — log but don't fail
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("gdpr/delete-account error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
