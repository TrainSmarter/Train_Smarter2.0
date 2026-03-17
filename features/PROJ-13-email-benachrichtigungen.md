# PROJ-13: E-Mail & Transaktions-Benachrichtigungen

## Status: Deployed
**Created:** 2026-03-12
**Last Updated:** 2026-03-17 (DMARC upgrade: p=none → p=quarantine, rua Reports deaktiviert)

## Deployment
- **Production URL:** https://www.train-smarter.at
- **Deployed:** 2026-03-15 (initial), 2026-03-16 (hotfixes v11-v20), 2026-03-17 (deliverability fix v23)
- **Edge Function:** `send-auth-email` deployed to Supabase (v23, ACTIVE — via MCP deploy)
- **Edge Function:** `send-invitation-email` deployed to Supabase (v15, ACTIVE — via MCP deploy)
- **Vercel:** Auto-deployed from main branch
- **WICHTIG:** Edge Functions MÜSSEN über Supabase MCP deployed werden, NICHT via CLI auf Windows (siehe Hotfix 2026-03-17)

## Hotfix 2026-03-17: Email Deliverability — Gmail Inbox, kein Spam mehr

**Problem:** Emails landeten bei GMX im Spam, bei Gmail kamen sie zeitweise gar nicht an. Mail-Tester Score war niedrig.

**Root Causes (7 Bugs identifiziert und behoben):**

### BUG 1: Fake Microsoft Outlook Headers (KRITISCHSTER SPAM-TRIGGER)
- Die `denomailer@1.6.0` Library injiziert automatisch fake Headers:
  - `X-Mailer: Microsoft Outlook 16.0`
  - `Thread-Index: ...` (Outlook-spezifisch)
  - `X-OlkEid: ...` (Outlook-spezifisch)
- **Auswirkung:** Phishing-Erkennung bei Spam-Filtern — Email behauptet von Outlook zu kommen, wird aber von einem Server gesendet
- **Fix:** `X-Mailer` wird mit `Train Smarter Mailer 1.0` überschrieben

### BUG 2: List-Unsubscribe auf Transaktions-Emails
- `List-Unsubscribe` und `List-Unsubscribe-Post` Headers waren auf Confirmation/Recovery/etc. gesetzt
- **Auswirkung:** Signalisiert "Marketing-Email" → Spam-Filter stuft als Bulk-Mail ein
- **Fix:** Beide Headers entfernt, stattdessen `Auto-Submitted: auto-generated` gesetzt

### BUG 3: Config Push überschreibt Produktions-Secrets
- `npx supabase config push` ohne gesetzte Env-Vars (`SEND_EMAIL_HOOK_SECRET`, `SMTP_PASS`) überschreibt die echten Secrets mit Platzhaltern
- **Auswirkung:** Auth Hook wird deaktiviert (Secret ungültig), SMTP-Passwort kaputt → KEINE Emails mehr
- **Fix:** Validierungs-Scripts (`scripts/validate-config.sh`), Tests in `email-config.test.ts`, Deployment-Rules in `.claude/rules/email-deployment.md`
- **REGEL:** NIEMALS `config push` ohne SEND_EMAIL_HOOK_SECRET und SMTP_PASS Env-Vars!

### BUG 4: Windows CLI Deployment erzeugt ungültige Pfade
- `npx supabase functions deploy` von Windows erstellt Entrypoint-Pfade mit Backslashes (`c:\\tmp\\...`)
- Supabase Runtime ist Linux → Datei wird nicht gefunden → Edge Function crasht beim Boot
- **Auswirkung:** Edge Function wird aufgerufen aber crasht sofort → Auth Hook bekommt 500 → keine Emails
- **Fix:** Deployment NUR über Supabase MCP `deploy_edge_function` Tool (erzeugt korrekte `file:///tmp/.../index.ts` Pfade)
- **REGEL:** NIEMALS Edge Functions via CLI auf Windows deployen — IMMER MCP verwenden!

### BUG 5: DMARC p=quarantine auf neuer Domain
- `p=quarantine` bei einer frischen Domain ohne etablierte Reputation → sofortige Spam-Klassifizierung
- **Fix (2026-03-16):** DNS geändert zu `p=none` bis Reputation aufgebaut ist
- **Update (2026-03-17):** Reputation etabliert (Gmail INBOX, DKIM pass). DMARC hochgestuft:
  - `p=none` → `p=quarantine` (aktiver Schutz gegen Domain-Spoofing)
  - `rua=mailto:office@train-smarter.at` entfernt (DMARC Aggregate Reports deaktiviert — verstopften Postfach)
