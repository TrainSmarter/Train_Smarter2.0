# PROJ-4: Authentication & Onboarding

## Status: In Progress
**Created:** 2026-03-12
**Last Updated:** 2026-03-13 (Expert Review — Security, Backend, Frontend, QA)

## Role Architecture Decision (Phase 1 — implemented in PROJ-3)
> **IMPORTANT:** This spec governs how role data is stored and managed. The following decisions were made before implementation to ensure future-proofness:

### UserRole = "ATHLETE" | "TRAINER" — No ADMIN type
- `UserRole` contains only `"ATHLETE"` and `"TRAINER"`
- There is **no** `"ADMIN"` UserRole. Platform admins are TRAINER (or ATHLETE) accounts with an additional flag.

### Role Storage: `app_metadata` (server-controlled)
- `app_metadata.roles: UserRole[]` — gespeichert als **Array** (z.B. `["TRAINER"]`) für spätere Dual-Role-Unterstützung (PROJ-11+), gesetzt via Supabase Edge Function, **nicht** editierbar vom Client
- `app_metadata.is_platform_admin: boolean` — gewährt Zugang zum `/admin`-Bereich; wird **ausschließlich manuell** gesetzt via Supabase SQL: `UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"is_platform_admin": true}' WHERE id = '...'`
- `user_metadata` enthält nur Display-Daten: `first_name`, `last_name`, `avatar_url`

> **Warum Array statt Scalar?** Ein `role: "TRAINER"` String erfordert bei der Dual-Role-Migration eine Type-Änderung + Update aller RLS-Policies. Ein `roles: ["TRAINER"]` Array macht die spätere Migration zu einem reinen Array-Append ohne Breaking Changes.

### Why `app_metadata` instead of `user_metadata`?
- `user_metadata` in Supabase Auth is writable by the authenticated user via `supabase.auth.updateUser()`
- `app_metadata` can only be written via the Supabase service-role key (server-side only)
- Storing roles in `user_metadata` would allow any user to escalate their own privileges — a critical security vulnerability

### Onboarding Role Selection
- Step 3 of Onboarding: User wählt "Ich bin Trainer" oder "Ich bin Athlet"
- Dies triggert einen Next.js Route Handler → Supabase Edge Function, die `app_metadata.roles` via service-role key setzt
- Der Route Handler **verifiziert**, dass (a) der Caller der eigene User ist, (b) noch kein Role-Eintrag existiert (Idempotenz), (c) ein gültiger `user_consents`-Eintrag in der DB vorhanden ist (Consent als Voraussetzung)
- `is_platform_admin` defaultet auf `false` und wird **nur manuell** per SQL gesetzt (kein UI-Weg)
- **MFA für `is_platform_admin`-Accounts:** Platform-Admins sollten MFA (TOTP via Supabase Auth MFA) erzwingen; ohne MFA hat ein kompromittierter Admin-Account sofortigen vollen Zugriff → Wird in **PROJ-10 (Admin-Bereich)** implementiert (prüfe `aal` Claim im JWT: `aal2` = MFA bestätigt, `aal1` = nur Passwort)
- **Club Admin (PROJ-9):** `is_platform_admin` ist plattform-weit, NICHT club-scoped. Ein Club-Administrator (PROJ-9) braucht einen separaten Mechanismus (eigene DB-Tabelle oder `app_metadata.club_admin_of: uuid[]`). Architektur-Entscheidung für Club-Level-Admin wird in PROJ-9 getroffen — dieser Flag ist bewusst NUR für Platform-Admins.

## Dependencies
- Requires: PROJ-1 (Design System Foundation)
- Requires: PROJ-2 (UI Component Library) — Button, Input, Alert, Card
- Requires: PROJ-3 (App Shell & Navigation) — Layout-Infrastruktur (`(protected)` Route Group, AppSidebar, `mock-session.ts` Shape); BUG-6 + BUG-7 aus PROJ-3 QA werden hier implementiert
- References: PROJ-11 (DSGVO) — `user_consents`-Tabellenschema; PROJ-4 implementiert den Wizard-Step, PROJ-11 ist Quelle der Wahrheit für das Datenmodell
- References: PROJ-13 (E-Mail) — Verifikations- und Passwort-Reset-E-Mails werden zunächst mit Supabase-Standard-Templates geliefert; PROJ-13 ersetzt diese mit gebrandeten Templates

## Übersicht
Komplettes Authentifizierungssystem mit Supabase Auth: Registrierung, Login, Passwort-Reset und E-Mail-Verifizierung. Nach der ersten Anmeldung durchlaufen neue Benutzer einen einfachen Onboarding-Wizard (Profil-Setup + Rollenauswahl). In Figma werden alle Auth-Screens und der Onboarding-Flow dokumentiert.

## User Stories
- Als neuer Benutzer möchte ich mich mit E-Mail + Passwort registrieren, damit ich einen Account anlegen kann
- Als registrierter Benutzer möchte ich mich einloggen und eingeloggt bleiben, damit ich nicht jedes Mal neu eingeben muss
- Als Benutzer der sein Passwort vergessen hat möchte ich eine Reset-E-Mail bekommen, damit ich wieder Zugang erhalte
- Als neuer Benutzer möchte ich nach der Registrierung durch ein kurzes Onboarding geleitet werden, damit ich sofort mit dem Wichtigsten starte
- Als eingeladener Athlet möchte ich mich über den Einladungslink direkt registrieren, damit ich automatisch mit meinem Trainer verknüpft werde

