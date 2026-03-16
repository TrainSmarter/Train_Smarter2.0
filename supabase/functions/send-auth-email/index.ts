import { createClient } from "npm:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

// ── Types ──────────────────────────────────────────────────────────────

interface AuthEmailHookPayload {
  user: {
    id: string;
    email: string;
    user_metadata: Record<string, unknown>;
    app_metadata: Record<string, unknown>;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type:
      | "signup"
      | "recovery"
      | "invite"
      | "magiclink"
      | "email_change";
    site_url: string;
  };
}

type Locale = "de" | "en";

// ── Template Config ────────────────────────────────────────────────────

const SUBJECTS: Record<string, Record<Locale, string>> = {
  signup: {
    de: "Bitte bestätige deine E-Mail-Adresse — Train Smarter",
    en: "Please confirm your email address — Train Smarter",
  },
  recovery: {
    de: "Passwort zurücksetzen — Train Smarter",
    en: "Reset your password — Train Smarter",
  },
  invite: {
    de: "Du wurdest zu Train Smarter eingeladen",
    en: "You've been invited to Train Smarter",
  },
  magiclink: {
    de: "Dein Login-Link — Train Smarter",
    en: "Your login link — Train Smarter",
  },
  email_change: {
    de: "E-Mail-Adresse ändern — Train Smarter",
    en: "Change your email address — Train Smarter",
  },
};

// Maps email_action_type to template file prefix
const TEMPLATE_PREFIX: Record<string, string> = {
  signup: "confirmation",
  recovery: "recovery",
  invite: "invite",
  magiclink: "magic_link",
  email_change: "email_change",
};

// ── Locale Detection ───────────────────────────────────────────────────

/**
 * Determines the email locale based on the differentiated rules:
 *
 * - signup/recovery: Extract from redirect_to URL (= page locale at time of request)
 * - email_change/magiclink: Use profiles.locale (stored preference)
 * - invite: Use inviting user's profiles.locale
 *
 * Fallback chain: URL locale → user_metadata.locale → profiles.locale → "de"
 */
async function determineLocale(
  payload: AuthEmailHookPayload,
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<Locale> {
  const { email_data, user } = payload;

  // For signup and recovery: use the locale from the redirect URL
  if (
    email_data.email_action_type === "signup" ||
    email_data.email_action_type === "recovery"
  ) {
    const urlLocale = extractLocaleFromUrl(email_data.redirect_to);
    if (urlLocale) return urlLocale;

    // Fallback: check user_metadata (set during registration)
    const metaLocale = user.user_metadata?.locale as string | undefined;
    if (metaLocale === "de" || metaLocale === "en") return metaLocale;
  }

  // For all other types: read from profiles.locale
  try {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("locale")
      .eq("id", user.id)
      .single();

    if (data?.locale === "de" || data?.locale === "en") {
      return data.locale;
    }
  } catch {
    // DB error — fall through to default
  }

  // Final fallback: check user_metadata
  const metaLocale = user.user_metadata?.locale as string | undefined;
  if (metaLocale === "de" || metaLocale === "en") return metaLocale;

  return "de";
}

/**
 * Extracts locale from a URL path.
 * e.g., "https://www.train-smarter.at/en/dashboard" → "en"
 * e.g., "https://www.train-smarter.at/de/konto" → "de"
 */
function extractLocaleFromUrl(url: string): Locale | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/^\/(de|en)(\/|$)/);
    return match ? (match[1] as Locale) : null;
  } catch {
    // Not a valid URL — try as path
    const match = url.match(/^\/(de|en)(\/|$)/);
    return match ? (match[1] as Locale) : null;
  }
}

// ── Template Rendering ─────────────────────────────────────────────────

/**
 * Reads and renders an email template.
 * Replaces Go template variables ({{ .SiteURL }}, {{ .TokenHash }}, etc.)
 * with actual values from the hook payload.
 */
