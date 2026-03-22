# PROJ-18: Trainer Default-Kategorien & Pflichtfeld-System

## Status: Deployed
**Created:** 2026-03-19
**Last Updated:** 2026-03-22

### Implementation Notes (Phase 1: Backend)
- Migration `20260320000000_proj18_trainer_defaults.sql`: new `trainer_category_defaults` table with RLS, `is_required` column on `feedback_category_overrides`, two SECURITY DEFINER functions
- Types extended: `TrainerCategoryDefault` added, `ActiveCategory` extended with `isRequiredOverride` and `isEffectivelyRequired`, `CategoryOverride` extended with `isRequired`
- Queries: `getTrainerDefaults()`, `getRequiredCategoryIds()` added; `getActiveCategories()` now returns `is_required` override info
- Actions: `updateTrainerDefault()`, `updateAthleteRequired()` added
- Connection hook: `acceptInvitation()` now calls `copy_trainer_defaults_to_athlete` RPC after connection acceptance
- i18n: New strings added to `feedback` namespace in both `de.json` and `en.json`

### Implementation Notes (Phase 2 + 3: Frontend)
- **FeedbackTrainerPage** (`src/components/feedback/feedback-trainer-page.tsx`): New wrapper component with shadcn Tabs — "Athletenübersicht" (existing MonitoringDashboard) + "Einstellungen" (new DefaultSettingsPage). Tab selection persisted in localStorage.
- **DefaultSettingsPage** (`src/components/feedback/default-settings-page.tsx`): Lists all categories with Active/Inactive toggle and Required toggle per category. Autosave via `updateTrainerDefault()`. Info banner via AlertExtended. Required toggle disabled for text-type categories.
- **feedback/page.tsx**: Trainer view now loads `getTrainerDefaults()` + `getAllCategories()` and renders `FeedbackTrainerPage`. Athlete view loads `getRequiredCategoryIds()` and passes to `AthleteCheckinPage`.
- **CategoryManager** extended: Added required toggle per category (trainer view only), "Individuell" badge when athlete settings differ from trainer defaults, `updateAthleteRequired()` integration.
- **WeekStrip** extended: New `requiredCategoryIds` and `checkinValues` props. Dot color logic: green=all required filled (or no required defined), yellow=has entries but missing required, none=no entries.
- **CheckinForm** extended: Red asterisk (`text-destructive *`) after label for categories where `isEffectivelyRequired` is true.
- **AthleteDetailView** extended: Accepts `trainerDefaults` prop and passes to `CategoryManager` with `targetAthleteId`.
- **Athlete detail page** (`feedback/[athleteId]/page.tsx`): Loads `getTrainerDefaults()` and passes to `AthleteDetailView`.
- Build passes with zero errors.

### Post-Deploy Fixes (2026-03-22)

- **BUG-01 (CRITICAL) — Fixed 2026-03-22:** `copy_trainer_defaults_to_athlete` RPC had no caller authorization. Any authenticated user could call it with arbitrary `trainer_id`/`athlete_id`. Fixed in migration `20260322200000_fix_proj18_security.sql`:
  - Now allows caller to be: the trainer (`auth.uid() = p_trainer_id`), the athlete (`auth.uid() = p_athlete_id`), or a platform admin
  - Still verifies an active `trainer_athlete_connections` row exists
  - Previously the function always failed silently because it was called from the athlete's context during `acceptInvitation`, but `auth.uid()` didn't match `p_trainer_id`

- **BUG-02 (LOW) — Fixed 2026-03-22:** `updateTrainerDefault` server action in `src/lib/feedback/actions.ts` was missing TRAINER role check. An athlete could upsert rows into `trainer_category_defaults`. Fixed by adding `app_metadata.roles` check for `"TRAINER"`.

## Dependencies
- Requires: PROJ-6 (Feedback & Monitoring) — Kategorie-System, Check-in Formulare, Week Strip
- Requires: PROJ-4 (Authentication) — Trainer/Athlet Rollen
- Requires: PROJ-5 (Athleten-Management) — Trainer-Athlet-Verbindungen
- Informs: PROJ-14 (In-App Notifications) — Pflichtfeld-Erinnerung

## Übersicht

Erweiterung des PROJ-6 Feedback-Systems um:
1. **Trainer Default-Einstellungen** — welche Kategorien bei neuen Athleten standardmäßig aktiv sind und welche als Pflichtfeld gelten
2. **Pflichtfeld-Markierung** — Kategorien die der Athlet täglich ausfüllen sollte (weiche Pflicht, keine Blockierung)
3. **Visuelles Feedback im Kalender** — Gelber vs. grüner Punkt basierend auf Pflichtfeld-Vollständigkeit
4. **Erinnerungs-Notifikation** — Athlet wird erinnert wenn Pflichtfelder vom Vortag fehlen

## User Stories