## Acceptance Criteria

### Figma Screens
- [ ] Figma Screen: Login-Seite (Desktop + Mobile, inkl. Fehlerzustand)
- [ ] Figma Screen: Registrierungs-Seite (Desktop + Mobile)
- [ ] Figma Screen: Passwort vergessen (Desktop + Mobile)
- [ ] Figma Screen: Passwort zurücksetzen — Schritt 2 (neues Passwort, Desktop + Mobile)
- [ ] Figma Screen: E-Mail-Bestätigung ausstehend (Info-Screen inkl. Ablauf-Fehlerzustand)
- [ ] Figma Screen: Onboarding Step 1 — DSGVO-Einwilligungen
- [ ] Figma Screen: Onboarding Step 2 — Profilbild + Name + Geburtsdatum
- [ ] Figma Screen: Onboarding Step 3 — Rolle wählen (Trainer / Athlet)
- [ ] Figma Screen: Onboarding Step 4 Trainer — Ersten Athleten einladen
- [ ] Figma Screen: Onboarding Step 4 Athlet — Trainer-Einladungscode eingeben
- [ ] Figma Screen: Onboarding — Skeleton/Loading-Zustand während initialer Profil-Ladung
- [ ] Figma Screen: Passwort zurücksetzen — Loading-Zustand während PKCE-Token-Verarbeitung (Spinner vor Formular)

### Login
- [ ] Felder: E-Mail, Passwort (toggle Sichtbarkeit via `PasswordField`-Komponente)
- [ ] Supabase `signInWithPassword` Aufruf
- [ ] Fehler "Invalid credentials" zeigt Alert (keine Unterscheidung ob E-Mail oder Passwort falsch → Sicherheit)
- [ ] Supabase-Fehlercode `email_not_confirmed` → Redirect zu `/verify-email` (E-Mail vorausgefüllt)
- [ ] "Eingeloggt bleiben" Checkbox (Session-Dauer: 30 Tage — erfordert Supabase Dashboard-Konfiguration)
- [ ] Link zu "Passwort vergessen"
- [ ] Link zu "Registrieren"
- [ ] "Eingeloggt bleiben" NICHT angehakt → Session endet nach Browser-Schließen (Supabase-Standard: kein persistenter Refresh-Token)
- [ ] Nach Login: Redirect zu `/dashboard` (oder `returnUrl` wenn vorhanden)
- [ ] `returnUrl` Validierung: nur gleich-ursprüngliche relative Pfade erlaubt (Starts with `/`, kein `://`) — Open Redirect Prevention
- [ ] `returnUrl` wird durch die gesamte Redirect-Kette erhalten: Login → ggf. verify-email → ggf. onboarding → Zielseite (kein Verlust bei Zwischen-Redirects)
- [ ] Bereits eingeloggter User der `/login` aufruft → Redirect zu `/dashboard`

### Registrierung
- [ ] Felder: Vorname, Nachname, E-Mail, Passwort, Passwort bestätigen (mit `PasswordField`-Komponente)
- [ ] Passwort-Anforderungen: Min. 8 Zeichen, 1 Großbuchstabe, 1 Zahl
- [ ] Client-seitige Validierung mit Zod vor dem API-Aufruf
- [ ] Supabase `signUp` Aufruf mit `emailRedirectTo: NEXT_PUBLIC_SITE_URL + '/auth/callback'`
- [ ] Nach Registrierung: Weiterleitung zu "E-Mail bestätigen" Screen
- [ ] Einladungslink: `inviteToken` aus URL-Parameter wird in einem **httpOnly Cookie** (via Route Handler) gespeichert — nicht in `sessionStorage`/`localStorage`, damit er die E-Mail-Verifizierungs-Weiterleitung überlebt (auch auf anderem Gerät)
- [ ] Eingeladener Athlet: Rolle in Step 3 ist auf ATHLETE vorgewählt (TRAINER-Option ausgegraut)

### Passwort Reset
- [ ] Schritt 1: E-Mail-Adresse eingeben → Supabase `resetPasswordForEmail` mit `redirectTo: NEXT_PUBLIC_SITE_URL + '/auth/callback?type=recovery'`
- [ ] Bestätigungs-Screen: "Wenn diese E-Mail existiert, erhältst du einen Link" (Account-Enumeration verhindert)
- [ ] Schritt 2 (`/reset-password`): **Client Component** — zeigt Lade-Spinner während `exchangeCodeForSession()` läuft; zeigt erst danach das Passwort-Formular; bei Exchange-Fehler sofortige Fehlermeldung
- [ ] Schritt 2: Neues Passwort + Bestätigen → Supabase `updateUser`
- [ ] Nach Reset: Alle anderen aktiven Sessions werden via `signOut({ scope: 'others' })` invalidiert
- [ ] Nach Reset: Redirect zu `/login` mit Erfolgs-Alert
- [ ] Fehlercode `otp_expired` (abgelaufener Link) → klare Fehlermeldung mit "Neuen Link anfordern" CTA

### E-Mail-Verifizierung
- [ ] Unbestätigter User: Info-Screen mit Anweisung + "Erneut senden" Button (Rate-limited: 60s Cooldown, serverseitig via Supabase + clientseitiger Countdown-Timer)
- [ ] `/verify-email` Page: `onAuthStateChange`-Listener erkennt `SIGNED_IN`-Event mit verifizierten E-Mail → automatischer Redirect zu `/onboarding` (kein Page-Reload nötig)
- [ ] `/auth/callback` Route Handler: verarbeitet den PKCE-Code bei Klick auf Bestätigungs-Link, handled `?error=...` Params (z.B. abgelaufener Token) mit "Neuen Link anfordern" CTA
- [ ] Alle geschützten Routen prüfen Verifizierungsstatus via `getUser()` in Middleware (nicht `getSession()` — Sicherheitsregel)

