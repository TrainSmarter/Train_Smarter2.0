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

// ── Inline Templates ──────────────────────────────────────────────────
// All templates inlined as strings because Deno.readTextFile() does NOT
// work in deployed Supabase Edge Functions (no filesystem access).

const TEMPLATES: Record<string, string> = {
  confirmation_de: `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E-Mail bestätigen</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Inter',system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0D9488,#0F766E);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Train Smarter</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Professionelles Trainingsmanagement</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#0f172a;font-size:20px;font-weight:600;">E-Mail-Adresse bestätigen</h2>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                Willkommen bei Train Smarter! Bitte bestätige deine E-Mail-Adresse, um dein Konto zu aktivieren.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background-color:#0D9488;border-radius:8px;">
                    <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup" target="_blank" style="display:inline-block;padding:12px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                      E-Mail bestätigen
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.5;">
                Falls du dich nicht bei Train Smarter registriert hast, kannst du diese E-Mail ignorieren.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;">&copy; Train Smarter &mdash; www.train-smarter.at</p>
              <p style="margin:0;color:#94a3b8;font-size:11px;">Train Smarter | Lukas Kitzberger | Graz, &Ouml;sterreich</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,

  confirmation_en: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Email</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Inter',system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0D9488,#0F766E);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Train Smarter</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Professional Training Management</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#0f172a;font-size:20px;font-weight:600;">Confirm Your Email Address</h2>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                Welcome to Train Smarter! Please confirm your email address to activate your account.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background-color:#0D9488;border-radius:8px;">
                    <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup" target="_blank" style="display:inline-block;padding:12px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                      Confirm Email
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.5;">
                If you did not sign up for Train Smarter, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;">&copy; Train Smarter &mdash; www.train-smarter.at</p>
              <p style="margin:0;color:#94a3b8;font-size:11px;">Train Smarter | Lukas Kitzberger | Graz, Austria</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,

  recovery_de: `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Passwort zurücksetzen</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Inter',system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0D9488,#0F766E);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Train Smarter</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Professionelles Trainingsmanagement</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#0f172a;font-size:20px;font-weight:600;">Passwort zurücksetzen</h2>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                Du hast angefordert, dein Passwort zurückzusetzen. Klicke auf den Button, um ein neues Passwort zu vergeben.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background-color:#0D9488;border-radius:8px;">
                    <a href="{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery" target="_blank" style="display:inline-block;padding:12px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                      Neues Passwort vergeben
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 12px;color:#94a3b8;font-size:13px;line-height:1.5;">
                Dieser Link ist <strong>1 Stunde</strong> gültig. Danach musst du einen neuen Link anfordern.
              </p>
              <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.5;">
                Falls du kein neues Passwort angefordert hast, kannst du diese E-Mail ignorieren. Dein Passwort bleibt unverändert.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;">&copy; Train Smarter &mdash; www.train-smarter.at</p>
              <p style="margin:0;color:#94a3b8;font-size:11px;">Train Smarter | Lukas Kitzberger | Graz, &Ouml;sterreich</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,

  recovery_en: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Inter',system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0D9488,#0F766E);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Train Smarter</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Professional Training Management</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#0f172a;font-size:20px;font-weight:600;">Reset Your Password</h2>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                You requested a password reset. Click the button below to set a new password.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background-color:#0D9488;border-radius:8px;">
                    <a href="{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery" target="_blank" style="display:inline-block;padding:12px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                      Set New Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 12px;color:#94a3b8;font-size:13px;line-height:1.5;">
                This link is valid for <strong>1 hour</strong>. After that, you'll need to request a new one.
              </p>
              <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.5;">
                If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;">&copy; Train Smarter &mdash; www.train-smarter.at</p>
              <p style="margin:0;color:#94a3b8;font-size:11px;">Train Smarter | Lukas Kitzberger | Graz, Austria</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,

  magic_link_de: `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login-Link</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Inter',system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0D9488,#0F766E);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Train Smarter</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Professionelles Trainingsmanagement</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#0f172a;font-size:20px;font-weight:600;">Dein Login-Link</h2>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                Klicke auf den Button, um dich bei Train Smarter anzumelden.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background-color:#0D9488;border-radius:8px;">
                    <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink" target="_blank" style="display:inline-block;padding:12px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                      Jetzt anmelden
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.5;">
                Falls du keinen Login-Link angefordert hast, kannst du diese E-Mail ignorieren.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;">&copy; Train Smarter &mdash; www.train-smarter.at</p>
              <p style="margin:0;color:#94a3b8;font-size:11px;">Train Smarter | Lukas Kitzberger | Graz, &Ouml;sterreich</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,

  magic_link_en: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login Link</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Inter',system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0D9488,#0F766E);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Train Smarter</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Professional Training Management</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#0f172a;font-size:20px;font-weight:600;">Your Login Link</h2>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                Click the button below to sign in to Train Smarter.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background-color:#0D9488;border-radius:8px;">
                    <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink" target="_blank" style="display:inline-block;padding:12px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                      Sign In Now
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.5;">
                If you did not request a login link, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;">&copy; Train Smarter &mdash; www.train-smarter.at</p>
              <p style="margin:0;color:#94a3b8;font-size:11px;">Train Smarter | Lukas Kitzberger | Graz, Austria</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,

  email_change_de: `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E-Mail ändern</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Inter',system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0D9488,#0F766E);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Train Smarter</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Professionelles Trainingsmanagement</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#0f172a;font-size:20px;font-weight:600;">E-Mail-Adresse ändern</h2>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                Du hast eine Änderung deiner E-Mail-Adresse angefordert. Klicke auf den Button, um die neue Adresse zu bestätigen.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background-color:#0D9488;border-radius:8px;">
                    <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change" target="_blank" style="display:inline-block;padding:12px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                      E-Mail-Änderung bestätigen
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.5;">
                Falls du keine Änderung angefordert hast, kannst du diese E-Mail ignorieren. Deine E-Mail-Adresse bleibt unverändert.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;">&copy; Train Smarter &mdash; www.train-smarter.at</p>
              <p style="margin:0;color:#94a3b8;font-size:11px;">Train Smarter | Lukas Kitzberger | Graz, &Ouml;sterreich</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,

  email_change_en: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Change Email</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Inter',system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0D9488,#0F766E);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Train Smarter</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Professional Training Management</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#0f172a;font-size:20px;font-weight:600;">Change Your Email Address</h2>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                You requested to change your email address. Click the button below to confirm the new address.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background-color:#0D9488;border-radius:8px;">
                    <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change" target="_blank" style="display:inline-block;padding:12px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                      Confirm Email Change
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.5;">
                If you did not request this change, you can safely ignore this email. Your email address will remain unchanged.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;">&copy; Train Smarter &mdash; www.train-smarter.at</p>
              <p style="margin:0;color:#94a3b8;font-size:11px;">Train Smarter | Lukas Kitzberger | Graz, Austria</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,

  invite_de: `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Einladung</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Inter',system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0D9488,#0F766E);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Train Smarter</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Professionelles Trainingsmanagement</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#0f172a;font-size:20px;font-weight:600;">Du wurdest eingeladen</h2>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                Du wurdest eingeladen, Train Smarter beizutreten. Klicke auf den Button, um dein Konto zu erstellen.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background-color:#0D9488;border-radius:8px;">
                    <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite" target="_blank" style="display:inline-block;padding:12px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                      Einladung annehmen
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.5;">
                Falls du diese Einladung nicht erwartet hast, kannst du diese E-Mail ignorieren.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;">&copy; Train Smarter &mdash; www.train-smarter.at</p>
              <p style="margin:0;color:#94a3b8;font-size:11px;">Train Smarter | Lukas Kitzberger | Graz, &Ouml;sterreich</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,

  invite_en: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Inter',system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0D9488,#0F766E);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Train Smarter</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Professional Training Management</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#0f172a;font-size:20px;font-weight:600;">You Have Been Invited</h2>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                You have been invited to join Train Smarter. Click the button below to create your account.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background-color:#0D9488;border-radius:8px;">
                    <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite" target="_blank" style="display:inline-block;padding:12px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.5;">
                If you were not expecting this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;">&copy; Train Smarter &mdash; www.train-smarter.at</p>
              <p style="margin:0;color:#94a3b8;font-size:11px;">Train Smarter | Lukas Kitzberger | Graz, Austria</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
};

// ── Template Rendering ─────────────────────────────────────────────────

/**
 * Renders an email template by looking up the inline TEMPLATES object.
 * Replaces Go template variables ({{ .SiteURL }}, {{ .TokenHash }}, etc.)
 * with actual values from the hook payload.
 */
function renderTemplate(
  templatePrefix: string,
  locale: Locale,
  payload: AuthEmailHookPayload
): string {
  const key = `${templatePrefix}_${locale}`;
  let html = TEMPLATES[key];

  if (!html) {
    // Fallback: try German template if requested locale not found
    if (locale === "en") {
      html = TEMPLATES[`${templatePrefix}_de`];
    }
    if (!html) {
      throw new Error(`Template not found: ${key}`);
    }
  }

  // Replace Go template variables with actual values
  // IMPORTANT: Always use the production app URL, NOT email_data.site_url
  // which may resolve to the Supabase project URL (djnardhjdfdqpxbskahe.supabase.co)
  const APP_URL = "https://www.train-smarter.at";
  const { email_data, user } = payload;
  html = html
    .replace(/\{\{\s*\.SiteURL\s*\}\}/g, `${APP_URL}/${locale}`)
    .replace(/\{\{\s*\.TokenHash\s*\}\}/g, email_data.token_hash)
    .replace(/\{\{\s*\.Token\s*\}\}/g, email_data.token)
    .replace(
      /\{\{\s*\.RedirectTo\s*\}\}/g,
      email_data.redirect_to || APP_URL
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
    // Normalize whitespace: trim each line, then collapse blank lines
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Generates a unique Message-ID for the email.
 * Format: <timestamp.random@train-smarter.at>
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
        "X-Entity-Ref-ID": crypto.randomUUID(),
        "Feedback-ID": "auth:train-smarter:transactional:train-smarter.at",
        "Reply-To": "office@train-smarter.at",
        "Auto-Submitted": "auto-generated",
        "X-Mailer": "Train Smarter Mailer 1.0",
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
    const html = renderTemplate(templatePrefix, locale, payload);
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
