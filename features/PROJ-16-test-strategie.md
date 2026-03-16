# PROJ-16: Test-Strategie & Qualitätssicherung

## Status: In Progress
**Created:** 2026-03-12
**Last Updated:** 2026-03-12

## Dependencies
- Gilt für: alle PROJ-Features (PROJ-1 bis PROJ-15+)
- Technische Basis: Next.js 16, TypeScript, Supabase, Tailwind

## Übersicht
Vollständige Test-Strategie die mit jedem implementierten Feature mitwächst. Das System besteht aus drei Testebenen (Unit → Integration → E2E) und folgt dem Prinzip: **Jedes fertiggestellte Feature wird sofort mit Tests abgesichert — nicht als nachträglicher Schritt.** Tests werden in CI/CD (Vercel Preview Deployments) automatisch ausgeführt.

## Philosophie: Testing Pyramid für Train Smarter

```
        /\
       /E2E\          ← Wenige, kritische User-Journeys
      /------\
     /Integrat.\      ← API Routes, DB-Queries, Auth-Flows
    /------------\
   /  Unit Tests  \   ← Utilities, Validierung, Berechnungen
  /________________\
```

**Regel:** Je höher in der Pyramide, desto langsamer und teurer der Test → sparsam einsetzen. Unit Tests sind billig → großzügig einsetzen.

## Test-Tools

| Ebene | Tool | Begründung |
|---|---|---|
| Unit + Integration | **Vitest** | Schneller als Jest, native TypeScript, kompatibel mit Next.js App Router |
| E2E | **Playwright** | Browserübergreifend, Supabase Auth testbar, GitHub Actions Integration, Screenshot-Vergleiche |
| Accessibility | **axe-core** (via Playwright) | WCAG AA Checks automatisiert, kein manuelles Testen nötig |
| Coverage | **v8 (via Vitest)** | Native Coverage ohne Babel-Overhead |
| Supabase (Test-DB) | **Supabase CLI local** | Lokale Postgres-Instanz für Tests, keine Prod-DB |

## Ebene 1: Unit Tests (Vitest)

### Was wird unit-getestet
- **Validierungs-Schemas (Zod):** Alle Formular-Schemas aus PROJ-4, PROJ-5, PROJ-6 etc.
- **Utility-Funktionen:** Datums-Berechnungen (Makrozyklus-Dauer, Wochenoffsets), Gewichts-Progression (+2.5/5%), RPE-Berechnungen
- **Business Logic:** Einladungs-Token-Ablauf-Check, Retention-Policy-Berechnungen (30-Tage-Grace-Period)
- **Komponenten-Logik (isoliert):** Custom Hooks (useNotifications, useTrainingPlan), State-Transformationen
- **Permissions-Logik:** Rolle-basierte Sichtbarkeit (Trainer vs. Athlet vs. Admin)

### Konvention
```
src/
  lib/
    utils.test.ts         ← neben der getesteten Datei
  hooks/
    useNotifications.test.ts
  components/
    notification-bell.test.tsx
```

### Coverage-Ziel
- Utilities & Validierung: **90%+**
- Custom Hooks: **80%+**
- Komponenten: **60%+** (nur Logik, kein CSS)

## Ebene 2: Integration Tests (Vitest + Supabase Local)

### Was wird integration-getestet
- **API Route Handlers** (Next.js Route Handlers): alle Endpoints unter `src/app/api/`
- **Supabase RLS Policies:** Prüfen dass Trainer NICHT die Daten anderer Trainer sieht
- **Auth-Flows:** Registrierung → E-Mail-Verifizierung → Onboarding-Completion-Flag
- **Datenbank-Kaskaden:** Account-Löschung löscht alle verknüpften Daten (PROJ-11)
- **Edge Functions:** Einladungs-Token-Validierung, Daten-Export-Job

### RLS Test-Matrix (kritisch für Datenschutz)
Für jede Tabelle: Test dass User A NICHT User B's Daten lesen/schreiben kann.

| Tabelle | Test |
|---|---|
| `trainer_athlete_connections` | Trainer sieht nur eigene Verbindungen |
| `notifications` | User sieht nur eigene Notifications |
| `user_consents` | User kann nur eigene Consents lesen |
| `plans` (PROJ-7) | Trainer sieht nur eigene Pläne |
| `exercises` (PROJ-12) | Trainer sieht nur eigene + globale Übungen |

### Konvention
```
src/
  app/
    api/
      athletes/
        route.test.ts    ← neben dem Route Handler
  tests/
    rls/
      athlete-connections.test.ts
    auth/
      registration-flow.test.ts
```

## Ebene 3: E2E Tests (Playwright)

### Kritische User-Journeys (müssen IMMER grün sein)

Folgende Flows werden als E2E-Tests abgesichert — in dieser Priorität:

| # | Flow | PROJ | Kritikalität |
|---|---|---|---|
| 1 | Registrierung → DSGVO-Consent → Onboarding → Dashboard | PROJ-4, PROJ-11 | **Pflicht** |
| 2 | Login → Passwort vergessen → Reset → Login | PROJ-4 | **Pflicht** |
| 3 | Trainer lädt Athlet ein → Athlet nimmt an → Verbindung aktiv | PROJ-5, PROJ-13 | **Pflicht** |
| 4 | Trainer erstellt Plan → Autosave → Speichern & Schließen | PROJ-7 | **Pflicht** |
| 5 | Athlet öffnet Workout → Satz abhaken → Einheit abschließen | PROJ-7 | **Pflicht** |
| 6 | Athlet macht täglichen Check-in → Trainer sieht in Monitoring | PROJ-6 | **Hoch** |
| 7 | Account löschen → Bestätigungsmail → Daten weg nach 30d | PROJ-11 | **Hoch** |
| 8 | Notification-Präferenz auf „Keine" → keine In-App-Notification | PROJ-14 | **Mittel** |
| 9 | Globale Suche Cmd+K → Athlet suchen → Navigation | PROJ-15 | **Mittel** |
| 10 | Admin erstellt Template → Trainer findet es in Bibliothek | PROJ-10, PROJ-7 | **Mittel** |

### Playwright-Konfiguration
```
tests/
  e2e/
    01-auth/
      registration.spec.ts
      password-reset.spec.ts
    02-athletes/
      invite-athlete.spec.ts
    03-training/
      create-plan.spec.ts
      athlete-workout.spec.ts
    04-monitoring/
      daily-checkin.spec.ts
    05-account/
      delete-account.spec.ts
    06-notifications/
      notification-preferences.spec.ts
    07-search/
      global-search.spec.ts
```

### Playwright-Besonderheiten
- **Auth-Fixture:** Login-State wird einmalig pro Test-Session gecacht (kein Login in jedem Test)
- **Supabase Test-User:** Dedizierte Test-Accounts (`test-trainer@train-smarter.at`, `test-athlete@train-smarter.at`) mit bekannten Passwörtern — werden in Test-DB verwendet, niemals Prod
- **Screenshot bei Fehler:** Automatisch bei fehlgeschlagenem Test
- **Accessibility-Check:** Jeder E2E-Test prüft automatisch auf axe-core Violations (kein manueller Schritt)

## Sofort-Maßnahmen (Quick Wins — vor dem großen Test-Framework)

Diese Punkte werden **als erstes** implementiert, weil sie direkt verhindern dass funktionierende Dinge kaputtgehen — ohne dass Vitest oder Playwright installiert sein müssen.

### 1. Environment-Validierung beim Startup

Ein `src/lib/env.ts` Modul das beim App-Start alle required Env-Vars prüft und mit klarer Fehlermeldung abbricht wenn etwas fehlt:

```ts
// Pflicht-Vars die validiert werden:
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SITE_URL
```

Bei fehlendem Key: Startup schlägt fehl mit `Error: Missing required env var: NEXT_PUBLIC_SUPABASE_ANON_KEY` — kein stiller 500er mehr.

### 2. Pre-commit Hooks (Husky + lint-staged)

Vor jedem `git commit` wird automatisch ausgeführt:
- `npm run lint` — ESLint Fehler blockieren den Commit
- `tsc --noEmit` — TypeScript Fehler blockieren den Commit
- Formatierung (Prettier wenn eingesetzt)

Verhindert dass kaputtes Code committed wird.

### 3. `npm run check` Script

Neues Script das alle lokalen Checks auf einmal ausführt:
```bash
npm run check   # lint + type-check + build
```

Wird als Pflicht-Schritt vor jedem Deploy dokumentiert.

### 4. `.env.example` Datei

Eine `.env.example` mit allen Pflicht-Variablen (ohne Werte) die ins Repository eingecheckt wird. Verhindert dass Keys vergessen werden wenn jemand das Projekt neu aufsetzt.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
```

### Akzeptanzkriterien Sofort-Maßnahmen

- [ ] `src/lib/env.ts` validiert alle Pflicht-Env-Vars beim Start — klare Fehlermeldung statt 500
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` fehlt → App startet nicht, zeigt welche Variable fehlt
- [ ] Husky installiert: `git commit` mit Lint-Fehler schlägt fehl
- [ ] Husky installiert: `git commit` mit TypeScript-Fehler schlägt fehl
- [ ] `.env.example` mit allen Pflicht-Vars existiert im Repository
- [ ] `npm run check` führt lint + type-check durch

## CI/CD Integration

### GitHub Actions Pipeline
```
Push zu Feature-Branch:
  ├── lint (npm run lint)
  ├── type-check (tsc --noEmit)
  ├── unit + integration tests (vitest)
  └── E2E Tests auf Vercel Preview URL (Playwright)

Merge zu main:
  ├── alle obigen Tests
  └── E2E Tests auf Production URL (Smoke Tests)
```