### BUG-6 & BUG-7 (aus PROJ-3 QA — hier implementiert)
> Diese Bugs wurden in PROJ-3 QA gefunden und bewusst auf PROJ-4 verschoben, da sie echter Auth-Infrastruktur bedürfen.

- [ ] **BUG-6 (E-Mail-Verifizierungsprüfung in Middleware):** `(protected)/layout.tsx` prüft aktuell nicht ob die E-Mail des eingeloggten Users verifiziert ist. Implementierung: Middleware ruft `getUser()` auf — wenn `user.email_confirmed_at === null` → Redirect zu `/verify-email?email={user.email}`. Unverified Users dürfen niemals in den `(protected)`-Bereich gelangen.
- [ ] **BUG-7 (Kein Loading-State während Session-Check):** `(protected)/layout.tsx` lädt aktuell ohne jeglichen Loading-State sofort den vollen App-Shell. Bei echtem Supabase-Auth gibt es eine kurze Latenz während `getUser()` den JWT validiert. Implementierung: Suspense-Boundary mit `<SkeletonCard>`-Fallback in `(protected)/layout.tsx` bis Session-Prüfung abgeschlossen.

### Onboarding Wizard
- [ ] Wird nur angezeigt wenn `profile.onboarding_completed = false`
- [ ] Wizard rendert in **eigenem Layout ohne AppSidebar** (nested Route Group `(protected)/(onboarding)/`)
- [ ] Bei Wizard-Einstieg: `profiles.onboarding_step` aus DB lesen → Wizard beginnt beim zuletzt gespeicherten Schritt (Resumption)
- [ ] **Step 1 — DSGVO-Einwilligungen** (Pflicht, nicht überspringbar):
  - Pflicht-Checkbox: „Ich akzeptiere die AGB und Datenschutzerklärung" (Links öffnen in neuem Tab, kein Pre-Check)
  - Opt-in: „Ich erlaube die Verarbeitung meiner Körperdaten" — standardmäßig **nicht** angehakt
  - Opt-in: „Ich erlaube die Verarbeitung meines Ernährungstagebuchs" — standardmäßig **nicht** angehakt
  - Ohne Pflicht-Checkbox: „Weiter"-Button deaktiviert
  - Einwilligungen werden per **Upsert** in `user_consents`-Tabelle gespeichert (Schema → PROJ-11, normalized: eine Zeile pro Consent-Typ mit `policy_version`)
  - Nach Step 1: `profiles.onboarding_step = 2` gesetzt
- [ ] Step 2: Name (vorausgefüllt aus Registrierung), Geburtsdatum, Profilbild (optional, Upload mit Preview + Fortschrittsanzeige)
  - Avatar: kreisförmige Vorschau sofort nach Dateiauswahl (via `URL.createObjectURL`)
  - Upload: Fortschrittsanzeige während Supabase Storage Upload
  - Nach Step 2: `profiles.onboarding_step = 3` gesetzt
- [ ] Step 3: Rollenauswahl — "Ich bin Trainer" oder "Ich bin Athlet" (als `RoleSelectCard`-Komponente)
  - Eingeladene Athleten: ATHLETE vorgewählt, TRAINER-Option nicht wählbar
  - Nach Step 3: Edge Function setzt `app_metadata.roles`, danach `profiles.onboarding_step = 4`
  - Bei Edge Function Fehler: Fehlermeldung mit Retry-Button — User bleibt auf Step 3
- [ ] Step 4 (Trainer): Optionale Einladung eines ersten Athleten per E-Mail
- [ ] Step 4 (Athlet): Optionaler Trainer-Einladungscode eingeben; falls `inviteToken`-Cookie vorhanden → automatisch vorausgefüllt
- [ ] „Überspringen" ab Step 2 möglich — **nur bis Step 3**: Step 3 (Rollenauswahl) ist **nicht** überspringbar (User ohne Rolle = invalider Zustand)
- [ ] Nach Abschluss: `profiles.onboarding_completed = true` + `profiles.onboarding_step = 4`, Redirect zu `/dashboard`
- [ ] Rollenauswahl ist **dauerhaft** — kein UI zum Rollenwechsel nach Onboarding (v1 Scope-Entscheidung; Rollenwechsel-Funktion erst in PROJ-11+)

> **Experten-Entscheidung:** Consent-Step gehört in PROJ-4 (Onboarding-UI), nicht nur in PROJ-11. Begründung: Ein Entwickler der PROJ-4 implementiert, muss alle Wizard-Steps kennen — inkl. Consent. PROJ-11 bleibt die Quelle der Wahrheit für das Datenmodell (`user_consents`-Tabelle) und die Datenschutz-Einstellungsseite. PROJ-4 implementiert den Wizard-Step, referenziert PROJ-11 für die Speicherlogik.

## Edge Cases

