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

    // Trainer profile (if exists)
    const { data: trainerProfile } = await supabase
      .from("trainer_profiles")
      .select("organization_name, specialization, max_athletes, created_at, updated_at")
      .eq("id", userId)
      .maybeSingle();

    // Athlete profile (if exists)
    const { data: athleteProfile } = await supabase
      .from("athlete_profiles")
      .select("height_cm, sport_type, created_at, updated_at")
      .eq("id", userId)
      .maybeSingle();

    // Feedback check-ins (W12: DSGVO export completeness)
    const { data: feedbackCheckins } = await supabase
      .from("feedback_checkins")
      .select("id, date, notes, created_at")
      .eq("athlete_id", userId)
      .order("date", { ascending: true });

    // Feedback check-in values
    const { data: feedbackCheckinValues } = await supabase
      .from("feedback_checkin_values")
      .select("checkin_id, category_id, numeric_value, text_value, created_at")
      .eq("athlete_id", userId)
      .order("created_at", { ascending: true });

    // Feedback category overrides (athlete-specific settings)
    const { data: feedbackCategoryOverrides } = await supabase
      .from("feedback_category_overrides")
      .select("category_id, is_enabled, sort_order, created_at, updated_at")
      .eq("athlete_id", userId)
      .order("created_at", { ascending: true });

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
      trainer_profil: trainerProfile
        ? {
            organisation: trainerProfile.organization_name,
            spezialisierung: trainerProfile.specialization,
            max_athleten: trainerProfile.max_athletes,
            erstellt_am: trainerProfile.created_at,
            aktualisiert_am: trainerProfile.updated_at,
          }
        : null,
      athleten_profil: athleteProfile
        ? {
            groesse_cm: athleteProfile.height_cm,
            sportart: athleteProfile.sport_type,
            erstellt_am: athleteProfile.created_at,
            aktualisiert_am: athleteProfile.updated_at,
          }
        : null,
      feedback_checkins: (feedbackCheckins ?? []).map((c) => ({
        id: c.id,
        datum: c.date,
        notizen: c.notes,
        erstellt_am: c.created_at,
      })),
      feedback_werte: (feedbackCheckinValues ?? []).map((v) => ({
        checkin_id: v.checkin_id,
        kategorie_id: v.category_id,
        numerischer_wert: v.numeric_value,
        text_wert: v.text_value,
        erstellt_am: v.created_at,
      })),
      feedback_kategorie_einstellungen: (feedbackCategoryOverrides ?? []).map(
        (o) => ({
          kategorie_id: o.category_id,
          aktiviert: o.is_enabled,
          sortierung: o.sort_order,
          erstellt_am: o.created_at,
          aktualisiert_am: o.updated_at,
        })
      ),
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
