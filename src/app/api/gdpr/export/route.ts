import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * POST /api/gdpr/export
 *
 * Synchronous data export (Art. 20 DSGVO — Datenportabilität).
 * Returns a JSON file containing all user data.
 * Rate limited: 1 export per 30 days.
 */
export async function POST() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Rate limit check: 1 export per 30 days ──
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentExport } = await supabase
      .from("data_exports")
      .select("requested_at")
      .eq("user_id", user.id)
      .gte("requested_at", thirtyDaysAgo.toISOString())
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentExport) {
      const lastDate = new Date(recentExport.requested_at);
      const nextDate = new Date(lastDate);
      nextDate.setDate(nextDate.getDate() + 30);

      return NextResponse.json(
        {
          error: "Rate limited",
          lastExport: lastDate.toLocaleDateString("de-AT"),
          nextExport: nextDate.toLocaleDateString("de-AT"),
        },
        { status: 429 }
      );
    }

    // ── Collect all user data ──
    const userId = user.id;

    // Profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, birth_date, avatar_url, created_at, updated_at")
      .eq("id", userId)
      .single();

    // Consents (full history)
    const { data: consents } = await supabase
      .from("user_consents")
      .select("consent_type, granted, granted_at, policy_version")
      .eq("user_id", userId)
      .order("granted_at", { ascending: true });

    // Trainer-Athlete connections (no foreign PII — only status and dates)
    const { data: connections } = await supabase
      .from("trainer_athlete_connections")
      .select(
        "status, invited_at, connected_at, disconnected_at, can_see_body_data, can_see_nutrition, can_see_calendar"
      )
      .or(`trainer_id.eq.${userId},athlete_id.eq.${userId}`);

    // Team memberships
    const { data: teamMemberships } = await supabase
      .from("team_athletes")
      .select("team_id, assigned_at")
      .eq("athlete_id", userId);

    // Build export payload
    const exportData = {
      _meta: {
        exported_at: new Date().toISOString(),
        user_id: userId,
        format_version: "1.0",
        description:
          "Datenexport gemäß Art. 20 DSGVO (Recht auf Datenportabilität)",
      },
      profil: {
        email: user.email,
        vorname: profile?.first_name ?? null,
        nachname: profile?.last_name ?? null,
        geburtsdatum: profile?.birth_date ?? null,
        rolle: user.app_metadata?.roles?.[0] ?? null,
        registriert_am: user.created_at,
        profil_erstellt_am: profile?.created_at ?? null,
        profil_aktualisiert_am: profile?.updated_at ?? null,
      },
      einwilligungen: (consents ?? []).map((c) => ({
        typ: c.consent_type,
        erteilt: c.granted,
        zeitpunkt: c.granted_at,
        policy_version: c.policy_version,
      })),
      verbindungen: (connections ?? []).map((c) => ({
        status: c.status,
        eingeladen_am: c.invited_at,
        verbunden_am: c.connected_at,
        getrennt_am: c.disconnected_at,
        koerperdaten_sichtbar: c.can_see_body_data,
        ernaehrung_sichtbar: c.can_see_nutrition,
        kalender_sichtbar: c.can_see_calendar,
      })),
      team_zuordnungen: (teamMemberships ?? []).map((t) => ({
        team_id: t.team_id,
        zugewiesen_am: t.assigned_at,
      })),
    };

    // ── Record export in data_exports table ──
    await supabase.from("data_exports").insert({
      user_id: userId,
      status: "completed",
      completed_at: new Date().toISOString(),
    });

    // ── Return JSON download ──
    const jsonString = JSON.stringify(exportData, null, 2);

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="train-smarter-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (err) {
    console.error("gdpr/export error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