### Auth Flows
- E-Mail bereits registriert bei Registrierung → Response sieht identisch aus wie Erfolg (kein Hinweis ob Account existiert)
- Einladungstoken ungültig/abgelaufen → Fehlermeldung + Option sich normal zu registrieren (ohne Trainer-Verknüpfung)
- Supabase Auth nicht erreichbar (Netzwerkfehler) → `AuthErrorBoundary` zeigt "Service vorübergehend nicht verfügbar" mit Retry
- Login mit nicht-verifizierten Account → Redirect zu `/verify-email` (nicht "Invalid credentials")
- `over_email_send_rate_limit`-Fehler bei Resend → Countdown-Timer zeigt Restzeit, kein generischer Fehler
- E-Mail-Verifikationslink abgelaufen → `/auth/callback?error=...` zeigt "Link abgelaufen" + "Neuen Link anfordern"
- Password-Reset-Link abgelaufen → Fehlercode `otp_expired` → Fehlermeldung mit Link zu `/forgot-password`

### Onboarding-Zustand
- Edge Function für Rollen-Setzung schlägt fehl → User bleibt auf Step 3, sieht Fehlermeldung + Retry-Button; kein invalider Limbo-Zustand
- Wizard-Wiederbetreten nach Browser-Schließen → `profiles.onboarding_step` bestimmt den Einstiegspunkt (Step 1–4)
- Step 1 Consent bereits gespeichert + Wizard neu geöffnet → Upsert-Operation (kein Duplicate-Key-Fehler)
- „Überspringen" auf Step 2 oder Step 3 → Step 3 (Rollenauswahl) DARF NICHT übersprungen werden; Skip setzt `onboarding_completed = true` erst NACH Step 3
- Multi-Device: Onboarding auf Gerät A abgeschlossen → Gerät B mit offener Wizard-Session wird bei nächstem Request-Redirect zu `/dashboard` weitergeleitet

### Profilbild
- Upload > 5MB → Client-seitige Größenprüfung blockiert Upload mit Fehlermeldung
- Upload mit ungültigem Dateityp (z.B. `.gif`, `.php`) → Client-seitige Typprüfung + serverseitige Magic-Byte-Validierung
- Zweites Avatar-Upload überschreibt das erste (gleicher Pfad `avatars/{user_id}/avatar.{ext}`); Datei mit alter Extension wird gelöscht
- Supabase Storage nicht erreichbar → Wizard setzt Step 2 ohne Avatar fort (Upload ist optional)

### Eingeladener Athlet
- `inviteToken`-Cookie ist bei E-Mail-Verifizierung auf anderem Gerät nicht vorhanden → Wizard lädt ohne Vorausfüllung; Athlet kann Code manuell in Step 4 eingeben
- `inviteToken` ist gültig aber der einladende Trainer hat seinen Account gelöscht → Token-Consumption schlägt fehl mit "Einladung nicht mehr gültig"

### Account-Verwaltung
- E-Mail-Adresse ändern nach Verifizierung → Out of Scope für PROJ-4; wird in PROJ-11 (Account-Einstellungen) behandelt
- Passwort ändern nach Login → Out of Scope für PROJ-4; wird in PROJ-11 (Account-Einstellungen) behandelt

## Technical Requirements

### Security
- Passwörter werden ausschließlich über Supabase Auth gehandhabt (kein eigenes Hashing)
- CSRF-Schutz durch Supabase JWT-Tokens
- **Middleware: `getUser()` statt `getSession()`** — `getUser()` validiert die Session gegen Supabase Auth server-seitig; `getSession()` liest nur den Cookie ohne Server-Validierung (Sicherheitslücke bei revozierten Sessions)
- PKCE-Flow (Proof Key for Code Exchange): Supabase `@supabase/ssr` verwendet PKCE by default; Passwort-Reset-Link und E-Mail-Verifikations-Link liefern einen `?code=`-Parameter der via `exchangeCodeForSession()` getauscht werden muss — **nicht** den alten Implicit-Flow (token im URL-Hash)
- Einladungstoken (`inviteToken`): mind. 128 Bit kryptographische Zufälligkeit (UUID v4), 7-Tage TTL, Single-Use (sofortige Invalidierung nach Verbrauch), identische Fehler-Response bei ungültigem vs. abgelaufenem Token (Account-Enumeration verhindert)
- Profilbild: Server-seitige Magic-Byte-Validierung vor Storage-Upload (kein reines Client-MIME-Check); `image/svg+xml` explizit auf Bucket-Ebene blockiert (XSS-Vektorschwachstelle); Allowed types: `image/jpeg`, `image/png`, `image/webp` only
- `/api/auth/set-role` Route Handler: (a) Session-User muss mit Target-User übereinstimmen, (b) Idempotent: 200 wenn Rolle identisch bereits gesetzt, (c) Blockiert Rollen-Wechsel nachträglich (409 wenn bereits eine andere Rolle gesetzt), (d) Verifiziert Consent-Existenz in `user_consents` bevor Rolle gesetzt wird
- Rate-Limiting auf benutzerdefinierten Route Handlers (`/api/auth/set-role`): via Upstash Rate Limit oder Vercel Edge Rate Limiting
- Vorname, Nachname und alle Freitext-Felder im Onboarding werden server-seitig HTML-escaped
- `user_metadata` (first_name, last_name): nur Buchstaben (inkl. Umlaute + internationale Zeichen wie Ó, Ñ, Ü), Leerzeichen, Bindestriche, max. 100 Zeichen — Zod-Regex-Validierung
- `(auth)/layout.tsx`: `Referrer-Policy: no-referrer` Header gesetzt — verhindert Token-Leak in Referrer-Header an Drittanbieter