### Fail-Policy
- **Unit + Integration Tests fehlschlagen** → Merge blockiert
- **E2E kritische Tests fehlschlagen** → Merge blockiert (Journeys 1–5)
- **E2E mittlere Tests fehlschlagen** → Warnung, Merge nicht blockiert
- **Accessibility-Violations** → Warnung im PR-Kommentar

## Test-Wachstum: Mit jedem PROJ

Das Test-System wächst mit jeder Feature-Implementierung:

| Wann | Was wird hinzugefügt |
|---|---|
| PROJ fertig (Backend) | RLS Integration Tests für neue Tabellen |
| PROJ fertig (Frontend) | Unit Tests für neue Utilities + Hooks |
| PROJ fertig (QA) | E2E Test für den kritischsten Flow des Features |
| Bugfix | Regression Test der den Bug reproduziert (bevor Fix) |

**Regel:** Kein Feature gilt als fertig bis mindestens ein E2E-Test den kritischen Flow abdeckt.

## Lokales Testen

```bash
# Unit + Integration Tests
npm run test              # einmalig
npm run test:watch        # watch mode

# E2E Tests (benötigt lokalen Supabase + Dev-Server)
npm run test:e2e          # headless
npm run test:e2e:ui       # mit Playwright UI (Debug-Modus)

# Coverage Report
npm run test:coverage
```

## Supabase Test-Datenbank

- Lokale Supabase-Instanz via `supabase start` (Docker)
- Test-Migrations werden vor E2E-Tests automatisch ausgeführt (`supabase db reset`)
- Seed-Script: erstellt Test-User, Test-Athleten, Test-Pläne für E2E-Tests
- Prod-Datenbank wird nie für Tests verwendet

## Test-Daten-Konventionen

- Test-E-Mails immer: `test-*@train-smarter.at` (Webgo blockiert diese für echten Versand)
- Test-User IDs sind konstant (im Seed-Script definiert) — kein Zufalls-ID-Problem
- Sensible Daten in Tests: niemals echte Körperdaten oder echte RPE-Werte — nur Dummy-Zahlen

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

**Last Updated:** 2026-03-14

### Leitprinzip: Lebende Tests — Tests wachsen mit dem Code

Das Testsystem ist kein einmaliges Setup, sondern ein **lebendes System**. Jede Code-Änderung zieht automatisch eine Test-Anpassung nach sich:

```
Neuer Code / Bugfix
  ↓
Skill (/frontend, /backend, /qa) schreibt Tests als Teil der Lieferung
  ↓
Pre-commit Hook validiert Format + Qualität
  ↓
CI/CD blockiert Merge wenn Tests rot sind
  ↓
Coverage-Gate verhindert dass Coverage sinkt
```

**Konsequenz:** Kein Feature ist "fertig" ohne Tests. Der `/qa` Skill schreibt nach jedem Bugfix einen Regressionstest der den Bug reproduziert — bevor der Fix committed wird.

---

### Phase 1: Sofort-Maßnahmen (diese Woche — kein Testframework nötig)

#### A) Typesafe Env-Validierung mit `@t3-oss/env-nextjs`

Empfehlung der Experten: **Nicht selbst bauen** — `@t3-oss/env-nextjs` (das Standard-Tool der Next.js Community) löst das Problem besser:

- Validiert **bei Build-Zeit** (nicht nur Runtime) — der Build schlägt fehl wenn eine Variable fehlt
- Vollständig typsicher — TypeScript kennt alle Env-Vars und ihre Typen
- Unterscheidet Server-only vars (`SUPABASE_SERVICE_ROLE_KEY`) von Client-safe vars (`NEXT_PUBLIC_*`)
- Klare Fehlermeldung: "❌ Invalid environment variables: NEXT_PUBLIC_SUPABASE_ANON_KEY: Required"

**Dateien:**
```
src/lib/env.ts           ← Zentrale Env-Definition (einmal, überall importiert)
.env.example             ← Alle Pflicht-Vars ohne Werte (ins Repo eingecheckt)
```

#### B) Pre-commit Hooks (Husky v9 + lint-staged)

```
git commit
  ↓
lint-staged:
  ├── *.{ts,tsx} → eslint --fix (Lint-Fehler blockieren)
  ├── *.{ts,tsx} → tsc --noEmit (TS-Fehler blockieren)
  └── *.{ts,tsx} → prettier --write (automatisch formatieren)
```

**Wichtig:** Husky v9 verwendet das neue `.husky/` Format ohne separate Konfigurationsdatei.

#### C) `npm run check` + `npm run typecheck` Scripts

```
npm run typecheck    → tsc --noEmit (nur Type-Checking)
npm run check        → lint + typecheck (läuft in CI und lokal vor Deploy)
```

---

### Phase 2: Unit + Integration Tests (Vitest)

#### Warum Vitest statt Jest?

| Kriterium | Jest | Vitest |
|---|---|---|
| Startup-Zeit | ~3-5s | ~0.3s |
| TypeScript | Babel-Transform nötig | Nativ |
| Next.js App Router | Aufwendige Konfiguration | Out-of-the-box |
| ESM Support | Problematisch | Nativ |