async function renderTemplate(
  templatePrefix: string,
  locale: Locale,
  payload: AuthEmailHookPayload
): Promise<string> {
  const filename = `${templatePrefix}_${locale}.html`;
  const templatePath = new URL(`../../templates/${filename}`, import.meta.url)
    .pathname;

  let html: string;
  try {
    html = await Deno.readTextFile(templatePath);
  } catch {
    // Fallback: try German template if English not found
    if (locale === "en") {
      const fallbackPath = new URL(
        `../../templates/${templatePrefix}_de.html`,
        import.meta.url
      ).pathname;
      html = await Deno.readTextFile(fallbackPath);
    } else {
      throw new Error(`Template not found: ${filename}`);
    }
  }

  // Replace Go template variables with actual values
  const { email_data, user } = payload;
  html = html
    .replace(/\{\{\s*\.SiteURL\s*\}\}/g, email_data.site_url)
    .replace(/\{\{\s*\.TokenHash\s*\}\}/g, email_data.token_hash)
    .replace(/\{\{\s*\.Token\s*\}\}/g, email_data.token)
    .replace(
      /\{\{\s*\.RedirectTo\s*\}\}/g,
      email_data.redirect_to || email_data.site_url
    )
    .replace(/\{\{\s*\.Email\s*\}\}/g, user.email);

  return html;
}

/**
 * Generates a plain-text fallback from HTML content (BUG-10 fix).
 * Strips HTML tags and normalizes whitespace.
 */
function htmlToPlainText(html: string): string {
  return html
    // Remove style/script blocks
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    // Remove preheader (hidden text)
    .replace(
      /<div[^>]*style="[^"]*display:\s*none[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
      ""
    )
    // Convert links to text with URL
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    // Convert block elements to newlines
    .replace(/<\/(p|h[1-6]|tr|div|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    // Remove remaining tags
    .replace(/<[^>]+>/g, "")
    // Decode HTML entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#8212;/g, "—")
    .replace(/&copy;/g, "(c)")
    .replace(/&nbsp;/g, " ")
    // Normalize whitespace
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

// ── Main Handler ───────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Verify this is a POST from Supabase Auth
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Verify Standard Webhooks signature
    const rawPayload = await req.text();
    const hookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
    let payload: AuthEmailHookPayload;

    if (hookSecret) {
      const wh = new Webhook(hookSecret.replace("v1,whsec_", ""));
      payload = wh.verify(rawPayload, Object.fromEntries(req.headers)) as AuthEmailHookPayload;
    } else {
      payload = JSON.parse(rawPayload);
    }

    const { user, email_data } = payload;

    if (!user?.email || !email_data?.email_action_type) {
      return new Response(
        JSON.stringify({ error: "Invalid payload" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // MX-Record plausibility check (last line of defense)
    const emailDomain = user.email.split("@")[1];
    if (emailDomain) {
      try {
        const mxRecords = await Deno.resolveDns(emailDomain, "MX");
        if (!mxRecords || mxRecords.length === 0) {
          // Fallback: try A record
          try {
            await Deno.resolveDns(emailDomain, "A");
          } catch {
            console.log(`MX check failed: no records for ${emailDomain}`);
            return new Response(
              JSON.stringify({ error: `Invalid email domain: ${emailDomain}` }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }
        }
      } catch {
        // DNS error — fail-open, allow the email through
      }
    }

    // Create admin Supabase client for reading profiles.locale
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Determine locale
    const locale = await determineLocale(payload, supabaseAdmin);

    // 2. Get template prefix and subject
    const templatePrefix =
      TEMPLATE_PREFIX[email_data.email_action_type] ?? "confirmation";
    const subject =
      SUBJECTS[email_data.email_action_type]?.[locale] ??
      SUBJECTS[email_data.email_action_type]?.["de"] ??
      "Train Smarter";

    // 3. Render template
    const html = await renderTemplate(templatePrefix, locale, payload);
    const plainText = htmlToPlainText(html);

    // 4. Send via SMTP
    await sendEmail(user.email, subject, html, plainText);

    // Log without PII — hash email for DSGVO compliance
    const emailHash = await crypto.subtle
      .digest("SHA-256", new TextEncoder().encode(user.email))
      .then((buf) =>
        Array.from(new Uint8Array(buf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
          .slice(0, 12)
      );
    console.log(
      `Email sent: type=${email_data.email_action_type}, locale=${locale}, to_hash=${emailHash}`
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-auth-email error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