- **Aktueller DMARC:** `v=DMARC1; p=quarantine; aspf=r; adkim=r;`
- **DNS-Änderung erforderlich:** TXT-Record `_dmarc.train-smarter.at` im webgo DNS-Panel manuell aktualisieren

### BUG 6: SPF ~all statt -all
- `~all` (Softfail) statt `-all` (Hardfail) reduziert Trust-Score
- **Fix:** DNS geändert zu `v=spf1 include:webgo.de mx -all`

### BUG 7: max_frequency zu aggressiv
- `max_frequency = "1s"` erlaubte Rapid-Fire Emails → IP-Reputation beschädigt
- `max_frequency = "60s"` verursachte UX-Probleme bei wiederholten Registrierungsversuchen
- **Fix:** `max_frequency = "30s"` als Kompromiss (in config.toml)

**Ergebnis nach Fix:**
- **Gmail:** `dkim=pass`, `spf=pass`, `dmarc=pass (p=NONE)` → **INBOX** (kein Spam!)
- **GMX:** `dkim=pass` → temporär noch Spam (Domain-Reputation braucht 24-48h)
- **Mail-Tester Score:** 8/10

**Test-Absicherung:** 54 Tests in 3 Dateien + 3 Deployment-Safeguard-Scripts (Commit `58b539b`)

---

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
- [x] Supabase Custom SMTP konfiguriert: Webgo SMTP-Server `s306.goserver.host`, Port 465 (TLS), `noreply@train-smarter.at`
- [x] SPF-Eintrag gesetzt: `v=spf1 include:webgo.de mx -all` (Hardfail)
- [x] DKIM-Signatur konfiguriert und verifiziert: `dkim=pass header.i=@train-smarter.at` (bestätigt durch Gmail + GMX)
- [x] DMARC konfiguriert: `v=DMARC1; p=none; rua=mailto:office@train-smarter.at; aspf=r; adkim=r;`
- [x] Test-E-Mail erfolgreich zugestellt: Gmail INBOX (kein Spam), Mail-Tester Score 8/10
- [x] Korrekte Headers: `From`, `Reply-To`, `Auto-Submitted: auto-generated`, `X-Mailer: Train Smarter Mailer 1.0`, `Feedback-ID`
- [x] KEINE Marketing-Headers auf Transaktions-Mails: kein `List-Unsubscribe`, kein `List-Unsubscribe-Post`, kein `Precedence: bulk`
- [x] Auth Hook Secret und SMTP-Passwort korrekt in Supabase Auth Config + Edge Function Secrets
- [x] 54 automatisierte Tests sichern Email-Deliverability ab (Header-Validierung, Config-Checks, DNS-Prüfung)

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
- **Infrastructure:** Webgo SMTP (`s306.goserver.host:465`, TLS) als primärer Mail-Provider
- **Auth-Emails:** Supabase Auth Hook (`send_email`) ruft Edge Function `send-auth-email` auf → SMTP-Versand
- **App-Emails:** Edge Function `send-invitation-email` für Athleten-Einladungen → SMTP-Versand
- **Security:** SMTP-Credentials als Supabase Secrets (nie im Code), Hook-Secret als `env(SEND_EMAIL_HOOK_SECRET)` in config.toml
- **Deliverability (verifiziert 2026-03-17):**
  - SPF: `v=spf1 include:webgo.de mx -all` (Hardfail) → `spf=pass`
  - DKIM: `dkim._domainkey.train-smarter.at` via Webgo → `dkim=pass`
  - DMARC: `p=none` (neue Domain, Reputation aufbauen) → `dmarc=pass`
  - X-Mailer: `Train Smarter Mailer 1.0` (denomailer Default MUSS überschrieben werden!)
  - Keine Marketing-Headers (List-Unsubscribe) auf Transaktions-Mails
- **Logging:** DSGVO-konform — SHA-256 Hash des Empfängers, kein Klartext, Typ + Locale + Erfolg/Fehler
- **Rate-Limiting:** `max_frequency = "30s"` in Supabase Auth Config
- **Deployment:** Edge Functions NUR über Supabase MCP deployen (Windows CLI erzeugt ungültige Pfade!)
- **Tests:** 54 automatisierte Tests (email-config, email-headers, dns-config) + 3 Deployment-Safeguard-Scripts

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