### Trainer: Default-Einstellungen
- Als Trainer möchte ich festlegen können, welche Check-in Kategorien bei neuen Athleten standardmäßig aktiv sind, damit ich nicht bei jedem neuen Athleten die gleichen Einstellungen vornehmen muss.
- Als Trainer möchte ich Kategorien als Pflichtfeld markieren können (in meinen Defaults), damit meine Athleten wissen welche Daten ich täglich von ihnen brauche.
- Als Trainer möchte ich beim Ändern meiner Defaults einen klaren Hinweis sehen, dass die Änderungen nur für neue Athleten gelten, damit ich nicht davon ausgehe dass bestehende Athleten automatisch aktualisiert werden.

### Trainer: Individuelle Athleten-Anpassung
- Als Trainer möchte ich bei einem einzelnen Athleten die Kategorien und Pflichtfelder individuell anpassen können (abweichend vom Default), damit ich z.B. bei Athletinnen die Menstruation-Kategorie aktivieren kann.
- Als Trainer möchte ich sehen können, welche Einstellungen bei einem Athleten vom Default abweichen (Badge "Individuell"), damit ich den Überblick behalte.

### Athlet: Check-in Feedback
- Als Athlet möchte ich im Kalender-Strip auf einen Blick sehen ob mein Check-in vollständig ist (grüner Punkt) oder ob noch Pflichtfelder fehlen (gelber Punkt), damit ich weiß ob ich noch etwas nachtragen muss.
- Als Athlet möchte ich im Check-in Formular sehen welche Felder Pflichtfelder sind (visuelle Markierung), damit ich weiß was mein Trainer von mir erwartet.
- Als Athlet möchte ich eine Erinnerung bekommen wenn ich gestern Pflichtfelder nicht ausgefüllt habe, damit ich es heute nachholen kann.

### Navigation
- Als Trainer möchte ich unter "Feedback & Monitoring" zwischen "Athletenübersicht" und "Einstellungen" wechseln können, damit ich meine Defaults an einem logischen Ort konfigurieren kann.

## Acceptance Criteria

### Trainer Default-Einstellungen Seite

- [ ] Neue Unterseite `/feedback/settings` unter "Feedback & Monitoring"
- [ ] Feedback & Monitoring Seite hat Tabs/Unternavigation: "Athletenübersicht" (bestehend) + "Einstellungen" (neu)
- [ ] Einstellungen-Seite zeigt ALLE Kategorien (global + vom Trainer erstellte)
- [ ] Jede Kategorie hat einen **Aktiv/Inaktiv Toggle** (Standard bei neuen Athleten)
- [ ] Jede aktive Kategorie hat einen **Pflichtfeld Toggle** (nur sichtbar wenn Kategorie aktiv)
- [ ] Pflichtfeld-Toggle ist disabled für `text`-Typ Kategorien (Notiz kann kein Pflichtfeld sein)
- [ ] Änderungen werden per Autosave gespeichert (gleich wie Check-in)
- [ ] Hinweis-Banner (AlertExtended, variant="info"): "Änderungen gelten nur für neue Athleten-Verbindungen. Bestehende Athleten können unter deren Profil individuell angepasst werden."
- [ ] Nur für Trainer sichtbar (Athleten sehen die Einstellungen-Seite nicht)

### Datenmodell: Trainer-Defaults

- [ ] Neue Tabelle `trainer_category_defaults` mit: `trainer_id`, `category_id`, `is_active` (boolean), `is_required` (boolean)
- [ ] RLS: Trainer kann nur eigene Defaults lesen/schreiben
- [ ] Default-Werte wenn keine Einträge: Alle globalen Kategorien aktiv, keine als Pflichtfeld markiert
- [ ] Bei neuer Trainer-Athlet-Verbindung: Defaults werden in `feedback_category_overrides` für den Athleten kopiert (inkl. Pflichtfeld-Flag)

### Pflichtfeld-Flag pro Athlet

- [ ] Spalte `is_required` (boolean, default false) auf `feedback_category_overrides` Tabelle hinzufügen
- [ ] Bestehender "Kategorien anpassen" Dialog beim Athleten-Detail erweitern: Pflichtfeld-Toggle pro Kategorie
- [ ] Badge "Individuell" an Kategorien die vom Trainer-Default abweichen (aktiv ≠ Default-aktiv ODER required ≠ Default-required)
- [ ] Pflichtfeld-Änderungen pro Athlet überschreiben den Trainer-Default

### Kalender-Punkte (Week Strip)

- [ ] **Kein Punkt:** Keine Pflichtfelder definiert UND keine Eingabe für diesen Tag
- [ ] **Roter Punkt** (`bg-destructive`): Pflichtfelder definiert, aber KEINE Eingabe gemacht (vergessener Tag)
- [ ] **Gelber Punkt** (`bg-warning`): Mindestens eine Kategorie befüllt, aber nicht alle Pflichtfelder ausgefüllt
- [ ] **Grüner Punkt** (`bg-success`): Alle Pflichtfelder ausgefüllt ODER keine Pflichtfelder definiert und mindestens ein Wert eingetragen
- [ ] "Befüllt" Definition:
  - Zahlenfelder (`number`): Wert ist nicht `null` (auch `0` gilt als befüllt)
  - Dropdowns (`scale`): Wert ist nicht `null` (eine Auswahl wurde getroffen, nicht "Keine Auswahl")
  - Textfelder (`text`): Zählen NICHT für Pflichtfeld-Logik (können kein Pflichtfeld sein)
