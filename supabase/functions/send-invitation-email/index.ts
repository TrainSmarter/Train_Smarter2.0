import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

// ── Types ──────────────────────────────────────────────────────────────

interface InvitationPayload {
  recipientEmail: string;
  trainerName: string;
  personalMessage?: string;
  inviteLink: string;
  expiresAt: string;
  locale: "de" | "en";
}

type Locale = "de" | "en";

// ── Subjects ───────────────────────────────────────────────────────────

const SUBJECTS: Record<Locale, (trainerName: string) => string> = {
  de: (name) => `Du wurdest von ${name} zu Train Smarter eingeladen`,
  en: (name) => `${name} invited you to Train Smarter`,
};

// ── Personal Message Block ─────────────────────────────────────────────

const PERSONAL_MESSAGE_DE = (msg: string) =>
  `<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
    <tr>
      <td style="padding:16px 20px;background-color:#f0fdfa;border-left:4px solid #0D9488;border-radius:0 8px 8px 0;">
        <p style="margin:0 0 4px;color:#0f172a;font-size:13px;font-weight:600;">Nachricht von deinem Trainer:</p>
        <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;font-style:italic;">&ldquo;${escapeHtml(msg)}&rdquo;</p>
      </td>
    </tr>
  </table>`;

const PERSONAL_MESSAGE_EN = (msg: string) =>
  `<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
    <tr>
      <td style="padding:16px 20px;background-color:#f0fdfa;border-left:4px solid #0D9488;border-radius:0 8px 8px 0;">
        <p style="margin:0 0 4px;color:#0f172a;font-size:13px;font-weight:600;">Message from your trainer:</p>
        <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;font-style:italic;">&ldquo;${escapeHtml(msg)}&rdquo;</p>
      </td>
    </tr>
  </table>`;

// ── Helpers ────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(isoString: string, locale: Locale): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString(locale === "de" ? "de-AT" : "en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return isoString;
  }
}

async function hashEmail(email: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(email)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 12);
}

// ── Inline Templates ──────────────────────────────────────────────────
// Templates are inlined because deployed Edge Functions cannot read files
// from the filesystem (no access to ../../templates/).

const TEMPLATE_DE = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Einladung von {{trainerName}}</title></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Inter',system-ui,-apple-system,sans-serif;">
  <div style="display:none;font-size:1px;color:#f8fafc;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">{{trainerName}} hat dich zu Train Smarter eingeladen &#8212; erstelle jetzt dein Konto.</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 0;"><tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">
      <tr><td style="background:linear-gradient(135deg,#0D9488,#0F766E);padding:32px 40px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Train Smarter</h1>
        <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Professionelles Trainingsmanagement</p>
      </td></tr>
      <tr><td style="padding:40px;">
        <h2 style="margin:0 0 16px;color:#0f172a;font-size:20px;font-weight:600;">Du wurdest eingeladen</h2>
        <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
          <strong>{{trainerName}}</strong> hat dich eingeladen, Train Smarter als Athlet beizutreten. Erstelle jetzt dein Konto, um die Einladung anzunehmen.
        </p>
        {{personalMessageBlock}}
        <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr>
          <td style="background-color:#0D9488;border-radius:8px;">
            <a href="{{inviteLink}}" target="_blank" style="display:inline-block;padding:12px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Einladung annehmen</a>
          </td>
        </tr></table>
        <p style="margin:0 0 12px;color:#94a3b8;font-size:13px;line-height:1.5;">Diese Einladung ist 7 Tage gültig (bis {{expiresAt}}).</p>
        <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.5;">Falls du diese Einladung nicht erwartet hast, kannst du diese E-Mail ignorieren.</p>
      </td></tr>
      <tr><td style="padding:24px 40px;background-color:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
        <p style="margin:0;color:#94a3b8;font-size:12px;">&copy; Train Smarter &mdash; www.train-smarter.at</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

const TEMPLATE_EN = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Invitation from {{trainerName}}</title></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Inter',system-ui,-apple-system,sans-serif;">
  <div style="display:none;font-size:1px;color:#f8fafc;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">{{trainerName}} invited you to Train Smarter &#8212; create your account now.</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 0;"><tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">
      <tr><td style="background:linear-gradient(135deg,#0D9488,#0F766E);padding:32px 40px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Train Smarter</h1>
        <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Professional Training Management</p>
      </td></tr>
      <tr><td style="padding:40px;">
        <h2 style="margin:0 0 16px;color:#0f172a;font-size:20px;font-weight:600;">You Have Been Invited</h2>
        <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
          <strong>{{trainerName}}</strong> has invited you to join Train Smarter as an athlete. Create your account now to accept the invitation.
        </p>
        {{personalMessageBlock}}
        <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr>
          <td style="background-color:#0D9488;border-radius:8px;">
            <a href="{{inviteLink}}" target="_blank" style="display:inline-block;padding:12px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Accept Invitation</a>
          </td>
        </tr></table>
        <p style="margin:0 0 12px;color:#94a3b8;font-size:13px;line-height:1.5;">This invitation is valid for 7 days (until {{expiresAt}}).</p>
        <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.5;">If you were not expecting this invitation, you can safely ignore this email.</p>
      </td></tr>
      <tr><td style="padding:24px 40px;background-color:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
        <p style="margin:0;color:#94a3b8;font-size:12px;">&copy; Train Smarter &mdash; www.train-smarter.at</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