**Fazit:** Für diesen Stack (Next.js 16 + TypeScript) ist Vitest die klare Wahl.

#### Supabase in Unit Tests: MSW (Mock Service Worker)

**Expertenempfehlung:** Für Unit Tests wird Supabase **nicht** mit einer echten DB gemockt, sondern mit **MSW (Mock Service Worker)**:
- Interceptet HTTP-Anfragen auf Netzwerk-Ebene (nicht nur API-Mocks)
- Tests laufen ohne Docker / lokale Supabase-Instanz
- Realistische Response-Simulation ohne Prod-Daten

Für **Integration Tests** (RLS-Policies, Datenbanklogik): Hier wird die **lokale Supabase-Instanz** via `supabase start` verwendet — weil RLS-Policies echte SQL brauchen und nicht simulierbar sind.

#### Dateistruktur

```
src/
  lib/
    env.ts                    ← Phase 1
    env.test.ts               ← Testet dass Validierung funktioniert
    utils.test.ts             ← Bestehende utils.ts abdecken
    validations/
      auth.test.ts            ← Zod-Schemas testen (schon vorhanden)
    athletes/
      actions.test.ts         ← Server Actions (mit MSW)
      queries.test.ts         ← Queries (mit lokaler Supabase)
  hooks/
    use-avatar-upload.test.ts ← Upload-Logik + Magic-Byte-Validierung
tests/
  integration/
    rls/
      athlete-connections.test.ts
    auth/
      registration-flow.test.ts
  e2e/
    01-auth/...
    02-athletes/...
```

---

### Phase 3: E2E Tests (Playwright)

#### Auth-State Sharing — wichtigstes Performance-Thema

Playwright-Best-Practice: Login **einmal** pro Test-Run, State wird gespeichert und wiederverwendet:

```
tests/e2e/
  fixtures/
    auth.setup.ts        ← Login als Trainer + als Athlet, speichert State
  playwright.config.ts   ← globalSetup zeigt auf auth.setup.ts
  01-auth/...            ← Tests starten bereits eingeloggt
```

Ohne dieses Pattern: Login-Zeit verdoppelt jeden Test. Mit diesem Pattern: Login passiert einmal für alle Tests.

#### Test-Isolation: Supabase Test-User

Alle E2E-Tests laufen gegen **dedizierte Test-Accounts** in der **Prod-Supabase-Instanz** (separates Schema) oder einer **Staging-Instanz**:

```
test-trainer@train-smarter.at  (Passwort in GitHub Secrets)
test-athlete@train-smarter.at  (Passwort in GitHub Secrets)
```

Ein **Cleanup-Hook** (`afterAll`) löscht Test-Daten nach jedem Run. Niemals Prod-User-Daten verwenden.

---

### Lebende Tests: Wie das System sich selbst aktualisiert

**Das wichtigste Prinzip:** Das Testsystem veraltet nie, weil Regeln erzwingen dass es mitgepflegt wird.

#### Regel 1: Coverage-Gate (Ratchet Pattern)

Die Coverage-Schwelle wird **nie gesenkt**, kann aber erhöht werden:

```
Aktuell:   utils 90% / hooks 80% / components 60%
Nach Fix:  Coverage darf nicht sinken → CI schlägt fehl wenn Coverage fällt
```

Dieser "Ratchet" verhindert schleichende Test-Erosion.

#### Regel 2: Bugfix → Regressionstest (Pflicht)

Workflow bei jedem Bug:
1. Test schreiben der den Bug **reproduziert** (Test ist rot)
2. Fix implementieren (Test wird grün)
3. Test bleibt im Repository — der Bug kann nie wieder unbemerkt einschleichen

#### Regel 3: Neue API-Route → Route Handler Test (Pflicht)

Jede neue Datei unter `src/app/api/` braucht eine `route.test.ts` daneben. Der Pre-commit Hook warnt (nicht blockiert) wenn eine neue API-Route kein Test-File hat.

#### Regel 4: Neue Supabase-Tabelle → RLS Test (Pflicht)

Bei jeder neuen Migration die eine Tabelle erstellt: ein RLS-Integrationstest wird hinzugefügt der User-A-kann-nicht-User-B-Daten-lesen verifiziert. Dieser Test wird vom `/backend` Skill automatisch erstellt.

---

### GitHub Actions Pipeline (vollständig)

```
.github/workflows/
  ci.yml          ← Läuft bei jedem Push + PR
  e2e.yml         ← Läuft bei PR zu main (teurer, deshalb separat)
```

**`ci.yml`** (schnell, <2min):
```
1. checkout + npm ci
2. npm run check (lint + typecheck)
3. npm run test (vitest unit + integration)
4. Coverage-Gate prüfen
```

**`e2e.yml`** (langsamer, ~5-10min, nur bei PR zu main):
```
1. Warten auf Vercel Preview Deployment
2. Playwright Tests gegen Preview URL
3. Screenshot-Artifacts bei Fehler hochladen
4. Accessibility-Report als PR-Kommentar posten
```