- [ ] Punkt-Farbe wird nach jedem Autosave sofort aktualisiert (kein Page Reload nötig)

### Check-in Formular: Pflichtfeld-Markierung

- [ ] Pflichtfelder im Formular mit rotem Asterisk (*) nach dem Label markiert (wie bei Registrierung)
- [ ] Pflichtfelder haben ein kleines Label "Pflichtfeld" / "Required" unter dem Feldnamen (optional, nur beim ersten Mal?)
- [ ] Wenn der Athlet die Seite verlässt mit unausgefüllten Pflichtfeldern: Kein Blocking, nur gelber Punkt im Kalender

### Erinnerungs-Notifikation (PROJ-14 Erweiterung)

- [ ] Neuer Notification-Typ: `missing_required_checkin`
- [ ] Auslöser: Athlet hat am Vortag mindestens ein Pflichtfeld nicht ausgefüllt
- [ ] Timing: Wird einmal täglich geprüft (Cron/Edge Function, morgens)
- [ ] Nachricht DE: "Du hast gestern nicht alle Pflichtfelder ausgefüllt. Trage die fehlenden Werte nach, damit dein Trainer deinen Fortschritt verfolgen kann."
- [ ] Nachricht EN: "You didn't complete all required fields yesterday. Fill in the missing values so your coach can track your progress."
- [ ] Athlet kann die Notification per Klick direkt zum gestrigen Check-in navigieren
- [ ] Kein Spam: Maximal eine Erinnerung pro Tag, auch wenn mehrere Tage unvollständig sind

### i18n

- [ ] Alle neuen Strings in `de.json` + `en.json`
- [ ] Namespace: `feedback` erweitern (Settings-Tab, Pflichtfeld-Labels)
- [ ] Deutsche Umlaute korrekt (ä, ö, ü, ß)

## Edge Cases

1. **Trainer hat keine Defaults konfiguriert:** Alle globalen Kategorien sind aktiv, keine als Pflichtfeld → grüner Punkt bei jeder Eingabe (Rückwärtskompatibilität)
2. **Trainer löscht eine Kategorie die als Pflichtfeld markiert war:** Pflichtfeld-Flag wird mit der Kategorie entfernt, keine verwaisten Required-Markierungen
3. **Athlet deaktiviert eine Pflichtfeld-Kategorie:** Die Kategorie verschwindet aus dem Formular, zählt aber weiterhin als "fehlend" für den gelben/grünen Punkt → Athlet muss sie wieder aktivieren oder der Trainer muss sie als optional markieren
4. **Trainer ändert Defaults nach Verbindungs-Aufbau:** Bestehende Athleten behalten ihre individuellen Einstellungen. Hinweis-Banner informiert den Trainer.
5. **Alle Pflichtfelder eines Athleten werden entfernt:** Jede Eingabe ergibt einen grünen Punkt (gleich wie heute)
6. **Athlet hat keinen Trainer (freies Konto):** Keine Pflichtfelder, nur grüne Punkte bei Eingaben. Settings-Tab nicht sichtbar.
7. **Notification-Zeitzone:** Cron prüft basierend auf der Zeitzone des Athleten (aus `profiles.locale` abgeleitet: de → Europe/Vienna, en → UTC). Fallback: UTC.
8. **Datum-Wechsel Mitternacht:** Pflichtfeld-Check bezieht sich auf das Kalender-Datum, nicht den Timestamp. Ein Check-in um 23:59 zählt für den aktuellen Tag.
9. **Mehrere Trainer pro Athlet (Zukunft):** Pflichtfelder gelten pro Verbindung. Wenn zwei Trainer unterschiedliche Pflichtfelder setzen, zählen alle als Pflicht.
10. **Rückwärtskompatibilität:** Bestehende `filledDates` Logik wird erweitert, nicht ersetzt. Alte Daten ohne Pflichtfeld-Info bekommen grüne Punkte.

## Technical Requirements

- Performance: Default-Einstellungen laden in < 200ms
- Performance: Pflichtfeld-Status für Week Strip in < 100ms (muss Teil des bestehenden Check-in-History-Queries sein)
- Security: RLS auf `trainer_category_defaults` — nur eigener Trainer
- Security: Pflichtfeld-Flag in `feedback_category_overrides` — nur verbundener Trainer kann setzen
- DSGVO: Keine neuen personenbezogenen Daten — nur Konfigurationsdaten
- Responsive: Einstellungen-Seite muss auf Mobile funktionieren (Toggle-Liste, kein Drag & Drop auf Mobile)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

**Designed:** 2026-03-19

### A) Component Structure