const TEMPLATES: Record<Locale, string> = { de: TEMPLATE_DE, en: TEMPLATE_EN };

// ── Template Rendering ─────────────────────────────────────────────────

function renderTemplate(locale: Locale, payload: InvitationPayload): string {
  let html = TEMPLATES[locale] ?? TEMPLATES.de;

  let messageBlock = "";
  if (payload.personalMessage && payload.personalMessage.trim().length > 0) {
    messageBlock =
      locale === "de"
        ? PERSONAL_MESSAGE_DE(payload.personalMessage)
        : PERSONAL_MESSAGE_EN(payload.personalMessage);
  }

  html = html
    .replace(/\{\{trainerName\}\}/g, escapeHtml(payload.trainerName))
    .replace(/\{\{personalMessageBlock\}\}/g, messageBlock)
    .replace(/\{\{inviteLink\}\}/g, payload.inviteLink)
    .replace(/\{\{expiresAt\}\}/g, formatDate(payload.expiresAt, locale));

  return html;
}

/**
 * Generates a plain-text fallback from HTML content.
 */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(
      /<div[^>]*style="[^"]*display:\s*none[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
      ""
    )
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<\/(p|h[1-6]|tr|div|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#8212;/g, "\u2014")
    .replace(/&copy;/g, "(c)")
    .replace(/&nbsp;/g, " ")
    .replace(/&ldquo;/g, "\u201C")
    .replace(/&rdquo;/g, "\u201D")
    .replace(/&uuml;/g, "\u00FC")
    .replace(/&mdash;/g, "\u2014")
    // Normalize whitespace: trim each line, then collapse blank lines
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Generates a unique Message-ID for the email.
 */
function generateMessageId(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  return `<${timestamp}.${random}@train-smarter.at>`;
}

// ── SMTP Sending ───────────────────────────────────────────────────────

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  plainText: string
): Promise<void> {
  const smtpHost = Deno.env.get("SMTP_HOST");
  const smtpPort = Number(Deno.env.get("SMTP_PORT") ?? "465");
  const smtpUser = Deno.env.get("SMTP_USER");
  const smtpPass = Deno.env.get("SMTP_PASS");

  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error(
      "Missing required SMTP env vars: SMTP_HOST, SMTP_USER, SMTP_PASS"
    );
  }

  const client = new SMTPClient({
    connection: {
      hostname: smtpHost,
      port: smtpPort,
      tls: true,
      auth: {
        username: smtpUser,
        password: smtpPass,
      },
    },
  });

  try {
    await client.send({
      from: `Train Smarter <${smtpUser}>`,
      to,
      subject,
      content: plainText,
      html,
      headers: {
        "Message-ID": generateMessageId(),
        "Reply-To": "office@train-smarter.at",
        "List-Unsubscribe": "<mailto:office@train-smarter.at?subject=unsubscribe>",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
  } finally {
    await client.close();
  }
}

// ── Validation ─────────────────────────────────────────────────────────

function validatePayload(
  body: unknown
): { valid: true; data: InvitationPayload } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Invalid request body" };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.recipientEmail !== "string" || !b.recipientEmail.includes("@")) {
    return { valid: false, error: "Invalid recipientEmail" };
  }
  if (typeof b.trainerName !== "string" || b.trainerName.length === 0) {
    return { valid: false, error: "Invalid trainerName" };
  }
  if (typeof b.inviteLink !== "string") {
    return { valid: false, error: "Invalid inviteLink" };
  }
  try {
    const url = new URL(b.inviteLink);
    if (!["http:", "https:"].includes(url.protocol)) {
      return { valid: false, error: "Invalid inviteLink protocol" };
    }
  } catch {
    return { valid: false, error: "Invalid inviteLink" };
  }
  if (typeof b.expiresAt !== "string") {
    return { valid: false, error: "Invalid expiresAt" };
  }
  if (b.locale !== "de" && b.locale !== "en") {
    return { valid: false, error: "Invalid locale (must be 'de' or 'en')" };
  }
  if (
    b.personalMessage !== undefined &&
    b.personalMessage !== null &&
    typeof b.personalMessage !== "string"
  ) {
    return { valid: false, error: "Invalid personalMessage" };
  }

  return {
    valid: true,
    data: {
      recipientEmail: b.recipientEmail as string,
      trainerName: b.trainerName as string,
      personalMessage: (b.personalMessage as string) || undefined,
      inviteLink: b.inviteLink as string,
      expiresAt: b.expiresAt as string,
      locale: b.locale as Locale,
    },
  };
}

// ── Main Handler ───────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Verify caller is an authenticated user with TRAINER role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Only trainers can send invitation emails
    const roles = (user.app_metadata?.roles as string[]) ?? [];
    if (!roles.includes("TRAINER")) {
      return new Response(
        JSON.stringify({ error: "Forbidden: trainer role required" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();

    // Validate payload
    const result = validatePayload(body);
    if (!result.valid) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = result.data;

    // Render template
    const html = renderTemplate(payload.locale, payload);
    const plainText = htmlToPlainText(html);

    // Build subject
    const subject = SUBJECTS[payload.locale](payload.trainerName);

    // Send via SMTP
    await sendEmail(payload.recipientEmail, subject, html, plainText);

    // DSGVO-compliant logging (hash email, no PII)
    const emailHash = await hashEmail(payload.recipientEmail);
    console.log(
      `Invitation email sent: locale=${payload.locale}, to_hash=${emailHash}, trainer=${payload.trainerName}`
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-invitation-email error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