### Accessibility (WCAG AA — PRD Erfolgsmetrik)
- Formular-Fehlermeldungen auf Feld-Ebene: `aria-invalid`, `aria-describedby` (verknüpft mit Fehlertext) — bereits in `FormField` implementiert ✅
- Formular-Fehlermeldungen auf Form-Ebene (z.B. "Invalid credentials" Alert): `role="alert"` oder in einem `aria-live="polite"`-Container, damit Screen Reader die Meldung vorlesen
- Multi-Step-Wizard: Fokus-Management bei Step-Wechsel (Fokus auf ersten Eingabefeld des neuen Steps setzen)
- `WizardProgressBar`: `aria-label` + aktiver Step via `aria-current="step"`
- `ConsentCheckbox` Links zu AGB/DSE: `target="_blank"` mit `aria-label` das den neuen-Tab-Hinweis enthält

### Validation
- Zod-Schemas für alle Formulare, serverseitige Validierung via Next.js Route Handlers
- Supabase Error Codes müssen vollständig gemappt sein: `email_not_confirmed`, `over_email_send_rate_limit`, `weak_password`, `user_already_exists` (→ identischer Screen wie normaler Signup), `otp_expired`, `invalid_grant`

### Performance
- Auth-Check in Middleware via `@supabase/ssr` `updateSession()` (Token-Refresh + Cookie-Write)
- `onboarding_completed` wird nach Abschluss als Cookie-Claim gesetzt → Middleware liest Claim aus Cookie statt DB-Abfrage bei jedem Request

### Supabase Dashboard-Konfiguration (einmalig, vor Go-Live)
- Auth > URL Configuration: `Site URL` + `Redirect URLs` auf Production-Domain + `localhost:3000` setzen
- Auth > Email Templates: Standard-Templates zunächst aktiv; werden durch PROJ-13 ersetzt
- Auth > JWT expiry: 2592000 Sekunden (30 Tage) für "Eingeloggt bleiben"-Funktion
- Auth > Refresh Token expiry: ≥ 30 Tage
- Auth > Security: "Confirm email" aktiviert

### Umgebungsvariablen (vollständig, `.env.local.example`)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase Anon Key (öffentlich, client-safe)
- `SUPABASE_SERVICE_ROLE_KEY` — **Server-only**, nie im Client-Bundle
- `NEXT_PUBLIC_SITE_URL` — Basis-URL für E-Mail-Redirect-Links (`http://localhost:3000` in Dev)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

**Designed:** 2026-03-13

### A) Component Structure

```
src/app/[locale]/
│
├── (auth)/                             ← Unauthenticated-only layout (no sidebar)
│   ├── login/page.tsx                  — Login form
│   ├── register/page.tsx               — Registration form
│   ├── forgot-password/page.tsx        — Password reset request
│   ├── reset-password/page.tsx         — New password (via email link)
│   └── verify-email/page.tsx           — "Check your inbox" info screen
│
└── (protected)/
    ├── (onboarding)/                   ← Eigenes Layout OHNE AppSidebar (volle Bildschirmbreite, zentriert)
    │   └── onboarding/page.tsx         — Multi-step Wizard (client component)
    │       ├── OnboardingWizard        ← Orchestriert Schritte + liest onboarding_step aus DB
    │       │   ├── WizardProgressBar   — Schritt-Indikator (1 von 4, mit Labels)
    │       │   ├── Step1Consents       — DSGVO Checkboxen (required, nicht überspringbar)
    │       │   ├── Step2Profile        — Name (vorausgefüllt), Geburtsdatum, Avatar Upload
    │       │   ├── Step3RoleSelect     — RoleSelectCard: Trainer / Athlet
    │       │   ├── Step4Trainer        — Optional: Ersten Athleten einladen
    │       │   └── Step4Athlete        — Optional: Einladungscode (aus Cookie vorausgefüllt)
    │       └── [Reuses: FormField, Modal, Button, Input, Avatar aus PROJ-2]
    └── ... (andere protected routes mit AppSidebar)

src/app/[locale]/auth/callback/
    └── route.ts                        — PKCE Code Exchange + Error Handling für alle Auth-Callbacks

src/middleware.ts                       — Composed: Supabase updateSession() + next-intl (in dieser Reihenfolge)
src/lib/supabase/
    ├── client.ts                       — Browser-side Supabase client (createBrowserClient)
    ├── server.ts                       — Server-side Supabase client (createServerClient + cookies)
    └── middleware.ts                   — updateSession() Helper für Middleware

src/app/api/auth/
    └── set-role/route.ts               — Route Handler: Session-check + Authorization + Edge Function call

Supabase Edge Function:
    └── set-user-role                   — Setzt app_metadata.roles[] via service-role key (idempotent, mit Consent-Check)
```

### B) Data Model

**Supabase Auth (built-in, managed by Supabase):**
```
auth.users
├── id: uuid (primary key)
├── email: text
├── email_confirmed_at: timestamp | null    ← E-Mail-Verifikationsstatus
├── app_metadata.roles: string[]            ← Array! z.B. ["TRAINER"] — nur via Edge Function schreibbar
│                                              Future-proof für Dual-Role (PROJ-11+): einfaches Array-Append
└── app_metadata.is_platform_admin: boolean ← Nur via SQL manuell gesetzt, default false
```