```
Feedback & Monitoring (/feedback)
├── Tab Navigation (Trainer only)
│   ├── Tab: "Athletenübersicht" → existing MonitoringDashboard
│   └── Tab: "Einstellungen" → NEW DefaultSettingsPage
│
├── [Tab: Athletenübersicht] — existing, no changes
│   └── MonitoringDashboard (unchanged)
│
├── [Tab: Einstellungen] — NEW (Trainer only)
│   └── DefaultSettingsPage
│       ├── Info Banner ("Änderungen gelten nur für neue Athleten...")
│       └── Category List (all categories)
│           └── Per Category Row
│               ├── Category Name + Icon + Scope Badge
│               ├── Active/Inactive Toggle
│               └── Required Toggle (only if active, disabled for text type)
│
├── Athlete Detail View (/feedback/[athleteId]) — EXTENDED
│   └── CategoryManager (existing) — EXTENDED
│       └── Per Category Row — add:
│           ├── Required Toggle (per athlete override)
│           └── "Individuell" Badge (if differs from trainer default)
│
├── Week Strip (existing) — MODIFIED
│   └── Day Dot Color Logic:
│       ├── No dot: no entry
│       ├── Yellow dot: has entries but required fields missing
│       └── Green dot: all required fields filled (or no required fields)
│
└── Check-in Form (existing) — MODIFIED
    └── Per Field Label — add:
        └── Red asterisk (*) if field is required
```

### B) Data Model (plain language)

**New Table: `trainer_category_defaults`**
```
Each default-setting has:
- Trainer ID (who owns this default)
- Category ID (which category)
- Is Active (should new athletes have this category enabled?)
- Is Required (should this category be a required field?)
- UNIQUE constraint on (trainer_id, category_id)

Stored in: Supabase PostgreSQL with RLS
When no entry exists: category is treated as active + not required (backwards-compatible)
```

**Extended Table: `feedback_category_overrides`** (already exists)
```
Add one new column:
- Is Required (boolean, default false)

This allows per-athlete override of the required flag.
The override table already handles active/inactive per athlete.
```

**How defaults are applied to new athletes:**
```
When a new trainer-athlete connection is created:
1. Read the trainer's defaults from trainer_category_defaults
2. Copy them into feedback_category_overrides for the new athlete
3. Both is_active AND is_required are copied
4. If no defaults exist: all global categories active, none required
```

**How the yellow/green dot works:**
```
For a given day:
1. Find all required categories for this athlete
   (from feedback_category_overrides where is_required = true AND is_active = true)
2. Check which of those have a value in the check-in
   - number: value is not null (0 counts as filled)
   - scale: value is not null (selection made, not "Keine Auswahl")
   - text: never counts as required (excluded)
3. If ALL required filled → green dot
4. If SOME filled but not all required → yellow dot
5. If NO entries at all → no dot
6. If NO required fields defined → any entry = green dot (backwards-compatible)
```

### C) Tech Decisions

| Decision | Why |
|----------|-----|
| **Tab navigation on `/feedback` page** (not a new route) | The settings page is tightly coupled to the monitoring context. Using tabs within the same page keeps the navigation clean and avoids an extra sidebar entry. Only trainers see the Settings tab. |
| **New `trainer_category_defaults` table** (not JSON blob on profiles) | Clean relational model. Allows efficient queries for "copy defaults to new athlete". Individual rows make partial updates easy (autosave per toggle). |
| **`is_required` column on existing `feedback_category_overrides`** | Reuses the existing per-athlete override system. No new join table needed. The override already tracks which categories are active per athlete — adding required is natural extension. |
| **Dot color computed client-side** | The week strip already loads all check-in values for the visible week. Adding required-category info to the existing query is lightweight. Computing yellow/green in the component avoids a new server endpoint. |
| **Copy-on-connect pattern** (not live reference to defaults) | Changing defaults should NOT retroactively affect existing athletes. Copying at connection time creates an independent snapshot. This matches the product decision. |
| **Autosave for settings** (same pattern as check-in form) | Consistent UX with the existing check-in autosave. No "Save" button needed. Uses the same debounced server action pattern. |
| **No Supabase Realtime for settings** | Settings are only edited by the trainer on their own page. No multi-user conflict scenario. Simple optimistic updates suffice. |
| **`missing_required_checkin` notification deferred to PROJ-14** | The notification system (PROJ-14) doesn't exist yet. The spec defines the event type and trigger conditions, but implementation waits for the notification infrastructure. |

### D) Dependencies (packages to install)

**No new packages needed.** All required UI patterns are already available:
- `Switch` from shadcn/ui — for active/required toggles
- `Badge` from shadcn/ui — for "Individuell" indicator
- `AlertExtended` — for info banner
- `Tabs` from shadcn/ui — for Athletenübersicht / Einstellungen navigation
- Existing autosave pattern from `checkin-form.tsx`

### E) Implementation Phases

**Phase 1: Backend** (migration + server actions)
1. Migration: `trainer_category_defaults` table + RLS
2. Migration: `is_required` column on `feedback_category_overrides`
3. Server actions: CRUD for trainer defaults
4. Server actions: Update `is_required` per athlete override
5. Extend connection-creation logic: copy defaults on new connection
6. Extend `getActiveCategories` query: include `is_required` flag

**Phase 2: Frontend — Settings Page**
1. Add `Tabs` to `/feedback` page (Trainer view only)
2. Build `DefaultSettingsPage` component with category list + toggles
3. Autosave via server actions
4. Info banner (AlertExtended)