---

### Abhängigkeiten (neue Pakete)

| Paket | Zweck | Phase |
|---|---|---|
| `@t3-oss/env-nextjs` | Typesafe env-Validierung | 1 |
| `husky` | Pre-commit Hooks | 1 |
| `lint-staged` | Nur geänderte Dateien linten | 1 |
| `vitest` | Unit + Integration Test-Runner | 2 |
| `@vitejs/plugin-react` | React-Support in Vitest | 2 |
| `@vitest/coverage-v8` | Coverage-Reports | 2 |
| `msw` | HTTP-Mocking für Unit Tests | 2 |
| `@testing-library/react` | Komponenten-Tests | 2 |
| `playwright` | E2E Tests | 3 |
| `@axe-core/playwright` | Accessibility in E2E | 3 |

---

### Phase 4: CI/CD Pipeline + Offene Tests (Solution Architect)

**Last Updated:** 2026-03-16

#### Überblick

Phase 4 schließt das Testsystem ab: Automatische Tests bei jedem Push/PR via GitHub Actions und die noch offenen Unit-/Integration-Tests für die E-Mail-Validierung. Danach ist PROJ-16 vollständig abgeschlossen.

#### Entscheidungen

| Entscheidung | Gewählt | Begründung |
|---|---|---|
| Test-Umgebung für CI | Prod-Supabase mit Test-Usern | Kein zweites Projekt nötig. Test-User haben feste UUIDs, sind isoliert von echten Nutzern. Weniger Wartung als Staging-Instanz. |
| CI-Trigger | Push + PR zu main | Push auf jeden Branch → schnelle Checks (lint, types, unit). PR zu main → volle Suite inkl. E2E. Standard-Pattern, frühes Feedback. |
| E2E in CI gegen | Vercel Preview URL | Testet den echten Build (nicht nur Dev-Server). Preview Deployment existiert bereits bei PRs. |
| Secrets-Handling | GitHub Secrets | Test-User-Passwörter und Supabase-Keys als Repository Secrets. Nie im Code. |

---

#### A) CI/CD Pipeline — Zwei Workflows

```
.github/workflows/
  ci.yml      ← Schnell (<2min), bei jedem Push
  e2e.yml     ← Langsamer (~5min), nur bei PR zu main
```

**Workflow 1: `ci.yml`** — Schnelle Checks

```
Trigger: Push auf jeden Branch + PR zu main

Schritte:
  1. Checkout + Node.js Setup + npm ci (gecacht)
  2. Lint (npm run lint)
  3. TypeScript Check (npm run typecheck)
  4. Unit Tests (npm run test)
  5. Coverage-Report als PR-Kommentar

Fail-Policy: Merge blockiert wenn irgendein Schritt fehlschlägt
Dauer: ~1-2 Minuten
```

**Workflow 2: `e2e.yml`** — E2E gegen Vercel Preview

```
Trigger: Nur bei PR zu main

Schritte:
  1. Warten auf Vercel Preview Deployment (via Vercel GitHub Integration)
  2. Playwright installieren (gecacht)
  3. E2E-Tests gegen Preview URL ausführen
  4. Screenshot-Artifacts bei Fehlern hochladen
  5. Accessibility-Violations als PR-Kommentar

Fail-Policy:
  - Kritische Tests (Auth, Athletes) fehlgeschlagen → Merge blockiert
  - Accessibility-Violations → Warnung (nicht blockierend)

Dauer: ~3-5 Minuten
```

**Secrets die konfiguriert werden müssen:**

| Secret | Zweck |
|---|---|
| `E2E_TRAINER_EMAIL` | Login für Trainer-Tests |
| `E2E_TRAINER_PASSWORD` | Passwort Trainer-Account |
| `E2E_ATHLETE_EMAIL` | Login für Athlete-Tests |
| `E2E_ATHLETE_PASSWORD` | Passwort Athlete-Account |

---

#### B) Offene Tests — E-Mail-Validierung

**Unit Tests** für `validateEmailPlausibility()`:

```
Was wird getestet:
  - Gültige E-Mail + existierender MX-Record → valid
  - Gültige E-Mail + nicht-existente Domain → invalid (no_mx_record)
  - Ungültiges Format → invalid (invalid_format)
  - DNS-Timeout → valid (fail-open, damit User nicht blockiert wird)
  - Leerer String → invalid

Werkzeug: Vitest + MSW (DNS-Antworten mocken)
Datei: src/lib/validation/email.test.ts
```

**Integration Tests** für `/api/validate-email` Route:

```
Was wird getestet:
  - POST mit gültiger E-Mail → 200 + { valid: true }
  - POST mit ungültiger Domain → 200 + { valid: false, reason }
  - POST ohne Body → 400
  - Falsche HTTP-Methode → 405

Werkzeug: Vitest (Route Handler direkt aufrufen)
Datei: src/app/api/validate-email/route.test.ts
```

