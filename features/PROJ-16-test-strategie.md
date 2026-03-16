# PROJ-16: Test-Strategie & Qualitätssicherung

## Status: In Review
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

## QA Test Results (Round 2 -- Full Phases 1-4)

**Tested:** 2026-03-17
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI)
**Scope:** All 4 phases of PROJ-16 (Sofort-Massnahmen, Unit Tests, E2E Tests, CI/CD + Email Tests)

### Previous QA Bugs -- Re-verification

| Bug | Previous Status | Current Status | Notes |
|-----|----------------|----------------|-------|
| BUG-1 (Missing env.ts) | FAIL | FIXED | `src/lib/env.ts` exists with `@t3-oss/env-nextjs`, validates 4 vars via Zod |
| BUG-2 (tsc not in lint-staged) | FAIL | FIXED | lint-staged now includes `"*.ts?(x)": ["bash -c 'tsc --noEmit'"]` |
| BUG-3 (eslint --fix auto-fixes) | Low | ACCEPTED | Industry-standard pattern, unfixable errors still block |
| BUG-4 (Duplicate .env files) | Low | FIXED | Only `.env.example` remains, `.env.local.example` removed |
| Status discrepancy | Low | PARTIAL | Header now says "In Progress" (correct), INDEX.md matches |

---

### Phase 1: Sofort-Massnahmen -- Acceptance Criteria

#### AC-1: `src/lib/env.ts` validates all required env vars at startup
- [x] PASS: `src/lib/env.ts` exists and uses `@t3-oss/env-nextjs` (v0.13.10)
- [x] PASS: Validates 4 env vars via Zod: `NEXT_PUBLIC_SUPABASE_URL` (url), `NEXT_PUBLIC_SUPABASE_ANON_KEY` (string.min(1)), `NEXT_PUBLIC_SITE_URL` (url), `SUPABASE_SERVICE_ROLE_KEY` (string.min(1))
- [x] PASS: Client/server separation correct -- `SUPABASE_SERVICE_ROLE_KEY` is server-only
- [ ] BUG-5: `env.ts` is NEVER imported anywhere in the codebase. Zero files import from `@/lib/env`. All Supabase client files (`client.ts`, `server.ts`, `middleware.ts`) still use `process.env.X!` with non-null assertions. The env validation module is dead code -- it does not execute at startup and provides zero runtime protection.

#### AC-2: Missing `NEXT_PUBLIC_SUPABASE_ANON_KEY` causes app to not start
- [ ] FAIL: Since `env.ts` is never imported, a missing env var will NOT cause the app to fail at startup. The `@t3-oss/env-nextjs` module only validates when its exported `env` object is first accessed -- but nothing accesses it. This AC is still not met.

#### AC-3: Husky installed -- `git commit` with lint error blocks commit
- [x] PASS: Husky v9 installed, `.husky/pre-commit` runs `npx lint-staged`
- [x] PASS: lint-staged runs `eslint --fix` on `*.{ts,tsx}` files
- [x] PASS: Unfixable lint errors block the commit

#### AC-4: Husky installed -- `git commit` with TypeScript error blocks commit
- [x] PASS (FIXED): lint-staged config now includes `"*.ts?(x)": ["bash -c 'tsc --noEmit'"]`
- [x] PASS: The `bash -c` wrapper correctly discards file arguments so `tsc` checks the full project

#### AC-5: `.env.example` with all required vars exists in the repository
- [x] PASS: `.env.example` exists with all required vars plus SMTP and HEALTH_API_KEY

#### AC-6: `npm run check` runs lint + type-check
- [x] PASS: Script runs `npm run lint && npm run typecheck`
- [x] PASS: Both commands complete successfully (1 warning in lint, 0 errors)

**Phase 1 Result: 5/6 AC passed. AC-2 still fails due to BUG-5 (dead code).**

---

### Phase 2: Unit Tests (Vitest) -- Acceptance Criteria