**profiles table** (in PROJ-4 erstellt; AUTO-CREATE via Datenbank-Trigger bei auth.users INSERT):
```
profiles
├── id: uuid (PK, FK → auth.users, 1:1)
├── first_name: text NOT NULL DEFAULT ''    ← aus raw_user_meta_data bei Trigger-Erstellung
├── last_name: text NOT NULL DEFAULT ''
├── avatar_url: text | null                 ← Pfad in Supabase Storage (NICHT die vollständige URL)
├── birth_date: date | null
├── onboarding_completed: boolean DEFAULT false
├── onboarding_step: integer DEFAULT 1      ← Wizard-Resumption: zuletzt gespeicherter Schritt
├── created_at: timestamptz DEFAULT now()
└── updated_at: timestamptz                 ← Auto-Update via DB-Trigger
```

> **Soft Delete vs. Cascade Delete:** Profiles verwenden `ON DELETE CASCADE` (beim Löschen des auth.users wird das Profil sofort gelöscht). Das konfliktiert mit PROJ-11's 30-Tage-Pseudonymisierungs-Anforderung. Lösung: PROJ-11 implementiert eine Soft-Delete-Funktion die `auth.users` **nicht** direkt löscht, sondern pseudonymisiert. Der Cascade bleibt als Notfall-Mechanismus bestehen.

**user_consents table** (Schema-Definition → PROJ-11; PROJ-4 inseriert die initialen Consent-Zeilen):
```
user_consents (normalized, append-only — eine Zeile pro Consent-Ereignis)
├── id: uuid (PK)
├── user_id: uuid (FK → auth.users)
├── consent_type: "terms_privacy" | "body_wellness_data" | "nutrition_data"
├── granted: boolean
├── granted_at: timestamptz DEFAULT now()
├── policy_version: text NOT NULL           ← z.B. "v1.0" — für DSGVO Audit-Trail
└── UNIQUE (user_id, consent_type, policy_version)   ← Upsert-safe
```

> **Schema-Konflikt behoben:** Die frühere Darstellung (flat boolean columns) entsprach NICHT dem PROJ-11-Schema. PROJ-4 muss das normalisierte PROJ-11-Schema verwenden — sonst ist eine destruktive Migration nötig wenn PROJ-11 implementiert wird.

**Supabase Storage Bucket: `avatars`** (privat, kein public access):
```
avatars/{user_id}/avatar.{jpg|png|webp}
├── Max size: 5 MB (client-side Prüfung VOR Upload)
├── Accepted types: JPEG, PNG, WebP — SVG explizit blockiert (XSS-Vektor)
├── Server-side resize: 400×400px (via Supabase Image Transform URL-Parameter)
├── Bei neuem Upload: alte Datei (ggf. andere Extension) wird gelöscht
└── RLS Policies:
    ├── INSERT/UPDATE/DELETE: storage.foldername(name)[1] = auth.uid() (nur eigener Ordner)
    ├── SELECT: eigener Ordner ODER verbundener Trainer (TODO: in PROJ-5-Migration ergänzen)
    └── SVG content-type in Bucket-Konfiguration explizit blockiert
```

### C) Middleware Route Guard Logic

The `middleware.ts` edge function intercepts every request and applies these rules in order:

| Condition | Redirect To |
|-----------|-------------|
| No session + protected route | `/login` |
| Session + email not verified | `/verify-email` |
| Session + `onboarding_completed = false` | `/onboarding` |
| Session + visiting `/login` or `/register` | `/dashboard` |
| All good | Continue to requested page |

This means **no auth state can leak** to protected pages, and **no infinite redirects** are possible — the `/onboarding` and `/verify-email` routes are excluded from the onboarding/verification guards respectively.

### D) Role-Setting Flow (Security Critical)

```
Browser                Next.js API Route         Supabase Edge Function
  │                         │                            │
  │── POST /api/auth/set-role ──▶                        │
  │   { role: "TRAINER" }   │                            │
  │                         │── invoke Edge Function ──▶ │
  │                         │                            │── adminUpdateUserById()
  │                         │                            │   (service-role key)
  │                         │◀── { success: true } ──── │
  │◀── 200 OK ──────────── │                            │
  │                         │

The service-role key NEVER leaves the server environment.
The browser only knows the call succeeded or failed.
```

### E) Tech Decisions

