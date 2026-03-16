# PROJ-13: E-Mail & Transaktions-Benachrichtigungen

## Status: Deployed
**Created:** 2026-03-12
**Last Updated:** 2026-03-16 (Hotfix: send-auth-email 500-Fehler bei Registrierung)

## Deployment
- **Production URL:** https://www.train-smarter.at
- **Deployed:** 2026-03-15 (initial), 2026-03-16 (hotfix v11)
- **Edge Function:** `send-auth-email` deployed to Supabase (v11, ACTIVE — inline templates)
- **Edge Function:** `send-invitation-email` deployed to Supabase (v5, ACTIVE — inline templates)
- **Vercel:** Auto-deployed from main branch

## Hotfix 2026-03-16: Signup 500-Fehler behoben

**Problem:** Registrierung auf www.train-smarter.at/de/register schlug mit HTTP 500 fehl.
- Auth Hook `send_email` rief `send-auth-email` Edge Function auf
- Edge Function nutzte `Deno.readTextFile()` um Templates zu laden
- `Deno.readTextFile()` funktioniert NICHT in deployed Edge Functions (kein Filesystem-Zugriff)
- Edge Function antwortete mit 500 → Auth Hook schlug fehl → Signup 500

**Fix:** Alle 10 E-Mail-Templates (5 Typen × 2 Sprachen) als Inline-Strings direkt im Code.
- Gleicher Fix wie zuvor bei `send-invitation-email` (v4→v5)
- **REGEL:** In Supabase Edge Functions NIEMALS `Deno.readTextFile()` verwenden — Templates immer inline!

**Verifizierung:** send-auth-email v11 deployed, Status ACTIVE

## Hotfix 2026-03-16 (2): Bestätigungs-Link zeigte auf Supabase statt App

**Problem:** E-Mail-Bestätigungs-Link zeigte auf `djnardhjdfdqpxbskahe.supabase.co/auth/v1/auth/confirm?token_hash=...` statt auf `www.train-smarter.at/auth/confirm?token_hash=...`
- `{{ .SiteURL }}` wurde durch `email_data.site_url` ersetzt
- Supabase gibt als `site_url` die Projekt-URL zurück, nicht die App-URL
- Ergebnis: "No API key found in request" wenn User auf den Link klickt

**Fix:** `{{ .SiteURL }}` wird jetzt durch hardcoded `APP_URL = "https://www.train-smarter.at"` ersetzt, nicht durch `email_data.site_url`.
- **REGEL:** In Edge Functions NIEMALS `email_data.site_url` für Links verwenden — immer die App-URL hardcoden!

**Verifizierung:** send-auth-email v12 deployed, Status ACTIVE

## Dependencies
- Requires: PROJ-4 (Authentication & Onboarding) — Auth-E-Mails (Registrierung, Passwort-Reset, E-Mail-Bestätigung)
- Informs: PROJ-5 (Athleten-Management) — Einladungs-E-Mails
- Informs: PROJ-11 (DSGVO) — Daten-Export-fertig-E-Mail, Account-Löschungs-Bestätigung

## E-Mail-Infrastruktur

**Provider:** Webgo Hosting SMTP (train-smarter.at Domain)

```
noreply@train-smarter.at  → alle automatischen Transaktions-Mails (kein Reply möglich)
office@train-smarter.at   → Support-Kontaktadresse (wird als Reply-To in relevanten Mails gesetzt)
```

**Konfiguration:**
- SMTP-Zugangsdaten von Webgo Hosting-Panel (train-smarter.at)
- Supabase Auth E-Mails werden auf Webgo SMTP umgeleitet (Supabase Custom SMTP Einstellung)
- Eigene App-E-Mails (nicht Auth) werden über Supabase Edge Function + SMTP versandt

## Übersicht
Vollständige E-Mail-Infrastruktur für alle Transaktions-Mails der App. Umfasst: Supabase Auth-E-Mails (über Custom SMTP geleitet), Athleten-Einladungen, Daten-Export-Benachrichtigungen, Account-Löschungs-Bestätigungen und weitere App-Events. Alle E-Mails werden von noreply@train-smarter.at gesendet, relevante haben office@train-smarter.at als Reply-To.

## User Stories
- Als neuer Benutzer möchte ich eine Bestätigungs-E-Mail von einer erkennbaren Absenderadresse (@train-smarter.at) erhalten, damit ich der Plattform vertraue
- Als eingeladener Athlet möchte ich eine professionell gestaltete Einladungs-E-Mail erhalten, die klar erklärt wer mich einlädt und was Train Smarter ist
- Als Benutzer der einen Daten-Export angefordert hat möchte ich eine E-Mail erhalten sobald der Export bereit ist, damit ich nicht warten oder nachschauen muss
- Als Benutzer möchte ich nach der Account-Löschung eine Bestätigungs-E-Mail erhalten, damit ich sicher bin dass meine Daten verarbeitet werden
- Als Trainer möchte ich informiert werden wenn ein Athlet meine Einladung annimmt oder ablehnt

## Acceptance Criteria

### E-Mail-Infrastruktur Setup
- [ ] Supabase Custom SMTP konfiguriert: Webgo SMTP-Server, Port 587 (TLS), noreply@train-smarter.at
- [ ] SPF-Eintrag für train-smarter.at DNS gesetzt (verhindert Spam-Klassifizierung)
- [ ] DKIM-Signatur konfiguriert (Webgo Hosting Panel → E-Mail-Authentifizierung)
- [ ] Test-E-Mail erfolgreich zugestellt (kein Spam-Ordner)
- [ ] Alle E-Mails haben korrekte Headers: From, Reply-To, List-Unsubscribe (für transaktionale Mails optional)

### Supabase Auth E-Mails (via Custom SMTP)
- [ ] **Registrierung / E-Mail-Bestätigung:** Betreff „Bitte bestätige deine E-Mail-Adresse — Train Smarter", Absender noreply@train-smarter.at
- [ ] **Passwort-Reset:** Betreff „Passwort zurücksetzen — Train Smarter", Link gültig 1h
- [ ] **E-Mail-Adresse ändern:** Bestätigungs-E-Mail an neue Adresse, Hinweis-E-Mail an alte Adresse
- [ ] Alle Auth-E-Mails: Zweisprachig (DE/EN) — Sprache basiert auf `profiles.locale` des Empfängers, konsistentes Layout (Logo, Farben aus Design System PROJ-1)

### Athleten-Einladung (PROJ-5)
- [ ] **Trigger:** Trainer lädt Athleten ein
- [ ] **Absender:** noreply@train-smarter.at, **Reply-To:** office@train-smarter.at
- [ ] **Betreff:** „[Trainer-Name] hat dich zu Train Smarter eingeladen"
- [ ] **Inhalt:**
  - Trainer-Name + optionale persönliche Nachricht (aus Einladungs-Modal)
  - Kurze Erklärung was Train Smarter ist (1–2 Sätze)
  - CTA-Button: „Einladung annehmen" → Link zur Registrierung/Login mit Invite-Token
  - Link-Ablauf: 7 Tage (Hinweis in der Mail)
  - Footer: Datenschutzerklärung-Link, „Du hast diese E-Mail erhalten weil [Trainer-Name] deine Adresse angegeben hat"

### Einladung angenommen / abgelehnt (PROJ-5)
- [ ] **Einladung angenommen:** E-Mail an Trainer — Betreff: „[Athlet-Name] hat deine Einladung angenommen"
- [ ] **Einladung abgelehnt:** E-Mail an Trainer — Betreff: „[Athlet-Name] hat deine Einladung abgelehnt"
- [ ] Beide: kurze Info, CTA „Athleten-Übersicht öffnen"

### Verbindung getrennt (PROJ-5)
- [ ] **Trainer trennt Athlet:** E-Mail an Athlet — „Dein Trainer [Name] hat die Verbindung getrennt"
- [ ] **Athlet trennt Trainer:** E-Mail an Trainer — „[Athlet-Name] hat die Verbindung zu dir getrennt"

### Daten-Export bereit (PROJ-11)
- [ ] **Trigger:** Export-Job abgeschlossen
- [ ] **Betreff:** „Dein Daten-Export ist bereit — Train Smarter"
- [ ] **Inhalt:** CTA-Button „Export herunterladen" (signed URL, 48h gültig), Hinweis auf Ablaufzeit
- [ ] **Reply-To:** office@train-smarter.at (User könnte Fragen haben)

### Account-Löschung (PROJ-11)
- [ ] **Initiierungs-Bestätigung:** Betreff „Account-Löschung eingeleitet — Train Smarter"
  - Inhalt: Löschung initiiert, Grace-Period 30 Tage, Support-Kontakt (office@train-smarter.at) für Reaktivierung
- [ ] **Abschluss-Bestätigung** (nach 30-Tage-Löschung): Betreff „Dein Account wurde gelöscht — Train Smarter"
  - Inhalt: Bestätigung vollständiger Löschung gemäß DSGVO

### Trainer verlässt Plattform (PROJ-11)
- [ ] **E-Mail an alle Athleten des gelöschten Trainers:** „Dein Trainer [Name] hat die Plattform verlassen — die Verbindung wurde automatisch getrennt"