#### AC-7: Vitest installed and configured
- [x] PASS: `vitest` v4.1.0, `@vitejs/plugin-react`, `@vitest/coverage-v8`, `jsdom`, `@testing-library/react` all installed
- [x] PASS: `vitest.config.ts` has correct path aliases (`@/` -> `./src/`), jsdom environment, coverage config
- [x] PASS: Test scripts: `npm run test`, `npm run test:watch`, `npm run test:coverage`

#### AC-8: Unit tests pass
- [x] PASS: 104 tests across 9 test files, ALL passing (verified 2026-03-17)
- [x] PASS: Test run completes in ~2.3s

#### AC-9: Test suites cover specified areas
- [x] PASS: `auth.test.ts` -- 22 tests for Zod validation schemas
- [x] PASS: `mock-session.test.ts` -- 8 tests for toAuthUser()
- [x] PASS: `utils.test.ts` -- 8 tests for cn() utility
- [x] PASS: `use-avatar-upload.test.ts` -- 8 tests for magic byte validation
- [x] PASS: `email.test.ts` -- 17 tests for validateEmailPlausibility() (format, MX, A-record fallback, DNS timeout, caching, edge cases)
- [x] PASS: `route.test.ts` (validate-email) -- 10 tests (happy path, validation errors, rate limiting, method handling)
- [x] PASS: `security-headers.test.ts`, `manifest.test.ts`, `icon/route.test.ts` -- additional coverage

#### AC-10: Coverage thresholds configured
- [x] PASS: Coverage config specifies thresholds for `src/lib/validations/` (90%) and `src/lib/utils.ts` (90%)
- [ ] BUG-6: Overall coverage is very low (5.2% statements). Large areas like `lib/athletes/`, `lib/feedback/`, `lib/teams/`, and most hooks have 0% coverage. While coverage thresholds exist for specific files, the broad coverage is well below the spec targets of "Utilities & Validierung: 90%+, Custom Hooks: 80%+, Components: 60%+".

**Phase 2 Result: 3/4 AC passed. Coverage breadth (AC-10) is partially met.**

---

### Phase 3: E2E Tests (Playwright) -- Acceptance Criteria

#### AC-11: Playwright installed and configured
- [x] PASS: `@playwright/test` v1.58.2 and `@axe-core/playwright` v4.11.1 installed
- [x] PASS: `playwright.config.ts` with Chromium project, auth state caching, dev server auto-start
- [x] PASS: `PLAYWRIGHT_BASE_URL` env var support for CI usage
- [x] PASS: npm scripts `test:e2e` and `test:e2e:ui` defined

#### AC-12: Auth fixture caches login state
- [x] PASS: `tests/e2e/fixtures/auth.setup.ts` logs in as Trainer and Athlete, saves state to `tests/e2e/.auth/`
- [x] PASS: Playwright config has `setup` project that runs before `chromium` project
- [x] PASS: Test credentials come from env vars with fallback defaults

#### AC-13: E2E tests cover critical user journeys
- [x] PASS: Registration flow (6 tests) -- form rendering, validation, password mismatch, redirect to verify-email, a11y
- [x] PASS: Password reset / login flow (14 tests) -- forgot-password, reset-password states, anti-enumeration, login, a11y
- [x] PASS: Athlete invite flow (7 tests) -- athletes page, invite modal, email validation, dashboard, onboarding redirect, a11y
- [ ] NOTE: Only Chromium browser configured. Spec mentions cross-browser (Firefox, Safari) but only Chromium project exists. This is acceptable for MVP but should be expanded.

#### AC-14: Accessibility checks in every E2E test
- [x] PASS: Every test file includes axe-core accessibility checks with WCAG 2.0 AA tags
- [x] PASS: Only critical violations fail the test (correct approach)

**Phase 3 Result: 4/4 AC passed.**

---

### Phase 4: CI/CD Pipeline + Email Tests -- Acceptance Criteria