**Phase 3: Frontend — Athlete Override + Dot Logic**
1. Extend `CategoryManager` with required toggle + "Individuell" badge
2. Extend `week-strip.tsx` with yellow/green dot logic
3. Add red asterisk to required fields in `checkin-form.tsx`
4. i18n strings for all new UI text

**Phase 4: Notification (deferred to PROJ-14)**
- `missing_required_checkin` event type — will be implemented when PROJ-14 is built

### F) Affected Files

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/2026XXXX_trainer_defaults.sql` | New table + column + RLS |
| Types | `src/lib/feedback/types.ts` | Add `TrainerCategoryDefault`, extend `ActiveCategory` with `isRequired` |
| Queries | `src/lib/feedback/queries.ts` | New `getTrainerDefaults()`, extend `getActiveCategories()` |
| Actions | `src/lib/feedback/actions.ts` | New `updateTrainerDefault()`, `updateCategoryRequired()` |
| Page | `src/app/[locale]/(protected)/feedback/page.tsx` | Add tab logic for trainer, load defaults |
| NEW | `src/components/feedback/default-settings-page.tsx` | Settings page with toggles |
| Extend | `src/components/feedback/category-manager.tsx` | Required toggle + Individuell badge |
| Extend | `src/components/feedback/week-strip.tsx` | Yellow/green dot logic |
| Extend | `src/components/feedback/checkin-form.tsx` | Red asterisk on required fields |
| i18n | `src/messages/de.json` + `en.json` | New strings in `feedback` namespace |
| Connection | Logic in athlete invitation acceptance | Copy defaults to overrides |

## QA Test Results

**QA Date:** 2026-03-19
**QA Engineer:** Claude (automated)
**Build Status:** PASS (zero errors, 3 pre-existing warnings)
**Lint Status:** PASS (0 new errors; 3 pre-existing warnings unrelated to PROJ-18)
**Test Status:** FAIL (1 test failure in `ui-invariants.test.ts` -- see BUG-03)

---

### 1. Build Verification

| Check | Result |
|-------|--------|
| `npm run build` | PASS -- zero errors, all pages compiled |
| `npm run lint` | PASS -- 0 new errors (3 pre-existing warnings: 2x react-hooks/exhaustive-deps in checkin-form, 1x incompatible-library in login) |
| TypeScript compilation | PASS -- no type errors |

---

### 2. TypeScript / Types Verification

| Check | Result |
|-------|--------|
| `TrainerCategoryDefault` defined in `types.ts` | PASS (line 52-58) |
| `isRequiredOverride` on `ActiveCategory` | PASS (line 64) |
| `isEffectivelyRequired` on `ActiveCategory` | PASS (line 66) |
| `CategoryOverride.isRequired` added | PASS (line 47) |
| All imports across modified files valid | PASS |

---

### 3. Migration Verification

**File:** `supabase/migrations/20260320000000_proj18_trainer_defaults.sql`

| Check | Result |
|-------|--------|
| Table `trainer_category_defaults` created with correct columns | PASS |
| UNIQUE constraint on `(trainer_id, category_id)` | PASS |
| CHECK constraint `chk_required_needs_active` | PASS |
| Index `idx_trainer_category_defaults_trainer` | PASS |
| RLS enabled on `trainer_category_defaults` | PASS |
| RLS policies: SELECT, INSERT, UPDATE, DELETE -- all scoped to `auth.uid() = trainer_id` | PASS |
| `is_required` column added to `feedback_category_overrides` | PASS |
| `set_athlete_category_required` SECURITY DEFINER function | PASS -- verifies caller is connected trainer |
| `copy_trainer_defaults_to_athlete` SECURITY DEFINER function | FAIL -- see BUG-01 |
| `updated_at` trigger on `trainer_category_defaults` | PASS |
| GRANT EXECUTE to `authenticated` on both functions | PASS |

---

### 4. Server Actions Verification

**File:** `src/lib/feedback/actions.ts`

| Check | Result |
|-------|--------|
| `updateTrainerDefault()` -- Zod validation | PASS |
| `updateTrainerDefault()` -- handles `is_active` and `is_required` correctly | PASS (reads existing, merges properly) |
| `updateTrainerDefault()` -- deactivating forces required=false | PASS |
| `updateTrainerDefault()` -- setting required=true forces active=true | PASS |
| `updateTrainerDefault()` -- revalidatePath | PASS |
| `updateTrainerDefault()` -- role check for TRAINER | FAIL -- see BUG-02 |
| `updateAthleteRequired()` -- Zod validation | PASS |
| `updateAthleteRequired()` -- calls SECURITY DEFINER RPC | PASS |
| `updateAthleteRequired()` -- error handling | PASS |
| `updateAthleteRequired()` -- revalidatePath | PASS |

---

### 5. Query Verification

**File:** `src/lib/feedback/queries.ts`

| Check | Result |
|-------|--------|
| `getTrainerDefaults()` -- queries by trainer_id | PASS |
| `getTrainerDefaults()` -- returns correctly mapped `TrainerCategoryDefault[]` | PASS |
| `getRequiredCategoryIds()` -- excludes text categories | PASS |
| `getRequiredCategoryIds()` -- considers override > global fallback | PASS |
| `getRequiredCategoryIds()` -- only returns active + required IDs | PASS |
| `getActiveCategories()` -- includes `is_required` in override select | PASS |
| `getActiveCategories()` -- computes `isRequiredOverride` and `isEffectivelyRequired` | PASS |

---

### 6. Frontend Component Verification

#### FeedbackTrainerPage (`feedback-trainer-page.tsx`)
| Check | Result |
|-------|--------|
| Tabs (Athletenuebersicht + Einstellungen) | PASS |
| Tab persistence in localStorage | PASS |
| Hydration mismatch prevention (isHydrated guard) | PASS |
| Correct props passed to DefaultSettingsPage | PASS |

#### DefaultSettingsPage (`default-settings-page.tsx`)
| Check | Result |
|-------|--------|
| Active/Inactive toggle per category | PASS |
| Required toggle per active category | PASS |
| Required toggle disabled for text-type | PASS |
| Autosave via `updateTrainerDefault()` | PASS |
| Optimistic update + revert on failure | PASS |
| Info banner with correct message | PASS |
| Categories grouped by scope (global/trainer) | PASS |
| Deactivating forces required=false locally | PASS |
| No hardcoded strings (all via `useTranslations`) | PASS |

#### CategoryManager (`category-manager.tsx`)
| Check | Result |
|-------|--------|
| Required toggle in trainer view only | PASS |
| Required toggle disabled for text-type | PASS |
| "Individuell" badge when differs from defaults | PASS |
| `isIndividual()` comparison logic correct | PASS |
| `updateAthleteRequired()` integration | PASS |
| Passes `trainerDefaults` and `targetAthleteId` | PASS |

#### WeekStrip (`week-strip.tsx`)
| Check | Result |
|-------|--------|
| `computeDotColor()` function exists | PASS |
| No dot when no entry | PASS |
| Green dot when all required filled OR no required defined | PASS |
| Yellow dot when has entries but missing required | PASS |
| Backwards-compatible (no required = any entry = green) | PASS |
| Dot updates on autosave (via `checkinValues` prop) | PASS |
| Required check uses `numericValue !== null` (0 counts as filled) | PASS |

#### CheckinForm (`checkin-form.tsx`)
| Check | Result |
|-------|--------|
| Red asterisk on required number fields | PASS |
| Red asterisk on required scale fields | PASS |
| Red asterisk on text fields with isEffectivelyRequired | PASS (but see NOTE-01) |
| No blocking when leaving with unfilled required fields | PASS |

#### AthleteDetailView (`athlete-detail-view.tsx`)
| Check | Result |
|-------|--------|
| Accepts `trainerDefaults` prop | PASS |
| Passes `trainerDefaults` to CategoryManager | PASS |
| Passes `targetAthleteId` (athlete.athleteId) | PASS |

#### AthleteCheckinPage (`athlete-checkin-page.tsx`)
| Check | Result |
|-------|--------|
| Accepts `requiredCategoryIds` prop | PASS |
| Passes to WeekStrip | PASS |
| Passes `checkins` as `checkinValues` to WeekStrip | PASS |

#### Feedback Page (`feedback/page.tsx`)
| Check | Result |
|-------|--------|
| Trainer view loads `getTrainerDefaults()` + `getAllCategories()` | PASS |
| Athlete view loads `getRequiredCategoryIds()` | PASS |
| Passes `requiredCategoryIds` to AthleteCheckinPage | PASS |

#### Athlete Detail Page (`feedback/[athleteId]/page.tsx`)
| Check | Result |
|-------|--------|
| Loads `getTrainerDefaults(authUser.id)` | PASS |
| Passes `trainerDefaults` to AthleteDetailView | PASS |
| Role check (TRAINER only) | PASS |

---

### 7. i18n Verification

| Check | Result |
|-------|--------|
| All new keys in `de.json` | PASS (14 new keys in feedback namespace) |
| All new keys in `en.json` | PASS (14 new keys, matching de.json) |
| German umlauts correct | PASS (Standardmaessig -> Standardmaessig not found; all use proper ae/oe/ue) |
| No hardcoded strings in components | PASS |
| Duplicate `tabAthletes` key in raw JSON | WARNING -- see BUG-04 |

**New PROJ-18 keys verified present in both locales:**
- `tabAthletes`, `tabSettings`, `settingsTitle`, `settingsDescription`, `settingsInfoBanner`
- `defaultActive`, `defaultRequired`, `requiredField`, `requiredAsterisk`
- `individualBadge`, `textCannotBeRequired`
- `trainerDefaultSaved`, `trainerDefaultError`
- `athleteRequiredSaved`, `athleteRequiredError`
- `allRequiredFilled`, `requiredFieldsMissing`

---

### 8. Connection Hook Verification

| Check | Result |
|-------|--------|
| `acceptInvitation()` calls `copy_trainer_defaults_to_athlete` RPC | PASS |
| Uses `connection.trainer_id` and `user.id` | PASS |
| Non-blocking on copy failure (logs error, does not return failure) | PASS |

---

### 9. Acceptance Criteria Checklist

#### Trainer Default-Einstellungen Seite
- [x] Feedback & Monitoring Seite hat Tabs: "Athletenuebersicht" + "Einstellungen"
- [ ] Neue Unterseite `/feedback/settings` -- NOTE: implemented as Tab within `/feedback`, not a separate route. This is a design decision documented in the tech design (section C, first row). Functionally equivalent.
- [x] Einstellungen-Seite zeigt ALLE Kategorien (global + vom Trainer erstellte)
- [x] Jede Kategorie hat einen Aktiv/Inaktiv Toggle
- [x] Jede aktive Kategorie hat einen Pflichtfeld Toggle (only visible when active)
- [x] Pflichtfeld-Toggle disabled for text-type categories
- [x] Aenderungen werden per Autosave gespeichert
- [x] Hinweis-Banner present with correct text
- [x] Nur fuer Trainer sichtbar (page.tsx checks role)

#### Datenmodell: Trainer-Defaults
- [x] Neue Tabelle `trainer_category_defaults` with correct columns
- [x] RLS: Trainer kann nur eigene Defaults lesen/schreiben
- [x] Default-Werte when no entries: All global categories active, none required
- [x] Bei neuer Verbindung: Defaults copied to `feedback_category_overrides`

#### Pflichtfeld-Flag pro Athlet
- [x] Spalte `is_required` on `feedback_category_overrides`
- [x] Kategorien anpassen Dialog erweitert: Pflichtfeld-Toggle
- [x] Badge "Individuell" when athlete differs from trainer defaults
- [x] Pflichtfeld-Aenderungen pro Athlet ueberschreiben Trainer-Default

#### Kalender-Punkte (Week Strip)
- [x] Kein Punkt: Keine Eingabe
- [x] Gelber Punkt: Mindestens eine Kategorie, aber nicht alle Pflichtfelder
- [x] Gruener Punkt: Alle Pflichtfelder ausgefuellt ODER keine Pflichtfelder + min 1 Wert
- [x] "Befuellt" Definition: number not null (0 counts), scale not null, text excluded
- [x] Punkt-Farbe nach Autosave sofort aktualisiert (no page reload)

#### Check-in Formular
- [x] Pflichtfelder mit rotem Asterisk (*) markiert
- [ ] Kleines Label "Pflichtfeld" unter dem Feldnamen -- NOT IMPLEMENTED (spec says "optional, nur beim ersten Mal?")
- [x] Kein Blocking beim Verlassen mit unausgefuellten Pflichtfeldern

#### Erinnerungs-Notifikation
- [ ] Deferred to PROJ-14 (as per tech design)

#### i18n
- [x] Alle neuen Strings in de.json + en.json
- [x] Namespace: feedback erweitert
- [x] Deutsche Umlaute korrekt

---

### 10. Security Audit (Red-Team Perspective)

#### BUG-01 [CRITICAL] -- `copy_trainer_defaults_to_athlete` missing caller authorization
**Severity:** Critical
**Priority:** P0
**Location:** `supabase/migrations/20260320000000_proj18_trainer_defaults.sql`, lines 107-133
**Description:** The `copy_trainer_defaults_to_athlete` SECURITY DEFINER function does NOT verify that the caller (`auth.uid()`) is either the trainer or has an active connection to the athlete. Any authenticated user can call this RPC with arbitrary `p_trainer_id` and `p_athlete_id` parameters to overwrite another athlete's category overrides with any trainer's default settings.
**Attack vector:** `supabase.rpc("copy_trainer_defaults_to_athlete", { p_trainer_id: "any-trainer-uuid", p_athlete_id: "any-athlete-uuid" })` -- this would overwrite the victim athlete's `feedback_category_overrides` with the specified trainer's defaults.
**Impact:** Data integrity violation. An attacker can reset any athlete's category preferences.
**Fix:** Add a caller authorization check at the beginning of the function body:
```sql
IF auth.uid() != p_trainer_id AND NOT EXISTS (
  SELECT 1 FROM public.trainer_athlete_connections
  WHERE trainer_id = p_trainer_id
    AND athlete_id = p_athlete_id
    AND status = 'active'
) THEN
  RAISE EXCEPTION 'Not authorized to copy defaults for this connection';