| Decision | Gewählter Ansatz | Warum |
|----------|-----------------|-------|
| Auth-Provider | Supabase Auth | Password Hashing, E-Mail-Verifikation, Rate Limiting und JWT Rotation eingebaut |
| Session-Validierung in Middleware | `getUser()` (nicht `getSession()`) | `getUser()` validiert server-seitig gegen Supabase Auth. `getSession()` liest nur den Cookie — revozierte Sessions würden die Guard-Prüfung bestehen |
| Route-Schutz | Next.js `middleware.ts` (edge) | Läuft vor dem Page-Render — kein Flash für unauthentifizierte User; zuverlässiger als client-seitige Guards |
| Rollen-Speicherung | `app_metadata.roles[]` (Array) via Edge Function | `user_metadata` ist vom Client schreibbar (Privilege Escalation). Array statt String für Dual-Role-Zukunftssicherheit |
| Session-Management | `@supabase/ssr` (Cookie-basiert) | Standard-Package für Next.js App Router; funktioniert in Middleware + Server Components + Route Handlers |
| Middleware-Komposition | Supabase `updateSession()` → next-intl (in dieser Reihenfolge) | Supabase muss zuerst den Request modifizieren (Token-Refresh + Cookie-Write), dann übergabe an next-intl |
| PKCE-Flow | Supabase `@supabase/ssr` Default | Alle Auth-Callbacks liefern `?code=` (nicht URL-Hash); Code wird via `exchangeCodeForSession()` getauscht; kein Token im Browser-History |
| Onboarding-Zustand | `profiles.onboarding_completed` + `profiles.onboarding_step` in DB | Überlebt Browser-Schließen und Gerätewechsel. Client-seitiges `user_metadata` wäre bypassbar |
| Wizard-Resumption | `onboarding_step` Integer in `profiles` | Einfache Integer-Vergleiche in Wizard; kein separates State-Tracking nötig |
| Consent-Speicherung | `user_consents` (normalized, append-only) via PROJ-11-Schema | Separates DSGVO Audit-Trail; `policy_version`-Feld ermöglicht Re-Consent wenn AGB/DSE aktualisiert |
| Avatar-Resize | Supabase Image Transform | Serverless, kein Lambda nötig; 400×400px on-the-fly via URL-Parameter |
| Avatar-Pfad | `{user_id}/avatar.{ext}` (fixer Pfad pro Extension) | Bei neuem Upload wird alter Extension-Variant gelöscht; Storage-Hygiene |
| OAuth / Social Login | **Nicht in v1** — kein Google/Apple Login | PRD Non-Goal für v2.0. **Architektonischer Slot vorbereitet:** Supabase Auth unterstützt OAuth nativ (DB-Seite ready). App-seitig muss das Onboarding so gebaut werden, dass OAuth-Nutzer (die ggf. kein first_name/last_name haben) das Profil in Step 2 manuell ausfüllen können — leere Felder statt Fehler. Wenn OAuth später aktiviert wird, muss es zwingend den Onboarding-Wizard durchlaufen (DSGVO Step 1 ist für alle Nutzer Pflicht) |

### F) Neue Middleware-Regel: Consent-Versionsprüfung

Middleware-Tabelle erweitert um Consent-Version-Check:

| Bedingung | Redirect zu |
|-----------|-------------|
| Keine Session + geschützte Route | `/login` |
| Session + E-Mail nicht verifiziert | `/verify-email` |
| Session + `onboarding_completed = false` | `/onboarding` |
| Session + aktuelle `policy_version` nicht in `user_consents` | `/onboarding` (DSGVO Re-Consent) |
| Session + `/login` oder `/register` aufgerufen | `/dashboard` |
| Alles OK | Request weiterleiten |

### G) Dependencies to Install

| Package | Zweck | Status |
|---------|-------|--------|
| `@supabase/ssr` | Server-side Supabase client für Next.js App Router (Cookie-Sessions, Middleware-Helper) | **NICHT installiert — als erstes installieren** |
| `@supabase/supabase-js` | Supabase Client | Installiert |
| `react-hook-form` | Formular-State-Management | Installiert |
| `zod` | Schema-Validierung | Installiert |

### H) Neue Seiten und Routes

| Route | Typ | Auth-Zustand |
|-------|-----|-------------|
| `/[locale]/(auth)/login` | Client Form | Nur unauthentifiziert |
| `/[locale]/(auth)/register` | Client Form | Nur unauthentifiziert |
| `/[locale]/(auth)/forgot-password` | Client Form | Nur unauthentifiziert |
| `/[locale]/(auth)/reset-password` | **Client Component** (liest URL-Code) | Via E-Mail-Link |
| `/[locale]/(auth)/verify-email` | Client (onAuthStateChange Listener) | Authentifiziert, unverifiziert |
| `/[locale]/(protected)/(onboarding)/onboarding` | Client Wizard | Authentifiziert, Onboarding offen |
| `/[locale]/auth/callback` | Route Handler | Auth-Callback (PKCE Exchange) |
| `/api/auth/set-role` | Route Handler | Authentifiziert |

### I) Neue Komponenten (über PROJ-2 hinaus)

| Komponente | Zweck |
|-----------|-------|
| `PasswordField` | Passwort-Input mit klickbarem Eye-Icon Toggle (showPassword); Error-Icon und Toggle koexistieren |
| `AuthLayout` / `(auth)/layout.tsx` | Zentriertes Card-Layout für alle Auth-Seiten; App-Logo, Locale-Switcher |
| `OnboardingLayout` / `(onboarding)/layout.tsx` | Vollbild-Layout ohne AppSidebar für den Wizard |
| `WizardProgressBar` | Schritt-Indikator mit Nummern + Labels; Current/Completed/Upcoming-States |
| `AvatarUpload` | Kreisförmige Avatar-Auswahl mit Datei-Input, sofortiger Preview, Remove-Option, Upload-Fortschrittsring |
| `RoleSelectCard` | Große klickbare Card für Trainer/Athlet-Auswahl (Radio-Group-Semantik, Icon, Titel, Beschreibung) |
| `ConsentCheckbox` | Checkbox mit Inline-Links zu AGB/DSE (öffnet in neuem Tab); `required`-Flag blockiert Wizard-Fortschritt |
| `ResendEmailButton` | "Erneut senden" mit 60s Countdown (serverseitig rate-limited, clientseitiger Timer für UX) |
| `InviteCodeInput` | Eingabe für Trainer-Einladungscode (Formatierung, Inline-Validierung) |
| `AuthErrorBoundary` | Fallback-UI wenn Supabase nicht erreichbar (kein Blank-Screen) |

### J) Neue i18n-Namespaces