#### AC-15: `ci.yml` exists -- push on any branch triggers lint + typecheck + unit tests
- [x] PASS: `.github/workflows/ci.yml` exists
- [x] PASS: Triggers on `push` to all branches and `pull_request` to `main`
- [x] PASS: Runs lint, typecheck, and `npm run test` in sequence
- [x] PASS: Uses Node.js 20, npm cache, 10-minute timeout
- [x] PASS: Concurrency group with cancel-in-progress prevents parallel runs

#### AC-16: `e2e.yml` exists -- PR to main triggers E2E against Vercel Preview URL
- [x] PASS: `.github/workflows/e2e.yml` exists
- [x] PASS: Triggers only on PR to `main`
- [x] PASS: Waits for Vercel preview deployment via `wait-for-vercel-preview@v1.3.2`
- [x] PASS: Uses `PLAYWRIGHT_BASE_URL` from Vercel output
- [x] PASS: Caches Playwright browsers, uploads failure artifacts
- [x] PASS: Test-user secrets passed via `secrets.*` env vars

#### AC-17: CI blocks merge on test failure
- [ ] BUG-7: No branch protection rules are configured. The CI/CD workflows exist but there is no evidence of GitHub branch protection rules that would actually block merging when CI fails. The workflows run, but merging is not gated.

#### AC-18: Secrets for test users configured in GitHub
- [ ] CANNOT VERIFY: This requires GitHub repository settings access. The workflow references `secrets.E2E_TRAINER_EMAIL`, etc. but whether these are actually configured cannot be verified from code alone. The auth.setup.ts has hardcoded fallback values which would be used if secrets are missing.

#### AC-19: Unit tests for `validateEmailPlausibility()` -- at least 6 tests
- [x] PASS: `src/lib/validation/email.test.ts` contains 17 tests (exceeds minimum of 6)
- [x] PASS: Covers format checks (5), valid MX (1), non-existent domain (3), A-record fallback (1), DNS timeout (2), empty MX array (1), caching (2), edge cases (2)

#### AC-20: Integration tests for `/api/validate-email` -- at least 4 tests
- [x] PASS: `src/app/api/validate-email/route.test.ts` contains 10 tests (exceeds minimum of 4)
- [x] PASS: Covers happy path (2), validation errors (4), rate limiting (2), method handling (1), content-type check (1)

#### AC-21: All existing tests remain green
- [x] PASS: All 104 unit tests pass (was 49 in Phase 2, now 104 with email tests added)

**Phase 4 Result: 5/7 AC passed. AC-17 (branch protection) not configured, AC-18 cannot verify.**

---

### Security Audit Results (Red Team)

#### Env Var Safety
- [ ] BUG-5 (repeated): `env.ts` is dead code. All 6 instances of `process.env.NEXT_PUBLIC_SUPABASE_*!` still use non-null assertions. No runtime protection against missing env vars.
- [x] PASS: `.env.local` is gitignored via `.env*.local` pattern
- [x] PASS: `.env.example` contains no secret values
- [x] PASS: `SUPABASE_SERVICE_ROLE_KEY` is server-side only (no `NEXT_PUBLIC_` prefix)

#### Rate Limiting on validate-email API
- [x] PASS: Rate limiting implemented at 30 requests/minute/IP
- [x] PASS: Rate limit tested and verified in unit tests
- [ ] BUG-8: Rate limiting uses in-memory Map which resets on every serverless cold start. On Vercel, each new instance has a fresh Map, so the rate limit is effectively per-instance, not global. An attacker could bypass the rate limit by triggering cold starts or waiting for instance recycling. The code documents this limitation but no persistent rate limiting (Upstash Redis, Vercel KV) is configured.

#### E2E Test Credential Hardcoding
- [ ] BUG-9: `tests/e2e/fixtures/auth.setup.ts` contains hardcoded fallback credentials: `test-trainer@train-smarter.at` / `TestTrainer123!` and `test-athlete@train-smarter.at` / `TestAthlete123!`. While these are test accounts, the passwords are committed to the repository in plain text. If these are real Supabase accounts (even for testing), the passwords should come exclusively from env vars/secrets with no fallback defaults in code.

