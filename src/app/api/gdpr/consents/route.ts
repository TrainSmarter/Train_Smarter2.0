import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { gdprConsentRateLimiter, getRateLimitKey } from "@/lib/rate-limit";
import { z } from "zod";

const consentSchema = z.object({
  consent_type: z.enum(["terms_privacy", "body_wellness_data", "nutrition_data"]),
  granted: z.boolean(),
  policy_version: z.string().default("v1.0"),
});

const batchConsentSchema = z.object({
  consents: z.array(consentSchema).min(1).max(10),
});

/**
 * POST /api/gdpr/consents
 *
 * Server-side consent management with IP logging (DSGVO Art. 7).
 * Supports single consent or batch (onboarding sends 3 at once).
 * The DB trigger `on_consent_revocation` automatically cascades
 * revocations to trainer_athlete_connections.can_see_* flags.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 10 requests per minute per user
    const { limited } = gdprConsentRateLimiter.check(getRateLimitKey(request, user.id));
    if (limited) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Support both single consent and batch
    let consents: z.infer<typeof consentSchema>[];
    const batchParsed = batchConsentSchema.safeParse(body);
    if (batchParsed.success) {
      consents = batchParsed.data.consents;
    } else {
      const singleParsed = consentSchema.safeParse(body);
      if (!singleParsed.success) {
        return NextResponse.json(
          { error: "Invalid consent data" },
          { status: 400 }
        );
      }
      consents = [singleParsed.data];
    }

    // Extract IP address from request headers (Art. 7 documentation)
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : null;

    // Insert consent records (append-only)
    const records = consents.map((c) => ({
      user_id: user.id,
      consent_type: c.consent_type,
      granted: c.granted,
      policy_version: c.policy_version,
      ip_address: ip,
    }));

    const { error: insertError } = await supabase
      .from("user_consents")
      .insert(records);

    if (insertError) {
      console.error("Consent insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save consent" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("gdpr/consents error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