```
auth.login.*          — Login-Seite
auth.register.*       — Registrierungs-Seite
auth.forgotPassword.* — Passwort-vergessen-Seite
auth.resetPassword.*  — Passwort-zurücksetzen-Seite
auth.verifyEmail.*    — E-Mail-Bestätigung-Seite (inkl. Countdown, Fehler-States)
auth.callback.*       — Callback-Route Fehler-States
onboarding.step1.*    — DSGVO-Einwilligungen
onboarding.step2.*    — Profil-Daten
onboarding.step3.*    — Rollenauswahl
onboarding.step4.*    — Trainer-Einladung / Athlet-Code
onboarding.wizard.*   — Wizard-Shell (Progress-Bar, Skip, Back, Next, Fertig)
```

### K) Datenbank-Migrations-Checkliste (Supabase)

| # | Migration | Inhalt |
|---|-----------|--------|
| 001 | `create_profiles_table` | Tabelle mit allen Spalten inkl. `onboarding_step`, `created_at`, `updated_at` |
| 002 | `create_profiles_trigger` | `AFTER INSERT ON auth.users` — Auto-Create Profil aus `raw_user_meta_data` |
| 003 | `profiles_updated_at_trigger` | Auto-Update von `updated_at` bei jedem `UPDATE` |
| 004 | `profiles_rls` | RLS aktivieren; SELECT/UPDATE eigene Zeile; kein direktes INSERT (nur via Trigger) |
| 005 | `create_avatars_bucket` | Privater Bucket; RLS für READ/WRITE auf eigenen Ordner; TODO-Kommentar für PROJ-5-Trainer-Read-Policy |
| 006 | `create_user_consents_table` | Normalized Schema per PROJ-11; UNIQUE Constraint; RLS: user nur eigene Zeilen |
| 007 | `deploy_set_user_role_function` | Supabase Edge Function mit Authorization-Check + Idempotenz-Guard + Consent-Check |

## Frontend Implementation Notes (2026-03-13)

### Files Created
**Supabase Client Setup:**
- `src/lib/supabase/client.ts` — Browser-side Supabase client (createBrowserClient)
- `src/lib/supabase/server.ts` — Server-side Supabase client (createServerClient + cookies)
- `src/lib/supabase/middleware.ts` — updateSession() helper for middleware (getUser() for security)

**Middleware:**
- `src/middleware.ts` — Composed middleware: Supabase updateSession() + next-intl; auth guards per route table

**Validation:**
- `src/lib/validations/auth.ts` — Zod schemas for login, register, forgot-password, reset-password, profile

**Custom Components:**
- `src/components/password-field.tsx` — Password input with toggle visibility (Eye/EyeOff icon)
- `src/components/wizard-progress-bar.tsx` — Step indicator with numbers, labels, completion states
- `src/components/role-select-card.tsx` — Large clickable cards for TRAINER/ATHLETE selection (radio-group semantics)
- `src/components/consent-checkbox.tsx` — Checkbox with inline links, required flag
- `src/components/avatar-upload.tsx` — Circular avatar with file input, instant preview, remove, upload progress
- `src/components/resend-email-button.tsx` — "Resend" button with 60s client-side countdown

**Auth Pages (route group `(auth)`):**
- `src/app/[locale]/(auth)/layout.tsx` — Centered card layout, brand logo, no sidebar
- `src/app/[locale]/(auth)/login/page.tsx` — Login form with Supabase signInWithPassword
- `src/app/[locale]/(auth)/register/page.tsx` — Registration with name, email, password validation
- `src/app/[locale]/(auth)/forgot-password/page.tsx` — Email input, success screen (no account enumeration)
- `src/app/[locale]/(auth)/reset-password/page.tsx` — PKCE code exchange + new password form
- `src/app/[locale]/(auth)/verify-email/page.tsx` — Info screen with onAuthStateChange listener + resend

**Auth Callback:**
- `src/app/[locale]/auth/callback/route.ts` — PKCE code exchange + error handling for all auth callbacks

**Onboarding Wizard:**
- `src/app/[locale]/(protected)/(onboarding)/layout.tsx` — Full-width layout without AppSidebar
- `src/app/[locale]/(protected)/(onboarding)/onboarding/page.tsx` — 4-step wizard (Consents, Profile, Role, Invite)

**API Route:**
- `src/app/api/auth/set-role/route.ts` — Session check + admin client sets app_metadata.roles via service-role key

**i18n:**
- `src/messages/de.json` — Added `auth.*` and `onboarding.*` namespaces (German)
- `src/messages/en.json` — Added `auth.*` and `onboarding.*` namespaces (English)

### Existing Files Modified
- `src/middleware.ts` — Replaced simple next-intl middleware with composed Supabase + next-intl middleware
- `src/components/user-button.tsx` — Added real Supabase signOut to logout menu item
- `src/components/nav-main.tsx` — Fixed pre-existing type issue (role: UserRole | undefined)

### Deviations from Spec
- **No Edge Function for set-role:** Used Next.js API Route with admin client (`createClient(url, serviceRoleKey)`) instead of a separate Supabase Edge Function. Same security model — service-role key never leaves server. Can be migrated to Edge Function later if needed.
- **Onboarding step tracking:** Uses both `profiles.onboarding_step` (DB, for resumption) and `user_metadata.onboarding_completed` (for middleware check without DB query). The middleware reads `user_metadata` to avoid a DB call per request.
- **BUG-7 (Loading state):** Addressed via middleware redirect pattern — unauthenticated users never reach protected layout. Suspense boundary not needed since middleware handles the check at edge level.

### Backend Still Needed
- Database migrations (profiles table, user_consents table, triggers, RLS policies)
- Supabase Storage bucket configuration (avatars)
- Supabase Dashboard configuration (Auth settings, email templates)

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