#### Health Check API
- [x] PASS: `/api/health` requires authentication (admin role or API key)
- [x] PASS: Health endpoint does not expose sensitive data in responses
- [ ] NOTE: `HEALTH_API_KEY` is compared with simple string equality (`apiKey === envApiKey`). This is vulnerable to timing attacks. For a health check endpoint this is low risk, but a constant-time comparison would be more secure.

#### CI/CD Secret Handling
- [x] PASS: CI workflows use `secrets.*` for test credentials, never hardcoded in YAML
- [x] PASS: Artifact uploads only on failure, with 7-day retention

---

### Regression Check (Deployed Features)

- [x] PASS: `npm run build` succeeds -- all routes compile without errors
- [x] PASS: `npm run lint` succeeds (1 warning, 0 errors)
- [x] PASS: `npm run typecheck` succeeds (0 errors)
- [x] PASS: All 104 unit tests pass
- [x] PASS: No changes to deployed feature code (PROJ-1 through PROJ-13)

---

### Bugs Found

#### BUG-5: env.ts is dead code -- never imported anywhere (REOPENED from BUG-1)
- **Severity:** High
- **Steps to Reproduce:**
  1. Run: `grep -r "from.*@/lib/env\|import.*env.*from" src/` -- zero results
  2. `src/lib/env.ts` exists with correct validation, but no file imports it
  3. `src/lib/supabase/client.ts` line 5-6 still use `process.env.NEXT_PUBLIC_SUPABASE_URL!`
  4. `src/lib/supabase/server.ts` line 8-9 still use `process.env.NEXT_PUBLIC_SUPABASE_URL!`
  5. `src/lib/supabase/middleware.ts` line 10-11 still use `process.env.NEXT_PUBLIC_SUPABASE_URL!`
  6. Expected: All Supabase client files import from `@/lib/env` and use `env.NEXT_PUBLIC_SUPABASE_URL`
  7. Actual: env.ts is unreachable code providing zero protection
- **Priority:** Fix before deployment -- this defeats the purpose of AC-1 and AC-2

#### BUG-6: Overall test coverage far below spec targets
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Run `npm run test:coverage`
  2. Observe: overall 5.2% statement coverage
  3. `lib/athletes/` -- 0%, `lib/feedback/` -- 0%, `lib/teams/` -- 0%
  4. Most hooks (5 of 6) -- 0% coverage
  5. Spec target: "Utilities & Validierung: 90%+, Custom Hooks: 80%+, Components: 60%+"
- **Priority:** Fix in next sprint -- the tested files have good coverage, but major business logic areas are untested

#### BUG-7: No GitHub branch protection rules
- **Severity:** Medium
- **Steps to Reproduce:**
  1. CI/CD workflows (`ci.yml`, `e2e.yml`) exist and define checks
  2. However, no branch protection rules gate merging on these checks passing
  3. Expected: PR to `main` cannot be merged if CI fails (Phase 4 AC: "CI blockiert Merge bei fehlgeschlagenen Tests")
  4. Actual: Merging is not gated -- CI runs but failure does not prevent merge
- **Priority:** Fix before deployment -- configure GitHub branch protection requiring CI status checks

#### BUG-8: Rate limiting on validate-email is per-instance only
- **Severity:** Low
- **Steps to Reproduce:**
  1. Rate limit uses in-memory Map that resets on cold start
  2. On Vercel serverless, each instance has independent state
  3. An attacker can bypass rate limits by hitting different instances
- **Priority:** Nice to have -- acceptable for MVP, document for future improvement with Upstash/KV

#### BUG-9: Hardcoded test credentials in source code
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Open `tests/e2e/fixtures/auth.setup.ts`
  2. Lines 3-6 contain hardcoded email/password fallbacks
  3. `TestTrainer123!` and `TestAthlete123!` are committed to git in plain text
  4. If these are real Supabase accounts, an attacker with repo access can authenticate
