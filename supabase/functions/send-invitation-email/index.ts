import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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

// ── Template Rendering ─────────────────────────────────────────────────

async function renderTemplate(
  locale: Locale,
  payload: InvitationPayload
): Promise<string> {
  const filename = `athlete_invite_${locale}.html`;
  const templatePath = new URL(`../../templates/${filename}`, import.meta.url)
    .pathname;

  let html: string;
  try {
    html = await Deno.readTextFile(templatePath);
  } catch {
    // Fallback: try German template if locale template not found
    if (locale === "en") {
      const fallbackPath = new URL(
        "../../templates/athlete_invite_de.html",
        import.meta.url
      ).pathname;
      html = await Deno.readTextFile(fallbackPath);
    } else {
      throw new Error(`Template not found: ${filename}`);
    }
  }

  // Build personal message block (or empty string if no message)
  let messageBlock = "";
  if (payload.personalMessage && payload.personalMessage.trim().length > 0) {
    messageBlock =
      locale === "de"
        ? PERSONAL_MESSAGE_DE(payload.personalMessage)
        : PERSONAL_MESSAGE_EN(payload.personalMessage);
  }

  // Replace placeholders
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
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
        "Reply-To": "office@train-smarter.at",
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
  if (typeof b.inviteLink !== "string" || !b.inviteLink.startsWith("http")) {
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
    const html = await renderTemplate(payload.locale, payload);
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