**Template-Struktur (INLINE — kein Dateisystem in Edge Functions!):**
```
supabase/functions/send-auth-email/index.ts
  └── TEMPLATES Record mit Inline-HTML:
      ├── confirmation_de / confirmation_en
      ├── recovery_de / recovery_en
      ├── invite_de / invite_en
      ├── magic_link_de / magic_link_en
      └── email_change_de / email_change_en

supabase/functions/send-invitation-email/index.ts
  └── TEMPLATES Record mit Inline-HTML:
      ├── de (Athleten-Einladung)
      └── en (Athlete Invitation)
```
**REGEL:** Deno.readTextFile() funktioniert NICHT in deployed Edge Functions — Templates IMMER inline!

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

## QA Test Results (Re-Test #3 -- Email Deliverability Focus)

**Tested:** 2026-03-17
**Previous QA:** 2026-03-15 (Re-Test #2)
**App URL:** https://www.train-smarter.at + http://localhost:3000
**Tester:** QA Engineer (AI)
**Build:** FAIL (type error in `src/lib/athletes/queries.ts` -- unrelated to PROJ-13, see REGRESSION-1)
**Edge Functions:** send-auth-email v23, send-invitation-email v15 (both deployed via MCP)

### Scope Note

This QA run focuses on: (1) the 176 automated email tests, (2) deployment safeguard scripts, (3) verification that all 7 spam bugs from the 2026-03-17 hotfix are properly covered by tests, and (4) Edge Function source code matches the deployed versions (v23/v15). Additionally, previously reported bugs are re-verified for fix status.

---

### Automated Test Results

**176 tests across 5 files -- ALL PASSING**

| Test File | Tests | Status | Covers |
|-----------|-------|--------|--------|
| `email-config.test.ts` | 13 | PASS | BUG 3 (config secrets), BUG 7 (max_frequency), auth hook + SMTP config |
| `email-headers.test.ts` | 48 | PASS | BUG 1 (fake Outlook), BUG 2 (List-Unsubscribe), header whitelist, spam prevention, footer compliance, DSGVO logging, no tracking pixels |
| `email-templates.test.ts` | 72 | PASS | Template completeness (10 auth + 2 invitation), variable replacement, language correctness (DE/EN), subject line branding |
| `email-locale.test.ts` | 17 | PASS | Locale detection per email type, URL extraction, fallback chain, Locale type safety |
| `dns-config.test.ts` | 9 | PASS | BUG 5 (DMARC p=none), BUG 6 (SPF -all), DKIM existence, MX records, A records |
| **Total** | **176** | **ALL PASS** | |

### 7 Spam Bug Coverage Verification

| Bug | Description | Test Coverage | Verified |
|-----|-------------|--------------|----------|
| BUG 1 | Fake Outlook headers (denomailer) | `email-headers.test.ts`: 4 tests per function (no "Microsoft Outlook", no X-OlkEid, no Thread-Index, X-Mailer override present) | PASS |
| BUG 2 | List-Unsubscribe on transactional emails | `email-headers.test.ts`: 2 tests per function (no List-Unsubscribe, no List-Unsubscribe-Post) | PASS |
| BUG 3 | Config push overwrites secrets | `email-config.test.ts`: 2 tests (hook secrets use env(), SMTP pass uses env()) | PASS |
| BUG 4 | Windows CLI invalid paths | `validate-edge-function-deploy.sh`: platform detection + warning on Windows | PASS (script-level) |
| BUG 5 | DMARC p=quarantine on new domain | `dns-config.test.ts`: 3 tests (not quarantine, is none or reject, has rua) | PASS |
| BUG 6 | SPF ~all instead of -all | `dns-config.test.ts`: 2 tests (has -all, does not have ~all) | PASS |
| BUG 7 | max_frequency too aggressive | `email-config.test.ts`: 3 tests (is set, between 15s-60s, not 1s) | PASS |

### Deployment Safeguard Scripts

| Script | Purpose | Status |
|--------|---------|--------|
| `scripts/validate-config.sh` | Pre-config-push validation (7 checks: hook enabled, URI, secrets, SMTP, max_frequency, confirmations) | PASS -- properly blocks unsafe config push |
| `scripts/validate-edge-function-deploy.sh` | Pre-deploy validation (env vars, Windows detection, config.toml placeholders, source file checks) | PASS -- properly warns on Windows, checks X-Mailer + List-Unsubscribe |
| `scripts/deploy-edge-functions.sh` | Safe deployment wrapper (env var validation, OS detection, MCP instructions on Windows) | PASS -- correctly refuses CLI deploy on Windows |
| `.claude/rules/email-deployment.md` | Mandatory deployment rules for agents | PASS -- comprehensive, covers all 7 bugs |

### Edge Function Source Code Verification (v23 / v15)

**send-auth-email (v23):**
- [x] PASS: X-Mailer set to "Train Smarter Mailer 1.0" (line 820)
- [x] PASS: No List-Unsubscribe headers in code
- [x] PASS: Auto-Submitted: auto-generated (line 819)
- [x] PASS: SHA-256 email hashing for logs (lines 907-913), to_hash in log output (line 916) -- DSGVO compliant
- [x] PASS: SMTP env var validation throws explicit error on missing vars (lines 789-792) -- BUG-17 FIXED
- [x] PASS: APP_URL hardcoded to "https://www.train-smarter.at" (line 714) -- not using email_data.site_url
- [x] PASS: Webhook signature verification with StandardWebhooks (lines 845-847)
- [x] PASS: MX record plausibility check before sending (lines 862-881)
- [x] PASS: Inline templates (no Deno.readTextFile) -- 10 templates in TEMPLATES record
- [x] PASS: htmlToPlainText() generates multipart/alternative content
- [x] PASS: Locale detection: signup/recovery from redirect_to URL, others from profiles.locale
- [x] PASS: Fallback chain: URL locale -> user_metadata.locale -> profiles.locale -> "de"

**send-invitation-email (v15):**
- [x] PASS: X-Mailer set to "Train Smarter Mailer 1.0" (line 260)
- [x] PASS: No List-Unsubscribe headers in code
- [x] PASS: Auto-Submitted: auto-generated (line 259)
- [x] PASS: SHA-256 email hashing for logs (hashEmail function, lines 70-78)
- [x] PASS: SMTP env var validation throws explicit error on missing vars (lines 229-233) -- BUG-17 FIXED
- [x] PASS: Authorization check: Bearer token required (lines 336-341)
- [x] PASS: Role check: only TRAINER can send invitations (lines 358-364)
- [x] PASS: escapeHtml() on trainerName prevents XSS in templates (line 165)
- [x] PASS: inviteLink validated as valid URL with http/https protocol (lines 288-295)
- [x] PASS: Locale strict validation: only "de" or "en" accepted (line 299)
- [x] PASS: Inline templates (TEMPLATE_DE, TEMPLATE_EN) -- no Deno.readTextFile

---

### AC-1: E-Mail-Infrastruktur Setup

- [x] PASS: Supabase Custom SMTP konfiguriert: `s306.goserver.host`, Port 465 (SSL), `noreply@train-smarter.at` -- verified in config.toml
- [x] PASS: SPF record: `v=spf1 include:webgo.de mx -all` (hardfail) -- verified by dns-config.test.ts (live DNS lookup)
- [x] PASS: DKIM: `dkim._domainkey.train-smarter.at` exists -- verified by dns-config.test.ts (live DNS lookup)
- [x] PASS: DMARC: `p=none` with rua -- verified by dns-config.test.ts (live DNS lookup)
- [x] PASS: Gmail delivery confirmed: dkim=pass, spf=pass, dmarc=pass -- documented in hotfix notes
- [x] PASS: Headers correct: Auto-Submitted, X-Mailer, Feedback-ID, Message-ID, Reply-To -- verified by tests
- [x] PASS: No marketing headers on transactional mails -- verified by tests
- [x] PASS: Auth Hook Secret uses env(SEND_EMAIL_HOOK_SECRET) -- verified by email-config.test.ts
- [x] PASS: 176 automated tests covering deliverability -- ALL PASSING
- [ ] ~~BUG-1 (spec/impl mismatch):~~ Spec updated to say Port 465 (TLS). RESOLVED.
- [ ] ~~BUG-2 (SPF not verified):~~ Now verified by dns-config.test.ts. RESOLVED.
- [ ] ~~BUG-3 (DKIM not verified):~~ Now verified by dns-config.test.ts. RESOLVED.

### AC-2: Supabase Auth E-Mails (via Custom SMTP + Auth Hook)

- [x] PASS: Registrierung / E-Mail-Bestätigung: inline template in Edge Function, correct subject "Bitte bestaetige deine E-Mail-Adresse -- Train Smarter"
- [x] PASS: Passwort-Reset: template with 1-hour expiry notice, subject "Passwort zuruecksetzen -- Train Smarter"
- [x] PASS: E-Mail-Adresse aendern: template exists for confirmation to new address
- [x] PASS: All Auth E-Mails bilingual (DE + EN) -- 10 templates, verified by email-templates.test.ts
- [x] PASS: Consistent layout: Teal gradient header, white body, gray footer with Graz/Austria address
- [ ] BUG-8 (MEDIUM): No notification email to old address on email change -- only confirmation to new address exists

### AC-3: Bilingual Template Selection (Auth Hook)

- [x] PASS: Auth Hook active (v23), all auth emails routed through Edge Function
- [x] PASS: Locale detection per email type verified by email-locale.test.ts (17 tests)
- [x] PASS: Subject lines bilingual with "Train Smarter" branding -- verified by email-templates.test.ts
- [x] PASS: profiles.locale column with CHECK constraint and default 'de'
- [x] PASS: Registration form passes locale in user metadata

### AC-4: Athleten-Einladung (PROJ-5)

- [x] PASS: send-invitation-email Edge Function (v15) deployed and active
- [x] PASS: DE + EN templates with trainer name, personal message block, 7-day expiry, Graz/Austria footer
- [x] PASS: CTA buttons: "Einladung annehmen" (DE) / "Accept Invitation" (EN)
- [x] PASS: Subject includes trainer name: "Du wurdest von [Name] zu Train Smarter eingeladen"
- [x] PASS: Reply-To: office@train-smarter.at
- [x] PASS: Authorization check (Bearer token + TRAINER role required)

### AC-5: Einladung angenommen / abgelehnt

- [ ] NOT IMPLEMENTED: No email notification to trainer when athlete accepts/declines invitation

### AC-6: Verbindung getrennt

- [ ] NOT IMPLEMENTED: No email notification for disconnection events

### AC-7: Daten-Export bereit (PROJ-11)

- [ ] NOT IMPLEMENTED: Export is synchronous (direct download), email not needed yet

### AC-8: Account-Loeschung (PROJ-11)

- [ ] NOT IMPLEMENTED: API routes exist but no email integration

### AC-9: Trainer verlaesst Plattform

- [ ] NOT IMPLEMENTED: No email to athletes when trainer deletes account

### AC-10: E-Mail-Template Design

- [x] PASS: Unified HTML template structure across all 12 templates
- [x] PASS: Responsive HTML (560px table layout)
- [x] PASS: Plain-text fallback via htmlToPlainText() in both Edge Functions
- [x] PASS: Bilingual (DE + EN) for all implemented email types
- [x] PASS: Teal primary color (#0D9488) for CTAs
- [x] PASS: Footer with physical address (Graz, Austria) and train-smarter.at domain

### Enhancement: E-Mail-Locale basierend auf Seitensprache

- [x] PASS: Differentiated locale rules active in Edge Function (v23)
- [x] PASS: Fallback chain correct: URL locale -> user_metadata.locale -> profiles.locale -> "de"
- [x] PASS: Verified by 17 dedicated locale tests

---

### Edge Cases Status

#### EC-1: SMTP-Server nicht erreichbar
- [x] PASS: Edge Function wraps SMTP in try/finally (client.close())
- [x] PASS: Forgot-password page handles SMTP errors with t("smtpError")
- [ ] BUG-11 (LOW): No retry/queue mechanism (spec says 3 retries in 1h). Edge Function returns 500 on failure.

#### EC-2: E-Mail-Adresse nicht zustellbar (Bounce)
- [ ] NOT IMPLEMENTED: No bounce handling or logging

#### EC-3: Einladungs-E-Mail landet im Spam
- [x] PASS: Verify-email page shows "check spam" hint
- [x] PASS: 176 automated tests prevent spam-triggering regressions

#### EC-4: E-Mail-Versand fuer geloeschten Account
- [ ] NOT IMPLEMENTED: No pre-send check for deleted accounts

---

### Security Audit Results

- [x] PASS: Auth confirm route validates tokenHash and type before verifyOtp
- [x] PASS: Auth callback route validates code before exchangeCodeForSession
- [x] PASS: Locale extraction strict allowlist ("de" | "en" only)
- [x] PASS: Token hash not exposed in error redirects
- [x] PASS: Referrer-Policy: no-referrer for auth routes
- [x] PASS: SMTP password uses env(SMTP_PASS) in config.toml
- [x] PASS: Edge Functions read SMTP_PASS from Deno.env.get() -- not hardcoded
- [x] PASS: SMTP env var validation: explicit throw on missing vars (both functions)
- [x] PASS: CSP headers block frame embedding (frame-ancestors 'none')
- [x] PASS: Registration and forgot-password prevent account enumeration
- [x] PASS: Rate limiting: max_frequency = "30s" (verified by email-config.test.ts)
- [x] PASS: Input validation on register form uses Zod schema
- [x] PASS: send-auth-email validates method (POST only) and payload structure
- [x] PASS: send-auth-email uses service role key only for profiles.locale (minimal privilege)
- [x] PASS: send-auth-email verifies webhook signature (StandardWebhooks)
- [x] PASS: send-invitation-email requires Bearer token + TRAINER role
- [x] PASS: send-invitation-email validates inviteLink as valid URL with http/https protocol
- [x] PASS: send-invitation-email escapes trainerName with escapeHtml() -- XSS prevention
- [x] PASS: DSGVO-compliant logging in both functions (SHA-256 hash, no PII)
- [x] PASS: MX record plausibility check in send-auth-email before sending
- [x] PASS: No secrets exposed in HTML templates or client-side code

#### Red-Team Findings

**BUG-14 (MEDIUM -- still open):** Verify-email page reads `email` from URL query params and passes it to `supabase.auth.resend()`. Any email address can be passed to trigger a resend to an arbitrary address.
- **Steps to Reproduce:**
  1. Navigate to `/de/verify-email?email=victim@example.com`
  2. Click "Erneut senden" button
  3. Supabase sends a signup confirmation email to victim@example.com
- **Mitigation:** Rate-limited to 30s by Supabase, only works for type "signup"
- **Risk:** Low -- cannot be used for spam (rate limited), only confirms existing signups
- **Recommendation:** Validate that the email matches a recent registration from the same session

**NEW BUG-18 (LOW -- security hardening):** send-auth-email bypasses webhook signature verification when SEND_EMAIL_HOOK_SECRET is not set (lines 845-849). In development this is convenient but if somehow deployed without the secret, any POST request to the function endpoint could trigger email sending.
- **Steps to Reproduce:**
  1. Deploy send-auth-email without SEND_EMAIL_HOOK_SECRET set
  2. Send a crafted POST to the function URL with arbitrary user.email
  3. Edge Function processes the request without signature verification
- **Mitigation:** Production has the secret set; the env var is enforced by validate-edge-function-deploy.sh
- **Risk:** Low -- defense-in-depth concern only
- **Recommendation:** Consider rejecting requests entirely when hook secret is missing (fail-closed)

---

### Previously Reported Bugs -- Status Update

| Bug | Previous Status | Current Status | Notes |
|-----|----------------|----------------|-------|
| BUG-1 | Low (spec mismatch) | RESOLVED | Spec updated to Port 465 |
| BUG-2 | Medium (SPF unverified) | RESOLVED | dns-config.test.ts verifies live DNS |
| BUG-3 | Medium (DKIM unverified) | RESOLVED | dns-config.test.ts verifies live DNS |
| BUG-4 | Medium (no Reply-To) | FIXED | Reply-To in both Edge Functions |
| BUG-5 | Low (subject mismatch) | RESOLVED | Auth Hook active, Edge Function subjects used |
| BUG-6 | Low (subject mismatch) | RESOLVED | Same as BUG-5 |
| BUG-7 | Medium (link expiry) | FIXED | Recovery templates have 1-hour notice |
| BUG-8 | Medium (no old-email notify) | OPEN | Still no notification to old address |
| BUG-9 | High (hook not wired) | FIXED | Auth Hook active since v12, now at v23 |
| BUG-10 | Medium (no plain-text) | FIXED | htmlToPlainText() in both functions |
| BUG-11 | Low (no retry) | OPEN | No retry mechanism |
| BUG-12 | Medium (.env.example) | FIXED | .env.example now includes SMTP vars |
| BUG-13 | Low (no locale in links) | FIXED | renderTemplate replaces SiteURL with APP_URL/locale (line 717) |
| BUG-14 | Medium (resend abuse) | OPEN | Still accepts arbitrary email from URL param |
| BUG-15 | Medium (PII in logs) | FIXED | SHA-256 hash in v23 |
| BUG-16 | High (/settings 404) | FIXED | Auth confirm now redirects to /account (line 57) |
| BUG-17 | Low (silent SMTP fail) | FIXED | Explicit throw on missing SMTP vars (line 789-792) |

### New Bugs Found

#### BUG-18 (LOW): send-auth-email allows unsigned requests when hook secret is missing
- **Severity:** Low (defense-in-depth)
- **Steps to Reproduce:**
  1. If SEND_EMAIL_HOOK_SECRET env var is not set on the Edge Function
  2. The function falls through to `JSON.parse(rawPayload)` without signature verification (lines 848-850)
  3. Any POST request can trigger email sending
- **Mitigation:** Production has the secret set; deployment scripts enforce it
- **Priority:** Nice to have -- consider fail-closed behavior

#### REGRESSION-1 (HIGH -- unrelated to PROJ-13): Build failure in athletes/queries.ts
- **Severity:** High
- **Steps to Reproduce:**
  1. Run `npm run build`
  2. TypeScript error: Property 'connectionType' missing in type at `src/lib/athletes/queries.ts:87`
  3. Build fails with exit code 1
- **Note:** This is NOT a PROJ-13 bug. It is a regression in PROJ-5 (Athleten-Management) or PROJ-17 (Athleten-Verbindung). The missing `connectionType` property suggests a schema change that was not propagated to the query function.
- **Priority:** Fix immediately -- blocks ALL production deployments

---

### Responsive Testing (Templates)

- [x] 375px (Mobile): Email templates use width="560" fixed table. Mobile email clients override to full width. Acceptable.
- [x] 768px (Tablet): Templates render well at this width.
- [x] 1440px (Desktop): Templates render well, centered.

### Cross-Browser (Auth Pages)

- [x] Chrome: Auth pages use standard React/shadcn components. Functional.
- [x] Firefox: Same standard components. Functional.
- [x] Safari: Same standard components. Functional.
- Note: Full manual browser testing was not performed in this QA run.

---

### Regression Testing

- [ ] FAIL: Production build fails due to type error in `src/lib/athletes/queries.ts` (REGRESSION-1)
- [x] PROJ-4 (Authentication): Auth pages, confirm/callback routes verified in source code
- [x] PROJ-5 (Athleten-Management): Invitation email Edge Function (v15) operational
- [x] PROJ-11 (DSGVO): GDPR API routes present, DSGVO-compliant email logging confirmed
- [x] PROJ-9 (Team-Verwaltung): No email-related regressions

---

### Summary

- **Automated Tests:** 176/176 PASSING (5 test files)
- **Deployment Safeguards:** 3 scripts + 1 rules file -- all properly enforce safety checks
- **7 Spam Bugs:** ALL covered by automated tests (BUG 1-7)
- **Edge Function Code:** Matches documented v23/v15 behavior, all security controls verified
- **Previously Reported Bugs:** 12 of 17 FIXED/RESOLVED, 5 remaining (1 medium, 2 low, 2 not-implemented)
- **New Bugs:** 1 new (BUG-18, LOW) + 1 regression (REGRESSION-1, HIGH -- unrelated to PROJ-13)
- **Acceptance Criteria:** 16/26 passed (up from 10/26 -- AC-4 now passing, DNS verified, infrastructure complete)
  - 5 ACs still NOT IMPLEMENTED (acceptance/rejection emails, disconnection emails, export emails, deletion emails, trainer-leaving emails)
  - 1 AC partially open (BUG-8: no old-email notification on email change)

**Production Ready (for deployed scope):** CONDITIONAL YES

The deployed email infrastructure (auth emails + athlete invitations + DNS deliverability) is production-ready. All 7 spam bugs are fixed and covered by 176 automated tests. The remaining unimplemented ACs (AC-5 through AC-9) are Phase 2 features that were never scheduled for the current deployment.

**Blocking issue for ANY deployment:** REGRESSION-1 (build failure in athletes/queries.ts) must be fixed first.

**Remaining open items (non-blocking for email feature):**
1. BUG-8 (MEDIUM): Add notification email to old address on email change
2. BUG-14 (MEDIUM): Validate email param on verify-email page against session
3. BUG-11 (LOW): Add email retry mechanism
4. BUG-18 (LOW): Fail-closed when hook secret is missing

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