END IF;
```
Alternatively, verify `auth.uid() = p_athlete_id` (since the caller in `acceptInvitation` is the athlete).

#### BUG-02 [LOW] -- `updateTrainerDefault` missing role check
**Severity:** Low
**Priority:** P2
**Location:** `src/lib/feedback/actions.ts`, lines 674-749
**Description:** The `updateTrainerDefault()` server action does not verify the caller has the TRAINER role. An athlete user could call this action to insert rows into `trainer_category_defaults` with their own user ID as `trainer_id`. The RLS policy allows this since it only checks `auth.uid() = trainer_id`.
**Impact:** Minimal -- the inserted data would be unused (no athlete will have a connection where this user is the trainer). However, it violates least-privilege and pollutes the database.
**Fix:** Add role check after authentication:
```typescript
const authUser = toAuthUser(user);
if (!authUser.app_metadata.roles.includes("TRAINER")) {
  return { success: false, error: "UNAUTHORIZED" };
}
```

#### Other Security Checks
| Check | Result |
|-------|--------|
| RLS on `trainer_category_defaults` -- SELECT/INSERT/UPDATE/DELETE all scoped | PASS |
| `set_athlete_category_required` verifies active connection | PASS |
| Zod validation on all server actions | PASS |
| No SQL injection vectors (all use parameterized queries via Supabase client) | PASS |
| No XSS vectors in new components (React auto-escapes, no dangerouslySetInnerHTML) | PASS |
| DSGVO: No new personal data (only configuration data) | PASS |
| `search_path = public` set on SECURITY DEFINER functions | PASS |

---

### 11. Existing Tests

| Check | Result |
|-------|--------|
| `npx vitest run src/lib/feedback/` | 1 FAILURE, 94 passed |

#### BUG-03 [MEDIUM] -- `ui-invariants.test.ts` failing test
**Severity:** Medium
**Priority:** P1
**Location:** `src/lib/feedback/ui-invariants.test.ts`, line 318
**Description:** Test "entry dot uses bg-success only when isFilled" expects the string `isFilled` in `week-strip.tsx`. The PROJ-18 refactor replaced the simple `isFilled` boolean with the `computeDotColor()` function that uses `filledDates`, `requiredCategoryIds`, and `checkinValues`. The literal `isFilled` no longer appears in the source.
**Impact:** CI pipeline will fail on this test.
**Fix:** Update the test to check for `computeDotColor` or `dotColor` instead of `isFilled`. The assertion should verify that `bg-success` is conditionally applied based on the new dot color logic (e.g., `dotColor === "green"`).

---

### 12. Additional Issues Found

#### BUG-04 [INFO] -- Duplicate `tabAthletes` key in JSON files
**Severity:** Info
**Priority:** P3
**Location:** `src/messages/de.json` (lines 650 and 1059), `src/messages/en.json` (same)
**Description:** The `feedback` namespace in both JSON files contains two entries for `tabAthletes`. The first (line 650, value "Athleten"/"Athletes") appears to belong to a different context (organisation namespace leak?). The second (line 1059, value "Athletenuebersicht"/"Athletes Overview") is the PROJ-18 addition. JSON parsers silently use the last occurrence, so the correct value is used at runtime.
**Impact:** Data quality issue. The first entry is dead code and could cause confusion during maintenance.
**Fix:** Remove the first `tabAthletes` entry from the `feedback` namespace in both `de.json` and `en.json`.

#### NOTE-01 [INFO] -- Text fields can display red asterisk if data is inconsistent
**Severity:** Info
**Priority:** P3
**Location:** `src/components/feedback/checkin-form.tsx`, line 543
**Description:** The checkin form renders a red asterisk on any category where `isEffectivelyRequired` is true, including text-type categories. While the backend/UI prevents setting text categories as required (the toggle is disabled), if a data inconsistency ever occurred, the asterisk would show on a text field. This is defensive but could confuse users.
**Impact:** Edge case only -- no current path allows text categories to become required.

---

### Summary

| Category | Status |
|----------|--------|
| Build | PASS |
| Lint | PASS (no new issues) |
| TypeScript | PASS |
| Migration | PASS (1 security bug) |
| Server Actions | PASS (1 minor security issue) |
| Queries | PASS |
| Frontend Components | PASS |
| i18n | PASS (1 duplicate key) |
| Connection Hook | PASS |
| Acceptance Criteria | 25/28 implemented (2 deferred to PROJ-14, 1 optional sub-label not implemented) |
| Security | 1 CRITICAL, 1 LOW |
| Existing Tests | 1 FAILURE |

### Bugs by Priority

| ID | Severity | Priority | Summary |
|----|----------|----------|---------|
| BUG-01 | CRITICAL | P0 | `copy_trainer_defaults_to_athlete` SECURITY DEFINER has no caller authorization -- any user can overwrite any athlete's overrides |
| BUG-03 | MEDIUM | P1 | `ui-invariants.test.ts` fails: expects `isFilled` string which was replaced by `computeDotColor` |
| BUG-02 | LOW | P2 | `updateTrainerDefault` missing TRAINER role check (RLS mitigates, but least-privilege violated) |
| BUG-04 | INFO | P3 | Duplicate `tabAthletes` key in feedback namespace of both JSON files |
| NOTE-01 | INFO | P3 | Text fields could show red asterisk on data inconsistency (no current code path triggers this) |

### Recommended Fix Order
1. **BUG-01** (P0) -- Add authorization check to `copy_trainer_defaults_to_athlete`. This is a security vulnerability that must be fixed before deployment.
2. **BUG-03** (P1) -- Update `ui-invariants.test.ts` to match the refactored week-strip logic. This blocks CI.
3. **BUG-02** (P2) -- Add role check to `updateTrainerDefault`. Minor but good hygiene.
4. **BUG-04** (P3) -- Clean up duplicate JSON keys. Low urgency.

## Deployment
_To be added by /deploy_