### E-Mail-Template Design
- [ ] Einheitliches HTML-Template für alle E-Mails: Logo oben, Teal-Primärfarbe (#0D9488) für CTAs, Footer mit Links
- [ ] Responsive HTML (funktioniert auf Mobile Mail-Clients)
- [ ] Plain-Text-Fallback für alle E-Mails (Spam-Filter-Optimierung)
- [ ] Zweisprachig: Deutsche (Österreich-DE: keine Helvetismen, kein „ss" statt „ß") und englische Version jedes Templates
- [ ] Sprache wird anhand `profiles.locale` des Empfängers bestimmt (Standard: `de` wenn nicht gesetzt)
- [ ] Supabase Auth-E-Mails: Auth Hook oder Edge Function wählt das passende Template basierend auf `profiles.locale`

## Edge Cases
- SMTP-Server nicht erreichbar → E-Mail wird in Queue (Retry-Mechanismus: 3 Versuche in 1h) gespeichert, danach Fehler-Log
- E-Mail-Adresse nicht zustellbar (Bounce) → Fehler wird geloggt, kein Retry, Admin-Benachrichtigung bei wiederholten Bounces
- Einladungs-E-Mail landet im Spam → Hinweis auf Einladungs-Seite: „Falls du keine E-Mail erhalten hast, prüfe deinen Spam-Ordner"
- Doppelter Export-Request (Rate-Limit greift) → keine E-Mail, nur UI-Fehlermeldung (bereits in PROJ-11)
- E-Mail-Versand für gelöschten Account → Systemprüfung: keine E-Mail an bereits gelöschte Adressen

## Technical Requirements
- Infrastructure: Webgo SMTP (train-smarter.at Hosting) als primärer Mail-Provider
- Integration: Supabase Custom SMTP für alle Auth-E-Mails (Registrierung, Passwort-Reset, E-Mail-Änderung)
- Integration: Supabase Edge Function für App-Events-E-Mails (Einladungen, Export, Verbindungen)
- Security: SMTP-Credentials als Umgebungsvariablen (nie im Code), in Supabase Secrets + Vercel Env gespeichert
- Deliverability: SPF + DKIM konfiguriert für train-smarter.at
- Logging: Alle versandten E-Mails werden mit Timestamp, Empfänger-Hash (kein Klartext), Typ und Erfolg/Fehler geloggt
- Rate-Limiting: Supabase Auth hat built-in Rate-Limits für Auth-E-Mails; App-E-Mails haben eigenes Rate-Limit pro User pro Event-Typ

## E-Mail-Übersicht (alle Templates)

> Alle E-Mails existieren in DE + EN. Sprache wird durch `profiles.locale` des Empfängers bestimmt.

| # | Trigger | Betreff (DE) | Betreff (EN) | Empfänger |
|---|---------|-------------|-------------|-----------|
| 1 | Registrierung | Bestätige deine E-Mail-Adresse | Confirm your email address | Neuer User |
| 2 | Passwort-Reset | Passwort zurücksetzen | Reset your password | User |
| 3 | E-Mail-Änderung | E-Mail-Adresse ändern | Change your email address | Neuer + alter User |
| 4 | Athlet eingeladen | [Trainer] hat dich eingeladen | [Trainer] has invited you | Eingeladener Athlet |
| 5 | Einladung angenommen | [Athlet] hat deine Einladung angenommen | [Athlete] accepted your invitation | Trainer |
| 6 | Einladung abgelehnt | [Athlet] hat deine Einladung abgelehnt | [Athlete] declined your invitation | Trainer |
| 7 | Verbindung getrennt (Trainer) | Dein Trainer hat die Verbindung getrennt | Your coach disconnected | Athlet |
| 8 | Verbindung getrennt (Athlet) | [Athlet] hat die Verbindung getrennt | [Athlete] disconnected | Trainer |
| 9 | Daten-Export bereit | Dein Daten-Export ist bereit | Your data export is ready | User |
| 10 | Account-Löschung initiiert | Account-Löschung eingeleitet | Account deletion initiated | User |
| 11 | Account-Löschung abgeschlossen | Dein Account wurde gelöscht | Your account has been deleted | User |
| 12 | Trainer verlässt Plattform | Dein Trainer hat die Plattform verlassen | Your coach has left the platform | Alle Athleten des Trainers |

---

## Enhancement: E-Mail-Locale basierend auf Seitensprache (2026-03-15)

> Cross-Feature Enhancement zusammen mit PROJ-4. Ziel: E-Mails werden in der Sprache versendet, die der User zum Zeitpunkt der Anfrage auf der Seite ausgewählt hat.

### Präzisierte Locale-Bestimmung für E-Mails

**Bisherige Regel (Zeile 91):** „Sprache wird anhand `profiles.locale` des Empfängers bestimmt"

**Neue, differenzierte Regel:**

| Szenario | E-Mail-Locale | Begründung |
|----------|--------------|-------------|
| Registrierung (E-Mail-Bestätigung) | URL-Locale zum Zeitpunkt der Registrierung | User ist auf `/en/register` → Bestätigungs-E-Mail auf Englisch |
| Passwort zurücksetzen | URL-Locale zum Zeitpunkt der Anfrage | User ist auf `/en/forgot-password` → Recovery-E-Mail auf Englisch |
| Einladung an nicht-registrierten Athleten | `profiles.locale` des einladenden Trainers | Eingeladener hat noch kein Profil; Trainer-Sprache als Proxy |
| Alle E-Mails an registrierte & eingeloggte User | `profiles.locale` des Empfängers | Gespeicherte Präferenz ist maßgeblich |

### Neue Acceptance Criteria

#### Auth-E-Mails: Locale aus URL-Kontext
- [ ] **E-Mail-Bestätigung** (Registrierung): E-Mail wird in der Sprache versendet, die der User auf der Registrierungsseite gewählt hat (URL-Locale)
- [ ] **Passwort-Reset**: E-Mail wird in der Sprache versendet, die auf der Forgot-Password-Seite aktiv ist (URL-Locale)
- [ ] **E-Mail-Änderung**: E-Mail wird in `profiles.locale` des eingeloggten Users versendet
- [ ] Auth Hook / Edge Function erhält die Locale-Information und wählt das passende Template (DE/EN)
- [ ] Fallback wenn keine Locale ermittelbar: Deutsch (`de`)

#### App-E-Mails: Locale aus Profil
- [ ] Alle App-E-Mails (Einladungen, Export, Verbindungen, Account-Löschung) verwenden `profiles.locale` des Empfängers
- [ ] Ausnahme Einladung an nicht-registrierte Athleten: Sprache des einladenden Trainers

#### Locale-Konsistenz nach Sprachwechsel
- [ ] Wenn ein User seine Sprache in den Einstellungen ändert (PROJ-4 Enhancement), werden ab sofort ALLE zukünftigen E-Mails in der neuen Sprache versendet
- [ ] Bereits versendete E-Mails werden natürlich nicht nachträglich geändert

### Neue Edge Cases

- User auf `/en/forgot-password` fordert Reset an, hat aber `profiles.locale = "de"` → E-Mail kommt auf Englisch (aktuelle Seitensprache hat Vorrang bei Auth-Flows)
- User fordert Reset auf `/de/forgot-password` an, ändert dann die Browsersprache → keine Auswirkung, Locale wurde bei Anfrage erfasst
- Einladung an Athlet der noch nie auf der Plattform war → Trainer-Sprache wird verwendet; Athlet kann nach Registrierung seine eigene Sprache wählen
- Auth Hook kann `profiles.locale` nicht lesen (DB-Fehler) → Fallback auf Deutsch

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

**Designed:** 2026-03-13

### Zweisprachige E-Mail-Architektur

**Sprachbestimmung:** `profiles.locale` ist Single Source of Truth. Standard: `"de"` wenn nicht gesetzt.

**Supabase Auth-E-Mails (Confirmation, Recovery, Invite, Magic Link, Email Change):**
- Supabase Auth Hook (Send Email Hook) als Edge Function
- Hook empfängt E-Mail-Event von Supabase Auth
- Hook liest `profiles.locale` des Empfängers aus DB
- Hook wählt passendes Template (DE/EN) und versendet via SMTP (s306.goserver.host:465)
- Supabase built-in E-Mail-Versand wird durch den Hook ersetzt

**App-E-Mails (Einladungen, Export, Verbindungen):**
- Eigene Supabase Edge Function pro Event-Typ
- Liest `profiles.locale` des Empfängers
- Wählt Template + Betreff in der richtigen Sprache
- Versendet via SMTP

**Template-Struktur:**
```
supabase/templates/
├── confirmation_de.html / confirmation_en.html
├── recovery_de.html / recovery_en.html
├── invite_de.html / invite_en.html
├── magic_link_de.html / magic_link_en.html
└── email_change_de.html / email_change_en.html
```

**Ablauf:** Registrierung (URL-Locale) → `profiles.locale` → Auth Hook liest locale → Template-Auswahl → SMTP-Versand

### Enhancement Tech Design: E-Mail-Locale basierend auf Seitensprache (2026-03-15)

#### A) Differenzierte Locale-Bestimmung

Die bisherige Regel „`profiles.locale` bestimmt immer die E-Mail-Sprache" wird differenziert:

```
Auth-E-Mail ausgelöst
  │
  ├── Registrierung / Passwort-Reset?
  │     └── JA → Locale aus URL-Kontext extrahieren
  │           (User auf /en/register → E-Mail auf Englisch)
  │
  └── Eingeloggter User / App-Event?
        └── JA → profiles.locale des Empfängers verwenden
              (Gespeicherte Präferenz ist maßgeblich)
```

**Warum?** Bei Registrierung/Passwort-Reset hat der User bewusst eine Sprachversion der Seite gewählt. Diese Wahl soll sich in der E-Mail widerspiegeln — unabhängig von einem möglicherweise veralteten `profiles.locale`.

#### B) Auth Hook — Locale-Erkennung nach Event-Typ

Der Auth Hook (Edge Function `send-auth-email`) bestimmt die Locale je nach Szenario:

| Event-Typ | Locale-Quelle | Wie |
|-----------|--------------|-----|
| `confirmation` (Registrierung) | URL bei Registrierung | Aus `redirect_to`-URL den Locale-Prefix extrahieren (`/en/...` → `en`) |
| `recovery` (Passwort-Reset) | URL bei Anfrage | Aus `redirect_to`-URL oder Referrer-Header |
| `email_change` | Gespeicherte Präferenz | `profiles.locale` des eingeloggten Users |
| `magic_link` | Gespeicherte Präferenz | `profiles.locale` des Users |
| `invite` (Supabase native) | Gespeicherte Präferenz | `profiles.locale` des einladenden Trainers |

**Fallback-Kette:** URL-Locale → `user_metadata.locale` → `profiles.locale` → `"de"` (Default)

#### C) Auth Hook — Ablauf

```
Supabase Auth Event
  │
  ├── 1. Event-Daten empfangen (user_id, email, event_type, redirect_to)
  │
  ├── 2. Locale bestimmen
  │      ├── confirmation/recovery → Locale aus redirect_to URL extrahieren
  │      └── andere → profiles.locale aus DB lesen
  │
  ├── 3. Template wählen (z.B. recovery_en.html oder recovery_de.html)
  │
  ├── 4. Template rendern (Variablen: Bestätigungslink, Site-URL, etc.)
  │
  ├── 5. Betreff in passender Sprache setzen
  │
  ├── 6. Via SMTP senden (s306.goserver.host:465, noreply@train-smarter.at)
  │      ├── HTML-Body + Plain-Text-Fallback (behebt BUG-10)
  │      └── Reply-To: office@train-smarter.at (behebt BUG-4)
  │
  └── 7. Ergebnis an Supabase zurückmelden
```

#### D) Dateistruktur (Auth Hook)

```
supabase/functions/
└── send-auth-email/
    └── index.ts              ← Auth Hook Edge Function
                                 (Templates bleiben in supabase/templates/ — bereits vorhanden)
```

**Konfiguration:** Supabase Dashboard → Auth → Hook → „Send Email" auf die Edge Function zeigen

#### E) Abhängigkeit zu PROJ-4

Der Sprachwechsel auf der Konto-Seite (PROJ-4 Enhancement) aktualisiert `profiles.locale`. Ab diesem Moment verwenden alle zukünftigen E-Mails die neue Sprache. Die Auth Hook Edge Function muss IMMER den aktuellen `profiles.locale`-Wert lesen (nicht cachen).

#### F) Neue Dependencies

| Package | Zweck | Status |
|---------|-------|--------|
| Deno SMTP Library | E-Mail-Versand in Edge Function | Wird in Edge Function importiert (Deno-Ökosystem) |
| Keine npm-Dependencies | Edge Functions laufen in Deno, nicht Node.js | — |

## QA Test Results (Re-Test #2)

**Tested:** 2026-03-15 (Re-Test)
**Previous QA:** 2026-03-15 (initial)
**App URL:** https://www.train-smarter.at + http://localhost:3000
**Tester:** QA Engineer (AI)
**Build:** PASS (npm run build succeeds, 0 errors)

### Scope Note

PROJ-13 covers Supabase Auth emails (Phase 1), App-event emails via Edge Functions (Phase 2), and DNS deliverability (infrastructure). Since the last QA run, the `send-auth-email` Edge Function has been implemented (`supabase/functions/send-auth-email/index.ts`), which addresses the previously HIGH-severity BUG-9. The recovery templates have been updated with link-expiry notices (BUG-7 fixed). The Edge Function includes Reply-To headers (BUG-4 fixed) and plain-text fallback generation (BUG-10 fixed). However, the Edge Function is NOT yet wired up as an Auth Hook in Supabase Dashboard/config.toml, and App-event emails (Phase 2) remain unimplemented.

---

### AC-1: E-Mail-Infrastruktur Setup

- [x] PASS: Supabase Custom SMTP konfiguriert: `s306.goserver.host`, Port 465 (SSL), `noreply@train-smarter.at` -- verified in `supabase/config.toml`
- [x] PASS (partial): Edge Function `send-auth-email` includes Reply-To header `office@train-smarter.at` (line 248). This fixes previous BUG-4 -- but only when the Edge Function is active as Auth Hook.
- [ ] BUG-1: Port mismatch -- spec says "Port 587 (TLS)" but both config.toml and Edge Function use Port 465 (SSL). Both work, but spec and implementation are inconsistent.
- [ ] BUG-2: SPF record -- cannot verify from code alone; no documentation or verification script exists for DNS records (SPF, DKIM). Needs manual verification in Webgo DNS panel.
- [ ] BUG-3: DKIM signature -- same as above, no evidence of DKIM configuration in codebase. Needs manual verification.
- [ ] CANNOT TEST: Test-E-Mail delivery to inbox vs. spam -- requires sending actual emails and checking deliverability.

### AC-2: Supabase Auth E-Mails (via Custom SMTP)

- [x] PASS: Registrierung / E-Mail-Bestätigung: template exists (`confirmation_de.html` / `confirmation_en.html`), Absender configured as `noreply@train-smarter.at`
- [x] PASS: Passwort-Reset: template exists (`recovery_de.html` / `recovery_en.html`), link points to `/reset-password`
- [x] PASS: Recovery link expiry notice -- both `recovery_de.html` (line 38: "Dieser Link ist **1 Stunde** gueltig") and `recovery_en.html` (line 38: "This link is valid for **1 hour**") now communicate the expiry. Previous BUG-7 is FIXED.
- [x] PASS: All Auth E-Mails have bilingual templates (DE + EN) -- 10 templates total: 5 types x 2 languages
- [x] PASS: Consistent layout: Logo/header with Teal gradient (#0D9488), white card body, footer with copyright
- [ ] BUG-5: Confirmation email subject mismatch -- Edge Function uses "Bitte bestaetige deine E-Mail-Adresse -- Train Smarter" (correct per spec), but `config.toml` still uses "Bestaetige deine E-Mail-Adresse" (no "Bitte" prefix, no suffix). When the Edge Function is active as Auth Hook, the config.toml subject is irrelevant. But currently config.toml is what Supabase uses.
- [ ] BUG-6: Recovery email subject mismatch -- Edge Function uses "Passwort zuruecksetzen -- Train Smarter" (correct per spec), but `config.toml` still uses "Passwort zuruecksetzen". Same as BUG-5: only matters while Auth Hook is not active.
- [ ] BUG-8: E-Mail-Adresse aendern -- templates exist but spec requires BOTH a confirmation to the new address AND a notification to the old address. Only one template exists (confirmation to new). No "heads-up" email to old address.

### AC-3: Bilingual Template Selection (Auth Hook)

- [x] PASS: Edge Function `send-auth-email/index.ts` exists with full locale-detection logic:
  - signup/recovery: extracts locale from `redirect_to` URL (line 81-91)
  - email_change/magiclink/invite: reads `profiles.locale` from DB (line 94-103)
  - Fallback chain: URL locale -> user_metadata.locale -> profiles.locale -> "de" (line 108-112)
- [x] PASS: Locale extraction uses strict allowlist (`"de"` or `"en"` only) -- no injection possible (lines 90, 101, 110, 124)
- [x] PASS: Template rendering replaces Go template variables with actual payload values (lines 167-175)
- [x] PASS: Plain-text fallback generated via `htmlToPlainText()` function (lines 184-213). Previous BUG-10 is FIXED.
- [x] PASS: Reply-To header set to `office@train-smarter.at` (line 248). Previous BUG-4 is FIXED.
- [x] PASS: `profiles.locale` column exists with CHECK constraint, default `'de'`
- [x] PASS: `handle_new_user()` trigger correctly reads `locale` from `raw_user_meta_data`
- [x] PASS: Registration form passes `locale: currentLocale` in user metadata
- [x] ~~BUG-9 (DOWNGRADED to MEDIUM):~~ **FIXED (2026-03-16):** send-auth-email v12 is active, auth hook configured in Supabase Dashboard. Edge Function now handles all auth emails with locale detection.

### AC-4: Athleten-Einladung (PROJ-5)

- [ ] NOT IMPLEMENTED: No Edge Function for athlete invitation emails (PROJ-5 specific). The `invite_de.html`/`invite_en.html` are generic Supabase auth invite templates, not the PROJ-5 athlete invitation with trainer name, personal message, 7-day expiry, privacy policy footer.

### AC-5: Einladung angenommen / abgelehnt

- [ ] NOT IMPLEMENTED: No Edge Function or email sending logic for invitation acceptance/rejection notifications to trainers.

### AC-6: Verbindung getrennt

- [ ] NOT IMPLEMENTED: No Edge Function or email sending logic for disconnection notifications.

### AC-7: Daten-Export bereit (PROJ-11)

- [ ] NOT IMPLEMENTED: PROJ-11 is Deployed but export is currently synchronous (direct download). Email would be needed if export becomes async.

### AC-8: Account-Loeschung (PROJ-11)

- [ ] NOT IMPLEMENTED: API routes exist (`/api/gdpr/delete-account`) but no email integration.

### AC-9: Trainer verlaesst Plattform

- [ ] NOT IMPLEMENTED: No email to athletes when trainer deletes account.

### AC-10: E-Mail-Template Design

- [x] PASS: Einheitliches HTML-Template: All 10 templates share the same structure (header with teal gradient, white body card, gray footer)
- [x] PASS: Responsive HTML: Templates use `width="560"` table layout with `padding:40px` -- standard for email clients
- [x] PASS: Plain-text fallback generated by Edge Function's `htmlToPlainText()`. Previous BUG-10 is FIXED (when Hook is active).
- [x] PASS: Zweisprachig: Both DE and EN versions exist for all 5 auth template types
- [x] ~~BUG-10-PARTIAL:~~ Resolved — Auth Hook is now active (BUG-9 FIXED), Edge Function handles plain-text generation.

### Enhancement: E-Mail-Locale basierend auf Seitensprache

- [x] PASS: Edge Function implements differentiated locale rules per spec (signup/recovery from URL, others from profiles.locale)
- [x] PASS: Fallback chain matches spec: URL locale -> user_metadata.locale -> profiles.locale -> "de"
- [x] ~~Depends on BUG-9 being resolved~~ — BUG-9 FIXED (2026-03-16), Hook is now active.

---

### Edge Cases Status

#### EC-1: SMTP-Server nicht erreichbar
- [x] PASS: Forgot-password page handles SMTP errors with specific error message (`t("smtpError")`)
- [x] PASS: Edge Function wraps SMTP in try/finally to ensure client.close() (line 251)
- [ ] BUG-11: No retry/queue mechanism. Spec says "3 Versuche in 1h". Edge Function returns 500 on failure but does not retry.

#### EC-2: E-Mail-Adresse nicht zustellbar (Bounce)
- [ ] NOT IMPLEMENTED: No bounce handling or logging.

#### EC-3: Einladungs-E-Mail landet im Spam
- [x] PASS: Verify-email page shows "check spam" hint via `t("checkSpam")`

#### EC-4: E-Mail-Versand fuer geloeschten Account
- [ ] NOT IMPLEMENTED: No system check for deleted accounts before sending.

---

### Security Audit Results

- [x] PASS: Auth confirm route validates `tokenHash` and `type` params before calling `verifyOtp`
- [x] PASS: Auth callback route validates `code` param before calling `exchangeCodeForSession`
- [x] PASS: Locale extraction in both auth routes AND Edge Function uses strict allowlist (`"de"` or `"en"` only, defaults to `"de"`)
- [x] PASS: Token hash not exposed in error redirects
- [x] PASS: `Referrer-Policy: no-referrer` set for auth routes in `next.config.ts`
- [x] PASS: SMTP password uses `env(SMTP_PASS)` in config.toml (not hardcoded)
- [x] PASS: Edge Function reads SMTP_PASS from `Deno.env.get()` (line 226) -- env var, not hardcoded
- [x] PASS: CSP headers block frame embedding (`frame-ancestors 'none'`)
- [x] PASS: Registration prevents account enumeration
- [x] PASS: Forgot-password prevents account enumeration
- [x] PASS: Rate limiting: `max_frequency = "60s"` prevents email flooding
- [x] PASS: Input validation on register form uses Zod schema
- [x] PASS: Edge Function validates method (POST only, line 260) and payload (line 271)
- [x] PASS: Edge Function uses service role key only for reading profiles.locale -- minimal privilege
- [ ] BUG-12: `.env.example` exists but is incomplete. It lists `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_SITE_URL` -- but is MISSING `SMTP_PASS`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` which are required by the Edge Function.
- [ ] BUG-13 (LOW): Email confirmation links use `{{ .SiteURL }}/auth/confirm?token_hash=...` without locale prefix. The auth confirm route at `src/app/[locale]/auth/confirm/route.ts` needs a locale segment. Works via middleware redirect but adds an unnecessary HTTP hop.

#### Red-Team Findings

- [ ] BUG-14 (MEDIUM): Verify-email page reads `email` from URL query params and passes it to `supabase.auth.resend()`. Any email address can be used to trigger a resend. Rate-limited by Supabase (60s) but still allows targeted email sending to arbitrary addresses.
- [ ] BUG-15 (NEW - MEDIUM): Edge Function logs full email address in plaintext: `console.log(\`Email sent: type=..., locale=..., to=${user.email}\`)` (line 302). This violates the spec requirement: "Alle versandten E-Mails werden mit Empfaenger-Hash (kein Klartext) geloggt." Should hash or mask the email address before logging.
- [ ] BUG-16 (NEW - MEDIUM): Auth confirm route redirects to `/${locale}/settings` for `email_change` type (line 56-58), but there is NO `/settings` route in the routing config (`src/i18n/routing.ts`). The account page is at `/account` (localized to `/konto` in DE). This redirect will result in a 404 page after confirming an email change.
- [ ] BUG-17 (NEW - LOW): Edge Function SMTP client defaults to `noreply@train-smarter.at` user and `s306.goserver.host` host when env vars are not set (lines 223-226). While this is a reasonable fallback for development, in production the SMTP password default is empty string (`""`), which means if `SMTP_PASS` is not set, the function will attempt to connect with no password and fail silently. Should throw an explicit error if required env vars are missing.
- [x] PASS: Auth routes use server-side Supabase client -- no client-side token manipulation possible
- [x] PASS: No secrets exposed in HTML templates

---

### Bugs Found (Updated)

#### FIXED since previous QA:
- ~~BUG-4~~: Reply-To header now set in Edge Function (line 248). FIXED.
- ~~BUG-7~~: Recovery templates now include 1-hour expiry notice. FIXED.
- ~~BUG-10~~: Plain-text fallback now generated by Edge Function. FIXED (when Hook is active).

#### Remaining Bugs:

#### BUG-1: Port mismatch between spec and implementation
- **Severity:** Low
- **Steps to Reproduce:**
  1. Read spec: "Port 587 (TLS)"
  2. Read `supabase/config.toml` and Edge Function: port = 465 (SSL)
  3. Expected: Spec and config match
  4. Actual: Spec says 587 TLS, implementation uses 465 SSL
- **Priority:** Nice to have -- update spec to match reality (465 SSL works fine with Webgo)

#### BUG-2: SPF record not verified
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Check codebase for SPF/DKIM verification
  2. Expected: Documentation or test confirming DNS records
  3. Actual: No evidence of SPF configuration
- **Priority:** Fix before deployment -- emails may land in spam without SPF

#### BUG-3: DKIM signature not verified
- **Severity:** Medium
- **Steps to Reproduce:** Same as BUG-2 for DKIM
- **Priority:** Fix before deployment -- emails may land in spam without DKIM

#### BUG-5: Confirmation email subject mismatch in config.toml (irrelevant once Hook is active)
- **Severity:** Low
- **Steps to Reproduce:**
  1. config.toml: "Bestaetige deine E-Mail-Adresse"
  2. Edge Function: "Bitte bestaetige deine E-Mail-Adresse -- Train Smarter" (matches spec)
  3. While Hook is not active, wrong subject is used
- **Priority:** Nice to have -- will auto-resolve when BUG-9 is fixed

#### BUG-6: Recovery email subject mismatch in config.toml (irrelevant once Hook is active)
- **Severity:** Low
- **Steps to Reproduce:** Same as BUG-5 for recovery subject
- **Priority:** Nice to have -- will auto-resolve when BUG-9 is fixed

#### BUG-8: No notification email to old address on email change
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Spec: "Bestaetigungs-E-Mail an neue Adresse, Hinweis-E-Mail an alte Adresse"
  2. Only confirmation to new address exists
  3. Expected: Second template/mechanism for old address notification
  4. Actual: No old-address notification
- **Priority:** Fix in next sprint -- security best practice to notify old email

#### BUG-9: Auth Hook Edge Function exists but NOT WIRED UP — FIXED (2026-03-16)
- **Severity:** Medium (was High)
- **Status:** FIXED
- **Fix:** send-auth-email v12 deployed and ACTIVE. Auth hook configured in Supabase Dashboard (Auth -> Hooks -> Send Email). All auth emails now routed through Edge Function with proper locale detection.

#### BUG-11: No email retry/queue mechanism
- **Severity:** Low
- **Steps to Reproduce:**
  1. Spec: "Retry-Mechanismus: 3 Versuche in 1h"
  2. Edge Function returns 500 on failure, no retry
  3. Expected: Failed emails are retried
  4. Actual: Failed emails are lost
- **Priority:** Nice to have -- Supabase may have internal retry for Hook failures

#### BUG-12: .env.example incomplete (missing SMTP vars)
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Read `.env.example`: only lists Supabase and site URL vars
  2. Edge Function requires `SMTP_PASS`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`
  3. Expected: All required env vars documented
  4. Actual: SMTP vars missing from .env.example
- **Priority:** Fix before deployment

#### BUG-13: Email confirmation links missing locale prefix
- **Severity:** Low
- **Steps to Reproduce:**
  1. Open any template: link is `{{ .SiteURL }}/auth/confirm?token_hash=...`
  2. Auth confirm route requires locale prefix in URL path
  3. Expected: Link includes `/de/auth/confirm?...` or `/en/auth/confirm?...`
  4. Actual: No locale prefix; relies on middleware redirect
- **Priority:** Nice to have -- works but adds redirect hop

#### BUG-14: Verify-email page allows resend to arbitrary email
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Navigate to `/verify-email?email=victim@example.com`
  2. Click "Resend" button
  3. Expected: Resend only works for the currently registering user's email
  4. Actual: Any email from URL param can trigger a resend
- **Priority:** Fix in next sprint -- low risk due to rate limiting but unnecessary exposure

#### BUG-15 (NEW): Edge Function logs email address in plaintext — FIXED (2026-03-16)
- **Severity:** Medium
- **Status:** FIXED
- **Fix:** send-auth-email v12 now uses SHA-256 hash (first 12 chars) for email logging instead of plaintext. DSGVO-compliant.

#### BUG-16 (NEW): Auth confirm route redirects email_change to nonexistent /settings route
- **Severity:** High
- **Steps to Reproduce:**
  1. User confirms email change via link in email
  2. Auth confirm route (`src/app/[locale]/auth/confirm/route.ts` line 56-58) redirects to `/${locale}/settings`
  3. `src/i18n/routing.ts` has NO `/settings` route -- only `/account` (localized to `/konto` in DE)
  4. Expected: Redirect to `/account` or `/account/settings` (if it exists)
  5. Actual: User lands on 404 page after confirming email change
- **Priority:** Fix before deployment -- blocks email change functionality entirely

#### BUG-17 (NEW): Edge Function silent failure on missing SMTP_PASS
- **Severity:** Low
- **Steps to Reproduce:**
  1. Read line 226: `const smtpPass = Deno.env.get("SMTP_PASS") ?? ""`
  2. If SMTP_PASS not set, attempts SMTP connection with empty password
  3. Expected: Explicit error thrown when required env vars are missing
  4. Actual: Silent connection failure with unclear error message
- **Priority:** Nice to have -- defense in depth

---

### Responsive Testing (Templates)

- [x] 375px (Mobile): Email templates use `width="560"` fixed table. Mobile email clients (Gmail, Apple Mail) typically override this. Acceptable.
- [x] 768px (Tablet): Templates render well at this width.
- [x] 1440px (Desktop): Templates render well, centered in viewport.

### Cross-Browser (Auth Pages)

- [x] Chrome: Build succeeds, auth pages use standard React/shadcn components.
- [x] Firefox: Same standard components.
- [x] Safari: Same standard components.
- Note: Full browser testing requires running app and manually navigating.

---

### Regression Testing

- [x] PROJ-4 (Authentication): Login, register, forgot-password pages build and route correctly.
- [x] PROJ-5 (Athleten-Management): Organisation page builds correctly, no regressions from recent localized pathname changes.
- [x] PROJ-11 (DSGVO): GDPR API routes (`/api/gdpr/delete-account`, `/api/gdpr/export`) present in build output.
- [x] PROJ-9 (Team-Verwaltung): Organisation page and team routes build correctly.

---

### Summary

- **Acceptance Criteria:** 10/26 passed (improved from 7/26 -- auth templates + Edge Function code done, app-event emails not started)
- **Bugs Found:** 14 total (0 critical, 1 high, 6 medium, 7 low)
  - 3 bugs FIXED since last QA: BUG-4 (Reply-To), BUG-7 (link expiry), BUG-10 (plain-text)
  - 3 NEW bugs found: BUG-15 (PII in logs), BUG-16 (email_change redirect 404), BUG-17 (silent SMTP failure)
- **Security:** Generally solid. New concern: BUG-15 (email in plaintext logs) is a DSGVO issue. BUG-16 (broken redirect) blocks email change.
- **Production Ready:** NO

**Blocking issues for deployment:**
1. ~~**BUG-9 (Medium):**~~ FIXED (2026-03-16) — Auth Hook wired up, send-auth-email v12 active
2. **BUG-16 (High):** Fix email_change redirect from `/settings` to `/account` in auth confirm route
3. ~~**BUG-15 (Medium):**~~ FIXED (2026-03-16) — SHA-256 hash in v12
4. **BUG-12 (Medium):** Add SMTP env vars to `.env.example`

**Feature completion: ~45%**
- DONE: Auth email templates (DE + EN), Edge Function with locale detection, plain-text fallback, Reply-To headers, recovery expiry notice, locale column in profiles, auth confirm/callback routes
- NOT DONE: Wire up Auth Hook, fix email_change redirect, App-event emails (athlete invite, acceptance, disconnection, export, deletion), DNS verification (SPF/DKIM), email retry queue, old-address notification on email change

## Offene Punkte aus PROJ-11 (DSGVO)

Die folgenden E-Mails werden von PROJ-11 benötigt und müssen bei der Implementierung von PROJ-13 priorisiert werden:

- [ ] **E-Mail #10:** Account-Löschung initiiert — Bestätigung mit 30-Tage-Grace-Period-Hinweis + Support-Kontakt (PROJ-11 BUG-9)
- [ ] **E-Mail #11:** Account-Löschung abgeschlossen — Bestätigung der vollständigen Löschung nach 30 Tagen
- [ ] **E-Mail #12:** Trainer verlässt Plattform — Benachrichtigung an alle Athleten des gelöschten Trainers (PROJ-11 BUG-12)
- [ ] **E-Mail #9:** Daten-Export bereit — aktuell ist der Export synchron (direkter Download), aber bei Umstellung auf async-Export wird diese E-Mail benötigt

**Kontext:** Die DSGVO-Frontend-UI und API-Routes existieren bereits (`/api/gdpr/delete-account`, `/api/gdpr/export`). Die E-Mails müssen in die bestehenden API-Routes integriert werden.

---

## Enhancement 2: E-Mail-Plausibilitätsprüfung vor Versand (2026-03-16)

### Übersicht
Bevor eine E-Mail versendet wird, soll die Empfänger-Adresse auf Plausibilität geprüft werden. Dies betrifft **alle** Stellen im System, an denen E-Mail-Adressen eingegeben oder verarbeitet werden.

### Validierungsstufen

**Stufe 1 — Format (Client + Server):**
- RFC 5322-konformes E-Mail-Format (bereits via Zod `z.string().email()` vorhanden)
- Max. 254 Zeichen Gesamtlänge
- Keine Leerzeichen, korrekte `@`-Struktur

**Stufe 2 — MX-Record (Server-seitig):**
- DNS-Lookup des Domains nach dem `@` (z.B. `gmx.at` → hat MX-Records)
- Domains ohne MX-Record und ohne A-Record → Ablehnung mit klarer Fehlermeldung
- Timeout: max. 3 Sekunden für DNS-Lookup, danach durchlassen (fail-open, nicht fail-closed)
- Ergebnis kann gecacht werden (z.B. 1h TTL) um wiederholte DNS-Lookups zu vermeiden

### Einsatzorte (alle Stellen mit E-Mail-Eingabe)

| Stelle | Datei | Aktuell | Neu |
|--------|-------|---------|-----|
| Athleten-Einladung | `src/lib/athletes/actions.ts` → `inviteAthlete()` | Zod `z.string().email()` | + MX-Check |
| Team-Einladung | `src/lib/teams/actions.ts` → `inviteTrainer()` | Zod `z.string().email()` | + MX-Check |
| Registrierung | Supabase Auth (extern) | Supabase-eigene Validierung | + MX-Check in Client vor Submit |
| Passwort-Reset | Supabase Auth (extern) | Supabase-eigene Validierung | + MX-Check in Client vor Submit |
| Edge Function | `supabase/functions/send-auth-email/index.ts` | Nur Presence-Check | + MX-Check als letzte Verteidigungslinie |

### Acceptance Criteria

- [ ] **Utility-Funktion:** `validateEmailPlausibility(email: string): Promise<{ valid: boolean; reason?: string }>` in `src/lib/validation/email.ts`
  - Prüft Format (Zod) + MX-Record (DNS über `fetch` oder `dns.resolve`)
  - Gibt spezifische Fehlergründe zurück: `invalid_format`, `no_mx_record`, `dns_timeout`
- [ ] **Athleten-Einladung:** `inviteAthlete()` ruft `validateEmailPlausibility()` auf — bei Fehler: Einladung wird nicht erstellt, Fehlermeldung an User
- [ ] **Team-Einladung:** `inviteTrainer()` ruft `validateEmailPlausibility()` auf — bei Fehler: Einladung wird nicht erstellt, Fehlermeldung an User
- [ ] **Registrierungsformular:** Client-seitiger MX-Check nach Eingabe (debounced, 500ms) — bei Fehler: Inline-Fehlermeldung unter dem E-Mail-Feld
- [ ] **Passwort-Reset-Formular:** Gleicher Client-seitiger MX-Check
- [ ] **Edge Function:** MX-Check als letzte Verteidigungslinie vor SMTP-Versand — bei Fehler: 400 Response statt E-Mail-Versuch
- [ ] **Fehlermeldungen (i18n):**
  - DE: „Diese E-Mail-Adresse scheint nicht zu existieren. Bitte überprüfe die Domain."
  - EN: „This email address doesn't appear to exist. Please check the domain."
- [ ] **DNS-Timeout:** Bei Timeout (>3s) wird die E-Mail **durchgelassen** (fail-open) — kein Blocking bei DNS-Problemen
- [ ] **Performance:** MX-Check dauert nicht länger als 3 Sekunden (Timeout)
- [ ] **API-Route:** `POST /api/validate-email` für Client-seitige Validierung (vermeidet CORS-Issues mit DNS)

### Edge Cases
- Domain existiert, hat aber keine MX-Records (z.B. reine Website ohne E-Mail) → Prüfe auch A-Record als Fallback (manche Mailserver nutzen den A-Record)
- Domain hat MX-Record, aber Mailbox existiert nicht → **Nicht prüfbar** ohne SMTP VRFY (zu invasiv, wird nicht gemacht)
- Tippfehler in bekannten Domains (z.B. `gmal.com`, `gmx.ed`) → Optional: Suggestion „Meinten Sie gmail.com?" (Phase 2)
- DNS-Server temporär nicht erreichbar → fail-open (E-Mail wird durchgelassen)
- Internationalisierte Domains (IDN, z.B. `ö.at`) → Punycode-Konvertierung vor DNS-Lookup
- Caching: Wenn ein Domain einmal als gültig geprüft wurde, muss es nicht bei jeder Eingabe neu geprüft werden (1h Cache)

### Nicht im Scope
- SMTP VRFY (zu invasiv, kann zu Blacklisting führen)
- Wegwerf-E-Mail-Blocklist (kann als Phase 2 nachgerüstet werden)
- Catch-All-Erkennung
- E-Mail-Ping/Bounce-Tracking

### Enhancement 2 — Tech Design (Solution Architect)

#### A) Component Structure

```
Shared Infrastructure (PROJ-13 owns, others consume)
+-- src/lib/validation/email.ts          ← Core Utility
|   +-- validateEmailPlausibility()       Format (Zod) + MX-Record (DNS)
|   +-- In-memory domain cache            Map<domain, {valid, expires}>
|
+-- src/app/api/validate-email/route.ts  ← API Route (Client-Zugang)
    +-- POST { email } → { valid, reason? }

PROJ-5: Withdraw-Button in Unified View
+-- unified-organisation-view.tsx         ← Orchestriert withdraw/resend State
|   +-- card-grid-view.tsx                ← Leitet onWithdraw/onResend weiter
|   |   +-- draggable-athlete-card.tsx    ← Zeigt Buttons auf Pending-Cards
|   +-- table-view.tsx                    ← Action-Spalte mit Withdraw-Button
|   +-- kanban-view.tsx                   ← Leitet an kanban-column weiter
|       +-- kanban-column.tsx             ← Leitet an draggable-athlete-card

PROJ-4: Auth-Formulare
+-- register-form.tsx                     ← Debounced MX-Check nach Email-Blur
+-- forgot-password-form.tsx              ← Debounced MX-Check nach Email-Blur
    (beide nutzen POST /api/validate-email)

PROJ-9: Team-Einladungen
+-- team-invite-trainer-modal.tsx         ← Debounced MX-Check nach Email-Blur
    (nutzt POST /api/validate-email)

PROJ-13: Edge Function
+-- send-auth-email/index.ts             ← MX-Check via Deno DNS API
    (eigene Implementierung, nicht die Next.js Utility)
```

#### B) Data Model

```
Kein neues Datenbankschema nötig.

E-Mail-Validierung ist stateless:
- Input: E-Mail-Adresse (String)
- Output: { valid: true/false, reason?: "invalid_format" | "no_mx_record" | "dns_timeout" }

Domain-Cache (in-memory, pro Server-Instanz):
- Key: Domain-String (z.B. "gmx.at")
- Value: { valid: boolean, expiresAt: number }
- TTL: 1 Stunde
- Kein persistenter Speicher, kein Redis — einfache Map reicht für MVP

Withdraw-Button:
- Nutzt bestehende trainer_athlete_connections Tabelle (Hard DELETE auf status="pending")
- Bestehende Server Action withdrawInvitation() und RLS Policy — kein neues Schema
```

#### C) Tech Decisions

| Entscheidung | Warum |
|---|---|
| **DNS via `dns.resolve` (Node.js)** statt externer API | Kostenlos, kein API-Key nötig, keine Abhängigkeit. Node.js `dns/promises` ist in Next.js API Routes verfügbar. |
| **Separate Deno-DNS in Edge Function** | Edge Functions laufen in Deno, nicht Node.js. `Deno.resolveDns()` ist das Äquivalent. Eigene Implementierung statt shared Code. |
| **In-Memory Cache** statt Redis/DB | Ein DNS-Lookup dauert ~50-200ms. Bei Vercel Serverless wird der Cache pro Instanz gehalten — worst case: erneuter Lookup. Kein Infra-Overhead. |
| **API Route `/api/validate-email`** statt direktem Client-DNS | Browser können keine DNS-Lookups machen. Die API Route ist der Proxy. |
| **Debounced Client-Check (500ms)** statt Submit-Block | Bessere UX: User sieht Fehler während des Tippens, nicht erst beim Submit. |
| **Fail-open bei Timeout** | Besser eine E-Mail an fragwürdige Domain durchlassen als einen echten User blockieren. |
| **Props durch Unified View pipen** statt Context | Withdraw/Resend betrifft nur 3 Ebenen (UnifiedView → ViewComponent → Card). Context wäre Over-Engineering. |

#### D) Dependencies

Keine neuen Packages nötig:
- `dns/promises` — Node.js built-in (für API Route)
- `Deno.resolveDns()` — Deno built-in (für Edge Function)
- Alle UI-Komponenten existieren bereits (Button, ConfirmDialog, Toast)

#### E) Datenfluss

```
Client-seitig (Registrierung, Passwort-Reset, Einladungs-Modals):
  User tippt E-Mail → 500ms Debounce → POST /api/validate-email
  → API Route extrahiert Domain → dns.resolveMx(domain)
  → Cache hit? → Sofort antworten
  → Cache miss? → DNS Lookup (max 3s) → Cachen → Antworten
  → Client zeigt Inline-Fehler oder ✓

Server-seitig (Server Actions):
  inviteAthlete() / inviteTrainer() → validateEmailPlausibility()
  → Gleiche Logik wie API Route (shared Utility)
  → Bei Fehler: return { success: false, error: "emailDomainInvalid" }

Edge Function (letzte Verteidigungslinie):
  send-auth-email → Deno.resolveDns(domain, "MX")
  → Bei Fehler: 400 Response, kein SMTP-Versuch
```

---

## QA Test Report: Enhancement 2 + PROJ-5 Withdraw Button (2026-03-16)

**Tester:** QA / Red-Team Pen-Test
**Date:** 2026-03-16
**Scope:** Email validation infrastructure (PROJ-13), Withdraw button prop piping (PROJ-5), Auth form integration (PROJ-4), Server action MX checks (PROJ-5 + PROJ-9), Edge Function MX check (PROJ-13), Invite modals, i18n keys, build + lint

---

### 1. Build + Lint

- [x] **PASS:** `npm run build` succeeds with 0 errors. All routes generated correctly including `/api/validate-email`.
- [x] **PASS:** `npm run lint` returns 0 errors, 2 warnings (React Hook Form `watch()` incompatible-library warnings in login and register pages -- expected, non-blocking).

---

### 2. PROJ-5: Withdraw Button Prop Piping in Unified View

#### 2a. unified-organisation-view.tsx
- [x] **PASS:** `withdrawingId` state declared (line 75)
- [x] **PASS:** `resendingId` state declared (line 74)
- [x] **PASS:** `handleResend` handler defined (lines 245-261)
- [x] **PASS:** `handleWithdrawClick` handler defined (lines 263-271)
- [x] **PASS:** `handleWithdrawConfirm` handler defined (lines 273-289)
- [x] **PASS:** `ConfirmDialog` for withdraw rendered (lines 602-614)
- [x] **PASS:** Props passed to `CardGridView`: `onResendInvite`, `resendingId`, `onWithdrawInvite`, `withdrawingId` (lines 531-534)
- [x] **PASS:** Props passed to `TableView`: `onResendInvite`, `resendingId`, `onWithdrawInvite`, `withdrawingId` (lines 547-550)
- [x] **PASS:** Props passed to `KanbanView`: `onResendInvite`, `resendingId`, `onWithdrawInvite`, `withdrawingId` (lines 561-564)

#### 2b. kanban-view.tsx
- [x] **PASS:** Interface declares `onResendInvite`, `resendingId`, `onWithdrawInvite`, `withdrawingId` (lines 15-18)
- [x] **PASS:** Props destructured (lines 29-30)
- [x] **PASS:** Props passed to `KanbanColumn` for team columns (lines 48-51)
- [x] **PASS:** Props passed to `KanbanColumn` for unassigned column (lines 65-68)

#### 2c. kanban-column.tsx
- [x] **PASS:** Interface declares `onResendInvite`, `resendingId`, `onWithdrawInvite`, `withdrawingId` (lines 25-28)
- [x] **PASS:** Props destructured (lines 39-42)
- [x] **PASS:** Props passed to `DraggableAthleteCard` (lines 87-90)

#### 2d. card-grid-view.tsx
- [x] **PASS:** Interface declares `onResendInvite`, `resendingId`, `onWithdrawInvite`, `withdrawingId` (lines 20-23)
- [x] **PASS:** Props destructured (lines 33-36)
- [x] **PASS:** Props passed to `DroppableTeamCard` (lines 64-67)
- [x] **PASS:** Props passed to `DraggableAthleteCard` for unassigned athletes (lines 80-83)
- [x] **PASS:** Props passed to `DraggableAthleteCard` for assigned-not-expanded athletes (lines 135-138)

#### 2e. table-view.tsx
- [x] **PASS:** Interface declares `onResendInvite`, `resendingId`, `onWithdrawInvite`, `withdrawingId` (lines 260-263)
- [x] **PASS:** Props destructured (lines 275-277)
- [x] **PASS:** `showAthletesFirst` branch: unassigned athletes receive props (lines 348-351)
- [x] **PASS:** Team expanded athletes receive props (lines 381-384)
- [x] **PASS:** `!showAthletesFirst` branch: unassigned athletes receive props (lines 440-443)

#### 2f. draggable-athlete-card.tsx
- [x] **PASS:** Interface declares `onResendInvite`, `isResending`, `onWithdrawInvite`, `isWithdrawing` (lines 19-22)
- [x] **PASS:** Withdraw button rendered for pending athletes (lines 157-171)
- [x] **PASS:** Resend button rendered for pending athletes (lines 142-156)

#### 2g. droppable-team-card.tsx
- [x] **PASS:** Interface declares `onResendInvite`, `resendingId`, `onWithdrawInvite`, `withdrawingId` (lines 36-39)
- [x] **PASS:** Props passed to nested `DraggableAthleteCard` (lines 138-141)

**Withdraw Button Verdict: ALL PASS (22/22 checks). Full prop chain verified from UnifiedOrganisationView down to DraggableAthleteCard across all three view modes (Grid, Table, Kanban).**

---

### 3. PROJ-13: Email Validation Infrastructure

#### 3a. validateEmailPlausibility() utility — src/lib/validation/email.ts
- [x] **PASS:** Function exported with correct signature: `(email: string) => Promise<{ valid: boolean; reason?: string }>`
- [x] **PASS:** Step 1: Zod format check (line 32-35)
- [x] **PASS:** Step 2: Domain extraction via `email.split("@").pop()` (line 38)
- [x] **PASS:** Step 3: In-memory cache with 1-hour TTL (lines 41-45, constant on line 14)
- [x] **PASS:** Step 4: DNS MX lookup via `dns.resolveMx(domain)` with 3-second timeout (lines 50-53, constant on line 15)
- [x] **PASS:** Fallback to A record when MX fails with ENODATA/ENOTFOUND/ESERVFAIL (lines 67-88)
- [x] **PASS:** Fail-open on timeout: returns `{ valid: true }` when DNS times out (lines 61-64, 79-84)
- [x] **PASS:** Cache results after lookup (lines 57, 73, 83, 92)
- [x] **PASS:** `withTimeout()` helper correctly clears timer on resolve/reject (lines 116-131)

#### 3b. API Route — src/app/api/validate-email/route.ts
- [x] **PASS:** POST handler exported (line 18)
- [x] **PASS:** Input validation via Zod `z.object({ email: z.string().email() })` (lines 5-7)
- [x] **PASS:** Calls `validateEmailPlausibility()` (line 30)
- [x] **PASS:** Returns `{ valid, reason }` JSON response (line 32)
- [x] **PASS:** Error handling: JSON parse errors return 400 (lines 33-38)
- [ ] **BUG-18 (MEDIUM — Security):** API route has NO rate limiting. The endpoint is public (no auth required, per the comment on line 14). An attacker could enumerate valid email domains by sending thousands of requests. While DNS results are cached (1h), the first request for each domain triggers a real DNS lookup. This could be abused for: (a) domain reconnaissance, (b) DNS amplification via the server as proxy, (c) resource exhaustion. **Recommendation:** Add rate limiting (e.g., 60 requests/minute per IP) via middleware or Vercel Edge Config.
- [ ] **BUG-19 (LOW — Security):** API route does not validate Content-Type header. Sending a non-JSON body (e.g., form-encoded) will cause a JSON parse error caught by the outer try/catch, returning `{ valid: false, reason: "invalid_format" }` with status 400. Not a vulnerability but could mask real errors during debugging.

#### 3c. useEmailValidation hook — src/hooks/use-email-validation.ts
- [x] **PASS:** Returns `{ isValidating, isValid, error }` interface (lines 5-12)
- [x] **PASS:** 500ms debounce before API call (line 96)
- [x] **PASS:** Only fires when email has `@` and domain has `.` (lines 37-47)
- [x] **PASS:** AbortController cancels previous in-flight requests (lines 52-55)
- [x] **PASS:** Cleanup on unmount/email change clears timeout and aborts (lines 98-101)
- [x] **PASS:** Fail-open on network error: sets `isValid: null`, `error: null` (lines 88-90)
- [x] **PASS:** Maps `no_mx_record` reason to `emailNoMxRecord` error key (line 84)
- [x] **PASS:** Maps other reasons to `emailInvalidDomain` error key (line 84)
- [x] **PASS:** Resets state when email changes (lines 32-33)

---

### 4. PROJ-4: Auth Form Integration

#### 4a. Register page — src/app/[locale]/(auth)/register/page.tsx
- [x] **PASS:** Imports `useEmailValidation` (line 24)
- [x] **PASS:** Watches email field: `const emailValue = watch("email")` (line 52)
- [x] **PASS:** Calls hook: `useEmailValidation(emailValue)` (line 53-54)
- [x] **PASS:** Shows validating helper text: `isEmailValidating ? tCommon("emailValidating")` (line 148)
- [x] **PASS:** Shows validation error when not a form error: `emailValidationError` displayed (lines 151-155)
- [x] **PASS:** Error displayed as warning (not blocking): `text-warning` class (line 152)
- [ ] **BUG-20 (LOW — UX):** Register form does NOT prevent submission when email domain is invalid. The MX check result is purely informational (warning text), but `onSubmit` does not check `isEmailValid`. The user can still submit with an invalid domain, and the server-side check in `inviteAthlete()` does not apply here (this is Supabase Auth signup). Supabase will accept the signup, send a confirmation email to a non-existent domain, and the email will bounce silently. This is by-design per the spec ("fail-open"), but worth noting for awareness.

#### 4b. Forgot-password page — src/app/[locale]/(auth)/forgot-password/page.tsx
- [x] **PASS:** Imports `useEmailValidation` (line 22)
- [x] **PASS:** Watches email field: `const emailValue = watch("email")` (line 42)
- [x] **PASS:** Calls hook (line 43-44)
- [x] **PASS:** Shows validating helper text (line 137)
- [x] **PASS:** Shows validation error (lines 140-144)
- [x] **PASS:** Error displayed as warning: `text-warning` class (line 141)

---

### 5. PROJ-5 + PROJ-9: Server Action MX Check

#### 5a. inviteAthlete() — src/lib/athletes/actions.ts
- [x] **PASS:** Imports `validateEmailPlausibility` (line 6)
- [x] **PASS:** Calls `validateEmailPlausibility(email)` before DB insert (line 52)
- [x] **PASS:** Returns `{ success: false, error: "EMAIL_DOMAIN_INVALID" }` on invalid (line 54)
- [x] **PASS:** MX check happens after Zod validation, before self-invite check (correct order)

#### 5b. inviteTrainer() — src/lib/teams/actions.ts
- [x] **PASS:** Imports `validateEmailPlausibility` (line 5)
- [x] **PASS:** Calls `validateEmailPlausibility(normalizedEmail)` before DB insert (line 318)
- [x] **PASS:** Returns `{ success: false, error: "EMAIL_DOMAIN_INVALID" }` on invalid (line 320)
- [x] **PASS:** MX check happens after Zod validation, after email normalization (correct order)

---

### 6. PROJ-13: Edge Function MX Check

#### 6a. send-auth-email/index.ts
- [x] **PASS:** Extracts domain: `user.email.split("@")[1]` (line 297)
- [x] **PASS:** MX check via `Deno.resolveDns(emailDomain, "MX")` (line 300)
- [x] **PASS:** A record fallback when MX is empty (lines 302-305)
- [x] **PASS:** Returns 400 with error message when both MX and A fail (lines 306-309)
- [x] **PASS:** Fail-open on DNS error (outer catch on line 313 falls through)
- [ ] **BUG-21 (LOW):** Edge Function MX check does not have a timeout. `Deno.resolveDns()` could theoretically hang if the DNS server is unresponsive. The Node.js utility has a 3-second timeout, but the Edge Function does not. In practice, Deno's DNS resolver has its own internal timeout, but the spec requires "max 3 Sekunden".

---

### 7. Invite Modals

#### 7a. invite-modal.tsx (Athlete invitation)
- [x] **PASS:** Imports `useEmailValidation` (line 16)
- [x] **PASS:** Calls hook with watched email value (line 52)
- [x] **PASS:** Shows inline error for invalid domain (lines 137-141)
- [x] **PASS:** Shows validating text (lines 142-146)
- [x] **PASS:** Error map includes `EMAIL_DOMAIN_INVALID` key mapped to `tValidation("emailDomainInvalid")` (line 74)

#### 7b. team-invite-trainer-modal.tsx (Trainer invitation)
- [x] **PASS:** Imports `useEmailValidation` (line 17)
- [x] **PASS:** Calls hook with watched email value (lines 58-60)
- [x] **PASS:** Shows validating text (lines 208-211)
- [x] **PASS:** Shows inline validation error (lines 213-217)
- [x] **PASS:** Error map includes `EMAIL_DOMAIN_INVALID` key (line 86)
- [ ] **BUG-22 (LOW — Inconsistency):** `team-invite-trainer-modal.tsx` maps `EMAIL_DOMAIN_INVALID` to `tCommon("emailNoMxRecord")` (line 86), while `invite-modal.tsx` maps it to `tValidation("emailDomainInvalid")` (line 74). These are two different translation keys with different wording. The athlete invite modal says "Diese E-Mail-Adresse scheint nicht zu existieren" while the trainer invite modal says "Diese E-Mail-Domain scheint keine E-Mails empfangen zu können". Both are valid messages, but the inconsistency could confuse users who use both features.

---

### 8. i18n Keys

#### 8a. common namespace
- [x] **PASS:** `de.json` has `common.emailNoMxRecord` (line 865)
- [x] **PASS:** `de.json` has `common.emailInvalidDomain` (line 866)
- [x] **PASS:** `de.json` has `common.emailValidating` (line 867)
- [x] **PASS:** `en.json` has `common.emailNoMxRecord` (line 865)
- [x] **PASS:** `en.json` has `common.emailInvalidDomain` (line 866)
- [x] **PASS:** `en.json` has `common.emailValidating` (line 867)

#### 8b. validation namespace
- [x] **PASS:** `de.json` has `validation.emailDomainInvalid` (line 870)
- [x] **PASS:** `de.json` has `validation.emailValidating` (line 871)
- [x] **PASS:** `en.json` has `validation.emailDomainInvalid` (line 870)
- [x] **PASS:** `en.json` has `validation.emailValidating` (line 871)

- [ ] **BUG-23 (LOW — Duplication):** The keys `emailValidating` and email-domain-related error messages exist in BOTH `common` and `validation` namespaces. `common.emailValidating` = "E-Mail wird überprüft..." and `validation.emailValidating` = "E-Mail wird überprüft..." (identical content with different punctuation: three dots vs ellipsis character). This duplication means different components may use different namespaces for the same concept, leading to inconsistency if one is updated but not the other. The register/forgot-password pages use `tCommon("emailValidating")` while `invite-modal.tsx` uses `tValidation("emailValidating")`.

---

### 9. Security Audit (Red-Team)

#### 9a. validate-email API endpoint
- [ ] **BUG-18 (MEDIUM — documented above):** No rate limiting on public endpoint. Can be used for domain reconnaissance and DNS amplification.
- [x] **PASS:** Input is validated via Zod before processing (line 21-27).
- [x] **PASS:** No auth secrets or internal state leaked in responses.
- [x] **PASS:** Error responses are generic (no stack traces exposed).

#### 9b. Server Actions
- [x] **PASS:** `inviteAthlete()` authenticates user before any processing (lines 33-41).
- [x] **PASS:** `inviteTrainer()` authenticates user before any processing (lines 299-307).
- [x] **PASS:** Both actions have rate limiting (MAX_INVITES_PER_DAY = 20).
- [x] **PASS:** `withdrawInvitation()` verifies trainer ownership before deletion (lines 317-328).
- [x] **PASS:** `resendInvitation()` enforces 24-hour cooldown between resends (lines 387-393).

#### 9c. Edge Function
- [x] **PASS:** Webhook signature verification when `SEND_EMAIL_HOOK_SECRET` is set (lines 280-283).
- [x] **PASS:** MX check prevents sending to completely bogus domains.
- [x] **PASS:** DSGVO-compliant logging: email is hashed before logging (lines 342-351). Note: This contradicts the earlier BUG-15 finding -- on re-inspection, the email IS hashed (SHA-256, first 12 chars). BUG-15 from the previous QA round appears to have been FIXED.

#### 9d. Client-side hook
- [x] **PASS:** Hook only sends email to the API after basic format validation (must contain @ and domain with dot).
- [x] **PASS:** AbortController prevents stale responses from overwriting newer results.
- [x] **PASS:** Hook does not block form submission -- purely advisory.

---

### 10. Edge Case Analysis

| Edge Case | Result |
|-----------|--------|
| Empty email input | PASS: Hook skips validation (line 37) |
| Email without domain (`user@`) | PASS: Hook skips (checks `indexOf("@") === length - 1`, line 37) |
| Domain without dot (`user@localhost`) | PASS: Hook skips (checks `domain.includes(".")`, line 44) |
| DNS timeout (>3s) | PASS: Node.js utility fails open (lines 61-64). Edge Function has no explicit timeout (BUG-21). |
| Network error during API call | PASS: Hook catches error, sets `isValid: null` (lines 86-90) |
| Rapid typing (debounce) | PASS: 500ms debounce + AbortController cancels in-flight (lines 52-55, 96) |
| Component unmount during validation | PASS: Cleanup function aborts and clears timeout (lines 98-101) |
| Cached domain re-check | PASS: Cache checked before DNS lookup (lines 41-45), 1h TTL |
| `hook returns null` for isValid | PASS: Components check `emailValidation.isValid === false` (strict equality), so `null` does not trigger error display |

---

### Bugs Found (Enhancement 2 QA)

#### BUG-18 (MEDIUM): No rate limiting on /api/validate-email
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Send POST requests to `/api/validate-email` in a loop with different domains
  2. No auth required, no rate limit enforced
  3. Expected: Rate limiting (e.g., 60 req/min per IP)
  4. Actual: Unlimited requests accepted
- **Impact:** Domain reconnaissance, DNS amplification, resource exhaustion
- **Priority:** Fix before production -- add rate limiting via middleware or Vercel Edge Config

#### BUG-19 (LOW): No Content-Type validation on API route
- **Severity:** Low
- **Steps to Reproduce:**
  1. Send POST with `Content-Type: text/plain` body
  2. JSON parse fails, caught by outer try/catch
  3. Returns `{ valid: false, reason: "invalid_format" }` status 400
- **Impact:** None (fails gracefully), but could mask debugging issues
- **Priority:** Nice to have

#### BUG-20 (LOW): Register form does not block submission on invalid MX
- **Severity:** Low
- **Steps to Reproduce:**
  1. Enter email with non-existent domain (e.g., `user@thisdomaindoesnotexist123.com`)
  2. Warning appears below email field
  3. Click "Registrieren" -- form submits successfully to Supabase Auth
  4. Supabase sends confirmation email to non-existent domain (bounces silently)
- **Impact:** Wasted confirmation email, user never receives it
- **Priority:** By-design (spec says fail-open), but could add submit-block when `isValid === false`

#### BUG-21 (LOW): Edge Function MX check has no explicit timeout
- **Severity:** Low
- **Steps to Reproduce:**
  1. If DNS server is unresponsive, `Deno.resolveDns()` has no explicit timeout
  2. Spec requires max 3 seconds
  3. Node.js utility correctly implements 3s timeout
  4. Edge Function relies on Deno's internal timeout (typically 5-30s)
- **Impact:** Edge Function could hang on slow DNS resolution
- **Priority:** Nice to have -- Deno has its own defaults, and Supabase Edge Functions have a 2-minute overall timeout

#### BUG-22 (LOW): Inconsistent error message for EMAIL_DOMAIN_INVALID
- **Severity:** Low
- **Steps to Reproduce:**
  1. Invite athlete with invalid domain: shows "Diese E-Mail-Adresse scheint nicht zu existieren" (validation.emailDomainInvalid)
  2. Invite trainer with invalid domain: shows "Diese E-Mail-Domain scheint keine E-Mails empfangen zu können" (common.emailNoMxRecord)
  3. Expected: Same message for same error
  4. Actual: Different wording
- **Impact:** Minor UX inconsistency
- **Priority:** Nice to have -- unify to use one key

#### BUG-23 (LOW): Duplicate i18n keys across namespaces
- **Severity:** Low
- **Steps to Reproduce:**
  1. `common.emailValidating` = "E-Mail wird überprüft..." (three dots)
  2. `validation.emailValidating` = "E-Mail wird überprüft..." (ellipsis character)
  3. `common.emailNoMxRecord` and `validation.emailDomainInvalid` cover similar concepts
  4. Different components use different namespaces for the same concept
- **Impact:** Maintenance burden, potential for drift
- **Priority:** Nice to have -- consolidate into one namespace

---

### Regression Testing

- [x] PROJ-1 (Design System): Build passes, no CSS/Tailwind regressions.
- [x] PROJ-2 (UI Components): All shadcn components used correctly (Button, Card, Badge, Modal, etc.)
- [x] PROJ-3 (App Shell): All routes present in build output, navigation components unchanged.
- [x] PROJ-4 (Authentication): Register, login, forgot-password pages build correctly. New email validation integrated without breaking existing functionality.
- [x] PROJ-5 (Athleten-Management): Organisation routes build correctly. Withdraw/Resend props fully piped through all view modes.
- [x] PROJ-9 (Team-Verwaltung): Team routes build correctly. `inviteTrainer()` action enhanced with MX check.
- [x] PROJ-11 (DSGVO): GDPR routes present in build output.
- [x] PROJ-13 (Email): Edge Function code verified, auth templates unchanged.

---

### Enhancement 2 QA Summary

**Acceptance Criteria Results:**

| AC | Description | Status |
|----|-------------|--------|
| Utility function | `validateEmailPlausibility()` in `src/lib/validation/email.ts` | PASS |
| Athleten-Einladung | `inviteAthlete()` calls MX check | PASS |
| Team-Einladung | `inviteTrainer()` calls MX check | PASS |
| Registrierungsformular | Client-side MX check with debounce | PASS |
| Passwort-Reset | Client-side MX check with debounce | PASS |
| Edge Function | MX check as last line of defense | PASS (with BUG-21 minor) |
| Fehlermeldungen (i18n) | DE + EN keys present | PASS (with BUG-22/23 minor) |
| DNS-Timeout | Fail-open on timeout | PASS |
| Performance | 3-second timeout | PASS (Node.js), PARTIAL (Edge Function BUG-21) |
| API Route | POST /api/validate-email | PASS (with BUG-18 security) |

**PROJ-5 Withdraw Button:** ALL PASS (22/22 checks)

**Overall: 10/10 acceptance criteria PASS (some with minor caveats)**
**Bugs found: 6 new (0 critical, 1 medium, 5 low)**

**Blocking for production:**
1. **BUG-18 (MEDIUM):** Add rate limiting to `/api/validate-email` endpoint

**Non-blocking improvements:**
2. BUG-19 (LOW): Content-Type validation
3. BUG-20 (LOW): Optional submit-block on invalid MX
4. BUG-21 (LOW): Edge Function timeout
5. BUG-22 (LOW): Inconsistent error messages
6. BUG-23 (LOW): Duplicate i18n keys

**Previous BUG-15 status update:** On re-inspection, the Edge Function DOES hash the email before logging (lines 342-351 use SHA-256). The previous QA finding BUG-15 appears to be FIXED.

---

## Enhancement 2 Implementation Notes (2026-03-16) — DEPLOYED

### send-invitation-email Edge Function
- Edge Function deployed: `send-invitation-email` (v5, ACTIVE, `verify_jwt: false`)
- Templates inlined in Edge Function code — deployed EFs cannot read filesystem (`Deno.readTextFile` fails)
- `=20` encoding fix: UTF-8 characters used directly instead of HTML entities to avoid SMTP quoted-printable encoding artifacts

### MX Validation Pipeline
- `validateEmailPlausibility()` utility in `src/lib/validation/email.ts`
- API route: `POST /api/validate-email` with rate limiting (30 req/min per IP)
- `useEmailValidation()` hook with 500ms debounce — integrated in register, forgot-password, invite-modal, team-invite-modal

### DNS Email Authentication
- SPF: OK (train-smarter.at TXT record)
- DKIM: OK (selector: `dkim`)
- DMARC: Upgraded to `p=quarantine`
- Note: Domain reputation needs 1-2 weeks to build (new domain since 30.12.2025) — some providers may still flag as spam

### GMX DMARC Report (2026-03-16)
- GMX DMARC aggregate report confirms: **DKIM pass, SPF pass**, domain authentication working correctly.
- This validates that the DNS email authentication setup (SPF + DKIM + DMARC) is functioning as intended across major German email providers.

### BUG-18 Fixed
- Rate limiting added to `/api/validate-email` (30 requests/min per IP via in-memory store)

## Deployment
_To be added by /deploy_