---

#### C) Akzeptanzkriterien Phase 4

- [ ] `ci.yml` existiert: Push auf beliebigen Branch → lint + typecheck + unit tests laufen
- [ ] `e2e.yml` existiert: PR zu main → E2E-Tests gegen Vercel Preview URL
- [ ] CI blockiert Merge bei fehlgeschlagenen Tests (Branch Protection Rule)
- [ ] Secrets für Test-User in GitHub konfiguriert
- [ ] Unit Tests für `validateEmailPlausibility()` — mindestens 6 Tests
- [ ] Integration Tests für `/api/validate-email` — mindestens 4 Tests
- [ ] Alle bestehenden Tests (49 Unit + 28 E2E) bleiben grün

---

#### D) Dateien die erstellt/geändert werden

| Datei | Aktion | Beschreibung |
|---|---|---|
| `.github/workflows/ci.yml` | Neu | Lint + TypeCheck + Unit Tests bei Push |
| `.github/workflows/e2e.yml` | Neu | Playwright E2E bei PR zu main |
| `src/lib/validation/email.test.ts` | Neu | Unit Tests für E-Mail-Plausibilität |
| `src/app/api/validate-email/route.test.ts` | Neu | Integration Tests für API Route |
| `playwright.config.ts` | Ändern | `baseURL` aus Env-Variable für CI |

Keine neuen Pakete nötig — alle Tools sind bereits installiert.

### Expertenantworten: Langfristig das Beste rausholen

**1. "Test-first" vs. "Test-alongside" für Solo-Entwickler**
Echtes TDD (Test-first) ist für Solo-Entwickler oft zu langsam. Empfehlung: **"Test-alongside"** — Unit Tests für jede neue Utility-Funktion sofort schreiben, E2E Tests für jeden abgeschlossenen Flow. Das gibt 80% des Sicherheitsnetzes bei 40% des Aufwands.

**2. Snapshot Tests für UI-Komponenten**
Playwright kann Screenshots von Seiten machen und mit dem letzten Stand vergleichen (**Visual Regression Testing**). Empfehlung: Nur für die 3-4 kritischsten Seiten (Dashboard, Athletes-Overview, Profile). Zu viele Snapshots = zu viele falsch-positive Fehler.

**3. Der wertvollste Test für dieses Projekt**
RLS-Integrationstests. Ein Trainer der versehentlich die Athleten eines anderen Trainers sieht ist ein Datenschutz-Incident — der schlimmste mögliche Bug. Diese Tests kosten wenig, schützen vor viel.

**4. Monitoring ergänzt Tests**
Tests prüfen ob Code korrekt ist — aber nicht ob er in Produktion läuft. Empfehlung (nach PROJ-16 Phase 1+2): Sentry Error Tracking (bereits im `/deploy` Skill) für Runtime-Fehler. Tests + Monitoring = vollständiges Sicherheitsnetz.

**5. Priorisierung für Solo-Entwickler**
Reihenfolge die den höchsten ROI liefert:
1. Phase 1 (Husky + Env-Validierung) — **sofort, heute**
2. RLS Integration Tests — **höchste Sicherheitsprioritität**
3. Auth E2E Tests (Login/Register/Reset) — **kritischster User-Flow**
4. Unit Tests für Utility-Funktionen — **billigste Tests, hohe Coverage**
5. Visuelles Monitoring (Sentry) — **ergänzt, ersetzt keine Tests**

## QA Test Results

**Tested:** 2026-03-14
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI)
**Scope:** Phase 1 Sofort-Massnahmen only (Phase 2+3 not yet implemented)

### Acceptance Criteria Status (Phase 1: Sofort-Massnahmen)

#### AC-1: `src/lib/env.ts` validates all required env vars at startup -- clear error instead of 500
- [ ] FAIL: `src/lib/env.ts` does NOT exist. No env validation module was created.
- [ ] FAIL: `@t3-oss/env-nextjs` (recommended in Tech Design) is NOT installed.
- [ ] FAIL: All env var access uses `process.env.X!` with TypeScript non-null assertions, which silently passes `undefined` at runtime if the variable is missing.

#### AC-2: Missing `NEXT_PUBLIC_SUPABASE_ANON_KEY` causes app to not start, shows which variable is missing
- [ ] FAIL: No startup validation exists. A missing key would produce a cryptic Supabase client error at runtime, not a clear startup message.

#### AC-3: Husky installed -- `git commit` with lint error blocks commit
- [x] PASS: Husky v9 is installed (`devDependencies`, `.husky/pre-commit` exists)
- [x] PASS: Pre-commit hook runs `npx lint-staged`
- [x] PASS: lint-staged configured to run `eslint --fix` on `*.{ts,tsx}` files
- [ ] BUG: lint-staged runs `eslint --fix` which auto-fixes many lint issues silently. Only unfixable errors will block the commit. The spec says "ESLint Fehler blockieren den Commit" -- auto-fixing is a softer behavior than strictly blocking.

