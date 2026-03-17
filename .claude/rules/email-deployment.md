---
paths:
  - "supabase/**"
  - "scripts/**"
  - ".env*"
---

# Email & Edge Function Deployment Rules (MANDATORY)

These rules exist because production outages have occurred from unsafe deployments.
Every rule below addresses a real incident. Do not skip any of them.

## Config Push Safety

- **NEVER** run `npx supabase config push` without `SEND_EMAIL_HOOK_SECRET` and `SMTP_PASS` environment variables set. Missing env vars cause Supabase to overwrite production secrets with empty values, breaking all email delivery.
- **ALWAYS** run `bash scripts/validate-config.sh` before any config push to verify `supabase/config.toml` is correct.
- After any config push, **IMMEDIATELY** verify auth logs show the send_email hook being called.

## Edge Function Deployment

- **NEVER** deploy Edge Functions via `npx supabase functions deploy` on Windows. The CLI generates invalid Linux paths in the deployed bundle, causing runtime failures. Always use the Supabase MCP `deploy_edge_function` tool.
- **ALWAYS** deploy via MCP from Windows using `mcp__supabase__deploy_edge_function`.
- On Linux/Mac, use `bash scripts/deploy-edge-functions.sh` which handles all pre-flight checks.
- **ALWAYS** deploy with `verify_jwt: false` since auth hooks call functions without a JWT.

## Edge Function Code Rules

- **NEVER** use `Deno.readTextFile()` in Supabase Edge Functions — templates must be inlined as string literals.
- **NEVER** use the denomailer default `X-Mailer` header — it fakes Microsoft Outlook 16.0, triggering phishing detection. Always set `"X-Mailer": "Train Smarter Mailer 1.0"` explicitly.
- **NEVER** add `List-Unsubscribe` or `List-Unsubscribe-Post` headers to transactional emails (confirmation, password reset, email change). These are for marketing emails only.
- **NEVER** add `Precedence: bulk` to transactional emails.

## DNS & Deliverability

- **ALWAYS** set DMARC to `p=none` for new domains until deliverability is confirmed over 2+ weeks.
- **ALWAYS** use SPF with `-all` (hard fail), not `~all` (soft fail).
- DKIM key is at `dkim._domainkey.train-smarter.at` and passes correctly via SMTP relay.

## Deployment Checklist

Before any email-related deployment:

1. `bash scripts/validate-config.sh` passes
2. `SEND_EMAIL_HOOK_SECRET` and `SMTP_PASS` are set in shell
3. If on Windows: use MCP deploy, NOT CLI
4. Edge Function code has no `Deno.readTextFile()`, no `List-Unsubscribe`, no `Microsoft Outlook`
5. After deploy: check edge function logs for successful invocations
6. After config push: verify auth hook is being called