- **Priority:** Fix before deployment -- remove hardcoded password fallbacks, require env vars

#### BUG-10: CI workflow does not post coverage report as PR comment
- **Severity:** Low
- **Steps to Reproduce:**
  1. Phase 4 spec states: "Coverage-Report als PR-Kommentar"
  2. `ci.yml` runs `npm run test` but does not generate or post coverage report
  3. No coverage action (e.g., `romeovs/lcov-reporter-action`) is configured
- **Priority:** Nice to have -- add coverage reporting action to CI

#### BUG-11: E2E only tests Chromium -- no Firefox or Safari
- **Severity:** Low
- **Steps to Reproduce:**
  1. `playwright.config.ts` only defines `chromium` project
  2. Spec and QA checklist require cross-browser testing (Chrome, Firefox, Safari)
  3. No Firefox or WebKit projects exist
- **Priority:** Nice to have for MVP -- add Firefox and WebKit projects when E2E suite is stable

---

### Summary

| Phase | AC Passed | AC Total | Status |
|-------|-----------|----------|--------|
| Phase 1: Sofort-Massnahmen | 5 | 6 | BUG-5 blocks AC-2 |
| Phase 2: Unit Tests | 3 | 4 | Coverage breadth below target |
| Phase 3: E2E Tests | 4 | 4 | Complete |
| Phase 4: CI/CD + Email Tests | 5 | 7 | Branch protection missing, secrets unverifiable |
| **Total** | **17** | **21** | |

- **Acceptance Criteria:** 17/21 passed
- **Bugs Found:** 7 total (0 critical, 1 high, 3 medium, 3 low)
- **Security:** env validation dead code (BUG-5), hardcoded test passwords (BUG-9)
- **Production Ready:** NO
- **Blockers:** BUG-5 (env.ts dead code) and BUG-9 (hardcoded credentials) must be fixed
- **Recommendation:** Fix BUG-5 by wiring `env.ts` into the Supabase client files so all `process.env.X!` usages are replaced with `env.X`. Fix BUG-9 by removing hardcoded password fallbacks. Fix BUG-7 by configuring GitHub branch protection. After these 3 fixes, PROJ-16 can be considered production-ready.

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

### Unit Tests für E-Mail-Plausibilitätsprüfung (PROJ-13 Enhancement 2) -- DONE
- [x] `src/lib/validation/email.test.ts` -- 17 tests (all passing)
  - Gültiges Format + existierender MX-Record -> `{ valid: true }`
  - Gültiges Format + nicht-existenter Domain -> `{ valid: false, reason: "no_mx_record" }`
  - Ungültiges Format -> `{ valid: false, reason: "invalid_format" }`
  - DNS-Timeout -> `{ valid: true }` (fail-open)
  - Domain mit A-Record aber ohne MX -> `{ valid: true }` (Fallback)
  - Leerer String, nur Whitespace -> `{ valid: false, reason: "invalid_format" }`
  - Caching, edge cases, empty MX array

### Integration Tests -- DONE
- [x] `src/app/api/validate-email/route.test.ts` -- 10 tests (all passing)
  - POST mit gültiger E-Mail -> 200 + `{ valid: true }`
  - POST mit ungültigem Domain -> 200 + `{ valid: false, reason: "no_mx_record" }`
  - POST ohne Body -> 400
  - Content-Type check -> 400
  - Rate limiting -> 429
  - Method handling (only POST exported)

### E2E Tests (Playwright — Phase 3)
- [ ] `tests/e2e/02-athletes/invite-athlete.spec.ts` — Erweitern:
  - Trainer gibt ungültige Domain ein → Fehlermeldung erscheint inline
  - Trainer zieht Einladung zurück (Withdraw-Button in Unified View) → Card verschwindet
- [ ] `tests/e2e/01-auth/registration.spec.ts` — Erweitern:
  - User gibt ungültige Domain ein → Inline-Warnung, Submit blockiert