#### AC-4: Husky installed -- `git commit` with TypeScript error blocks commit
- [ ] FAIL: lint-staged config does NOT include `tsc --noEmit`. TypeScript errors will NOT block commits. The spec explicitly requires: "tsc --noEmit -- TS-Fehler blockieren den Commit".

#### AC-5: `.env.example` with all required vars exists in the repository
- [x] PASS: `.env.example` exists, is tracked in git, contains all 4 required variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_SITE_URL`

#### AC-6: `npm run check` runs lint + type-check
- [x] PASS: Script defined as `npm run lint && npm run typecheck`
- [x] PASS: `npm run typecheck` defined as `tsc --noEmit`
- [x] PASS: Both commands execute successfully

### Additional Findings

#### Duplicate env example files
- `.env.example` (added in PROJ-16) and `.env.local.example` (added earlier) both exist with near-identical content. This creates confusion about which is the canonical reference.

#### Build verification
- [x] PASS: `npm run build` completes successfully
- [x] PASS: All routes render without errors

### Security Audit Results (Phase 1 scope)

- [ ] BUG: Non-null assertions (`!`) on `process.env` values in `src/lib/supabase/client.ts`, `server.ts`, and `middleware.ts` are a runtime safety hazard. If env vars are undefined, the Supabase client will be initialized with `undefined` values, leading to cryptic errors rather than a clear failure. This is exactly what AC-1 was supposed to prevent.
- [x] PASS: `.env.local` is in `.gitignore` and not tracked in git -- secrets are not committed.
- [x] PASS: `.env.example` contains no actual secret values.
- [x] PASS: `SUPABASE_SERVICE_ROLE_KEY` is NOT prefixed with `NEXT_PUBLIC_`, so it is server-side only.

### Regression Check (Deployed Features)

No regressions detected from PROJ-16 Phase 1 changes:
- [x] PASS: `npm run build` still succeeds (PROJ-1 through PROJ-5 routes intact)
- [x] PASS: `npm run lint` still succeeds
- [x] PASS: `npm run typecheck` still succeeds
- [x] PASS: No existing files were modified (only new files added + package.json scripts)

### Bugs Found

#### BUG-1: Missing env validation module (src/lib/env.ts)
- **Severity:** High
- **Steps to Reproduce:**
  1. Check for `src/lib/env.ts` -- file does not exist
  2. Check for `@t3-oss/env-nextjs` in package.json -- not installed
  3. Remove `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `.env.local`
  4. Run `npm run dev`
  5. Expected: App fails to start with clear message "Missing required env var: NEXT_PUBLIC_SUPABASE_ANON_KEY"
  6. Actual: App starts but crashes at runtime with a cryptic Supabase client error
- **Priority:** Fix before deployment -- this is 2 of 6 acceptance criteria (AC-1, AC-2) not met

#### BUG-2: TypeScript errors do not block git commits
- **Severity:** High
- **Steps to Reproduce:**
  1. Open any `.ts` file and introduce a type error (e.g., `const x: number = "hello"`)
  2. Stage the file with `git add`
  3. Run `git commit -m "test"`
  4. Expected: Commit blocked by `tsc --noEmit` error
  5. Actual: Commit succeeds -- lint-staged only runs `eslint --fix`, not `tsc --noEmit`
- **Priority:** Fix before deployment -- the spec explicitly requires TypeScript checking in pre-commit

#### BUG-3: lint-staged auto-fixes instead of strictly blocking
- **Severity:** Low
- **Steps to Reproduce:**
  1. Introduce a fixable lint error (e.g., missing semicolon if configured)
  2. Stage and commit
  3. Expected: Commit blocked so developer sees the error
  4. Actual: `eslint --fix` silently corrects the issue and commit succeeds
- **Note:** This is a design choice, not strictly a bug. The spec says "ESLint Fehler blockieren den Commit" but auto-fix-then-pass is a common and acceptable pattern. The key protection (unfixable errors still block) works correctly.
- **Priority:** Nice to have -- current behavior is industry-standard

#### BUG-4: Duplicate .env example files
- **Severity:** Low
- **Steps to Reproduce:**
  1. Observe both `.env.example` and `.env.local.example` exist in the repo
  2. Both contain nearly identical content
  3. New developers may be confused about which to use
- **Priority:** Nice to have -- consolidate into one file (recommend keeping `.env.example` and removing `.env.local.example`)

### Feature Spec Status Discrepancy
- **Severity:** Low
- `features/INDEX.md` shows PROJ-16 as "In Progress"
- The spec header on line 3 shows "Status: Planned"
- These should match.

### Summary
- **Acceptance Criteria:** 3/6 passed (AC-3 partial, AC-5, AC-6 pass; AC-1, AC-2, AC-4 fail)
- **Bugs Found:** 4 total (0 critical, 2 high, 0 medium, 2 low)
- **Security:** Env var safety hazard due to missing validation (BUG-1)
- **Production Ready:** NO
- **Recommendation:** Fix BUG-1 (env validation module) and BUG-2 (add tsc to lint-staged) before considering Phase 1 complete. These are the two highest-impact items and represent the core safety net that Phase 1 was designed to provide.

## Implementation Progress

### Phase 1: Sofort-Maßnahmen — COMPLETE (2026-03-14)
- [x] `src/lib/env.ts` — typesafe env validation with `@t3-oss/env-nextjs`
- [x] Husky v9 + lint-staged — pre-commit hooks (eslint + tsc)
- [x] `.env.example` — all required vars documented
- [x] `npm run check` / `npm run typecheck` scripts
- [x] Duplicate `.env.local.example` removed

### Phase 2: Unit Tests (Vitest) — COMPLETE (2026-03-14)
- [x] Vitest + jsdom + @testing-library/react installed
- [x] `vitest.config.ts` with path aliases and coverage config
- [x] `src/test/setup.ts` with jest-dom matchers
- [x] Test scripts: `npm run test`, `npm run test:watch`, `npm run test:coverage`

**Test suites created (49 tests, all passing):**
- [x] `src/lib/validations/auth.test.ts` — 22 tests covering all 5 Zod schemas (login, register, forgotPassword, resetPassword, profile), password rules, umlaut support, name regex
- [x] `src/lib/mock-session.test.ts` — 8 tests for `toAuthUser()` converter (missing fields, defaults, dual roles, platform admin)
- [x] `src/lib/utils.test.ts` — 8 tests for `cn()` utility (Tailwind conflict resolution, conditional classes, edge cases)
- [x] `src/hooks/use-avatar-upload.test.ts` — 8 tests for `validateImageMagicBytes()` (JPEG, PNG, WebP detection, GIF rejection, empty files, disguised files)

### Phase 3: E2E Tests (Playwright) — COMPLETE (2026-03-16)
- [x] Playwright + @axe-core/playwright installed
- [x] `playwright.config.ts` with Chromium, auth state caching, dev server auto-start
- [x] Auth fixture: `tests/e2e/fixtures/auth.setup.ts` (Trainer + Athlete login state)
- [x] npm scripts: `npm run test:e2e`, `npm run test:e2e:ui`
- [x] `.gitignore` updated for auth state, test-results, playwright-report

**Test suites created (28 tests across 4 files):**
- [x] `tests/e2e/fixtures/auth.setup.ts` — 2 setup tests (Trainer + Athlete login state caching)
- [x] `tests/e2e/01-auth/registration.spec.ts` — 6 tests (form rendering, validation, password mismatch, registration → verify-email redirect, a11y)
- [x] `tests/e2e/01-auth/password-reset.spec.ts` — 14 tests (login page, forgot-password flow, reset-password states, anti-enumeration, confirmed redirect, a11y)
- [x] `tests/e2e/02-athletes/invite-athlete.spec.ts` — 7 tests (athletes page, invite modal, email validation, dashboard, onboarding redirect, a11y)

## Deployment

- **Production URL:** https://www.train-smarter.at
- **Phase 1 deployed:** 2026-03-14
- **Phase 2 deployed:** 2026-03-14
- **Commit:** `0f16738`

Phase 3 (E2E Playwright) folgt mit Implementierung weiterer kritischer Features (PROJ-6, PROJ-7).

---

## Neue Tests aus Enhancements (2026-03-16)

### Unit Tests für E-Mail-Plausibilitätsprüfung (PROJ-13 Enhancement 2)
- [ ] `src/lib/validation/email.test.ts` — Tests für `validateEmailPlausibility()`
  - Gültiges Format + existierender MX-Record → `{ valid: true }`
  - Gültiges Format + nicht-existenter Domain → `{ valid: false, reason: "no_mx_record" }`
  - Ungültiges Format → `{ valid: false, reason: "invalid_format" }`
  - DNS-Timeout → `{ valid: true }` (fail-open)
  - Domain mit A-Record aber ohne MX → `{ valid: true }` (Fallback)
  - Leerer String, nur Whitespace → `{ valid: false, reason: "invalid_format" }`

### Integration Tests
- [ ] `src/app/api/validate-email/route.test.ts` — API Route Tests
  - POST mit gültiger E-Mail → 200 + `{ valid: true }`
  - POST mit ungültigem Domain → 200 + `{ valid: false, reason: "no_mx_record" }`
  - POST ohne Body → 400
  - GET (falsche Methode) → 405

### E2E Tests (Playwright — Phase 3)
- [ ] `tests/e2e/02-athletes/invite-athlete.spec.ts` — Erweitern:
  - Trainer gibt ungültige Domain ein → Fehlermeldung erscheint inline
  - Trainer zieht Einladung zurück (Withdraw-Button in Unified View) → Card verschwindet
- [ ] `tests/e2e/01-auth/registration.spec.ts` — Erweitern:
  - User gibt ungültige Domain ein → Inline-Warnung, Submit blockiert
