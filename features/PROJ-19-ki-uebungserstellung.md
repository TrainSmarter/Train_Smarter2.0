# PROJ-19: KI-gestützte Übungserstellung

## Status: Deployed
**Created:** 2026-03-21
**Last Updated:** 2026-03-21
**Latest Commit:** 1e30bb7

## Dependencies
- Requires: PROJ-12 (Übungsbibliothek) — nutzt Exercise-Form, Taxonomy, Server Actions
- Requires: PROJ-4 (Authentication) — Trainer-Session + Admin-Flag
- Requires: PROJ-10 (Admin-Bereich) — Admin Settings Seite für Modell-Konfiguration

## Übersicht

KI-gestützte Vorausfüllung von Übungsfeldern: Trainer oder Admin gibt den Übungsnamen ein → auf Knopfdruck füllt die KI alle restlichen Felder vor (Übersetzung, Beschreibung, Muskelgruppen, Equipment, Kategorie). Bereits befüllte Felder werden **niemals überschrieben**.

**Architektur-Prinzip:** Die KI lädt bei jedem Call die aktuelle Taxonomy (Muskelgruppen, Equipment) frisch aus der Datenbank. Wenn der Admin neue Kategorien hinzufügt, sind diese beim nächsten KI-Call automatisch als Optionen verfügbar — ohne Code-Änderung.

### Bestehende Implementierung (Admin-only, vor PROJ-19)
- AI-Suggest Engine: `src/lib/ai/suggest-exercise.ts` (Claude + OpenAI Provider)
- Provider-Abstraktion: `src/lib/ai/providers.ts` (ursprünglich 4 Modelle)
- Admin Settings: `/admin/settings` (Modellauswahl + Test-Panel)
- Sparkles-Button im Exercise-Form (nur für `is_platform_admin`)
- `admin_settings` Tabelle (key-value, RLS-geschützt)
- Env Vars: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` (optional)

### Erweiterung in PROJ-19
- Zugang für **alle Trainer** (nicht nur Admin), steuerbar pro User
- Rate Limiting pro Trainer (Admin-konfigurierbar: Zeitraum + Anzahl)
- Verbrauchsanzeige im Formular
- Einzelfeld-Optimierung mit Undo
- Admin-editierbare Prompt-Templates
- **Claude Opus 4.6** als 5. Modell mit **Extended Thinking** (separater Toggle)
- Per-User KI-Freigabe via `app_metadata.ai_enabled`
- Schutz: Bereits befüllte Felder werden garantiert nicht überschrieben

## User Stories

### Trainer: KI-Vorausfüllung nutzen
- Als Trainer möchte ich beim Erstellen einer Übung den Namen eingeben und per Knopfdruck die restlichen Felder von der KI vorausfüllen lassen, damit ich schneller arbeiten kann
- Als Trainer möchte ich beim Bearbeiten einer bestehenden Übung die KI nutzen können, um leere Felder (z.B. fehlende Beschreibung) nachzufüllen, ohne dass meine bestehenden Eingaben überschrieben werden
- Als Trainer möchte ich ein einzelnes bereits befülltes Feld per KI optimieren lassen (z.B. Beschreibung verbessern), ohne alle anderen Felder zu beeinflussen
- Als Trainer möchte ich eine KI-Optimierung rückgängig machen können, falls mir der Vorschlag nicht gefällt
- Als Trainer möchte ich sehen wie viele KI-Aufrufe ich in meinem aktuellen Kontingent noch habe, damit ich mein Budget einteilen kann
- Als Trainer möchte ich klar informiert werden wenn mein Kontingent aufgebraucht ist, damit ich weiß warum der Button deaktiviert ist

### Admin: KI-Konfiguration verwalten
- Als Admin möchte ich das KI-Modell zentral wählen (5 Modelle: Claude Haiku 4.5, Claude Sonnet 4.6, Claude Opus 4.6, GPT-4o-mini, GPT-4o), damit ich Kosten und Qualität steuern kann
- Als Admin möchte ich Extended Thinking separat aktivieren können (wie auf claude.ai), damit ich bei kompatiblen Modellen bessere Ergebnisse erhalte
- Als Admin möchte ich das gewählte Modell live testen bevor ich es für alle Trainer freischalte
- Als Admin möchte ich das Trainer-Kontingent konfigurieren (Zeitraum + Anzahl), damit ich die API-Kosten kontrolliere
- Als Admin möchte ich sehen welche API Keys konfiguriert sind, damit ich weiß welche Modelle verfügbar sind
- Als Admin möchte ich die KI-Funktion pro Benutzer einzeln freigeben oder sperren, damit ich kontrolliere wer Zugang hat
- Als Admin möchte ich in der Benutzertabelle sehen welche User KI-Zugang haben
- Als Admin möchte ich die KI-Prompts anpassen können, um die Qualität der Ergebnisse zu optimieren

## Acceptance Criteria

### KI-Vorausfüllung (Trainer + Admin)
- [x] "KI vorausfüllen" Button (Sparkles-Icon, violet) im Übungsformular
- [x] Button ist sichtbar für alle Trainer UND Admin (nicht nur Admin)
- [x] Button ist nur aktiv wenn mindestens ein Name-Feld (DE oder EN) ausgefüllt ist
- [x] Button ist deaktiviert + Tooltip wenn Kontingent aufgebraucht
- [x] Klick → Loading-Spinner → Felder werden vorausgefüllt (1-3 Sekunden)
- [x] **KRITISCH: Bereits befüllte Felder werden NIEMALS überschrieben**
- [x] Vorausgefüllte Felder bekommen kurzes visuelles Highlight (1s teal/violet Border-Flash)
- [x] Success-Toast + Error-Toast mit verständlicher Fehlermeldung
- [x] Funktioniert beim Erstellen (Create) UND beim Bearbeiten (Edit) von Übungen

### Einzelfeld-Optimierung
- [x] Neben jedem Textfeld (Name DE, Name EN, Beschreibung DE, Beschreibung EN) erscheint ein kleines Sparkles-Icon
- [x] Klick auf das Icon optimiert NUR dieses eine Feld per KI
- [x] Eigene Server Action `optimizeExerciseField(fieldName, currentValue, exerciseName, locale)`
- [x] Prompt für die Einzelfeld-Optimierung ist vom Admin anpassbar
- [x] Vorheriger Feldinhalt wird im React State gespeichert (nicht in DB)
- [x] Nach Optimierung erscheint ein "Rückgängig"-Button (Undo-Icon)
- [x] Undo bleibt verfügbar bis zum Speichern
- [x] Einzelfeld-Optimierung zählt als 1 KI-Aufruf (Rate Limit)

### Admin: Prompt-Editor
- [x] Route: `/admin/settings` (erweiterte Sektion)
- [x] Admin kann zwei Prompt-Templates anpassen (Accordion)
- [x] Beide Prompts in `admin_settings` gespeichert
- [x] Default-Prompts hardcoded als Fallback
- [x] Textarea mit Syntax-Hinweisen (Variablen)
- [x] "Auf Default zurücksetzen" Button pro Prompt
- [x] Prompts werden NICHT an den Trainer gezeigt (Admin-only)
- [x] **Max-Länge 5.000 Zeichen** für Custom Prompts (Code Review Fix)

### Benutzer-Freigabe durch Admin
- [x] Admin kann in `/admin/users` (Slide-Over) pro Benutzer KI aktivieren/deaktivieren
- [x] Toggle: "KI-Unterstützung" an/aus (Default: aus)
- [x] Nur freigegebene Benutzer sehen den Sparkles-Button
- [x] Admin hat KI immer aktiviert (kann nicht deaktiviert werden)
- [x] KI-Badge in der Benutzertabelle bei freigegebenen Usern
- [x] Speicherung: `app_metadata.ai_enabled = true/false` via Admin API

### Rate Limiting (Pro Trainer)
- [x] Jeder KI-Aufruf wird pro Trainer gezählt (Tabelle `ai_usage_log`)
- [x] Admin konfiguriert Zeitraum (Tag/Woche/Monat) + Max Aufrufe
- [x] Default: 50 Aufrufe pro Monat
- [x] Verbrauchsanzeige unter dem KI-Button
- [x] Button deaktiviert + Tooltip wenn Limit erreicht
- [x] Zähler wird automatisch zurückgesetzt (query-basiert, kein Cron)
- [x] Admin hat KEIN Limit (unbegrenzt)
- [x] **Optimistisches Logging** — Usage wird VOR dem AI-Call geloggt, bei Fehler Rollback (Code Review Fix)
- [x] **UTC-Zeitzone** für Perioden-Berechnung (kein Drift auf Vercel) (Code Review Fix)
- [x] **Upper Bound** auf Rate-Limit-Query (`.lt(end)`) (Code Review Fix)
- [x] **Batch-Upsert** für Rate-Limit-Config (atomar, kein Partial Failure) (Code Review Fix)

### Modellauswahl & Extended Thinking
- [x] 5 Modelle im Dropdown: Claude 4.5 Haiku (€), Claude Sonnet 4.6 (€€), GPT-4o Mini (€), GPT-4o (€€€), **Claude Opus 4.6 (€€€€)**
- [x] Kosten-Badges (€ bis €€€€) pro Modell
- [x] **Extended Thinking als separater Toggle** (Switch-Komponente)
- [x] Nur für Sonnet 4.6 und Opus 4.6 verfügbar (`supportsThinking` Flag)
- [x] Toggle deaktiviert wenn inkompatibles Modell gewählt
- [x] Hinweis wenn aktiv aber inkompatibles Modell gewählt
- [x] Sofort gespeichert via `setExtendedThinkingSetting`
- [x] Thinking Budget: 10.000 Tokens (suggest-all), 5.000 Tokens (optimize-field)
- [x] Timeouts: 60s (suggest-all), 90s (optimize-field) bei Extended Thinking

### Admin Einstellungen (bestehend, erweitern)
- [x] Route: `/admin/settings`
- [x] KI-Modell Dropdown mit 5 Modellen + Kosten-Badges
- [x] API Key Status Anzeige
- [x] Test-Panel
- [x] Rate-Limit Konfiguration (Zeitraum-Select + Limit-Input + Save Button)
- [x] Prompt-Editor (Accordion mit zwei Prompt-Textareas)
- [x] Extended Thinking Toggle

### Transparenz
- [x] Trainer sieht NICHT welches Modell im Hintergrund läuft
- [x] Kein "Powered by..." Hinweis
- [x] Admin sieht das Modell in den Einstellungen

### i18n
- [x] Alle neuen Strings in `de.json` + `en.json`
- [x] Neue Keys in `exercises` Namespace (aiSuggest, aiSuggestLoading, aiSuggestSuccess, aiSuggestError, aiSuggestNoName, aiLimitReached, aiUsageCount, etc.)
- [x] Neue Keys in `admin` Namespace (rateLimitTitle, rateLimitPeriod, rateLimitCount, extendedThinkingLabel, extendedThinkingDescription, etc.)

## Edge Cases

1. **Unbekannter Übungsname** → KI gibt ihr Bestes, Trainer korrigiert
2. **KI gibt ungültige UUIDs** → `filterValidUuids` filtert sie heraus
3. **API Key fehlt** → Toast "KI-Dienst momentan nicht verfügbar"
4. **API Timeout** → Standard 15s / Extended Thinking 60-90s, Error wird gefangen
5. **Mehrfach-Klick** → Button disabled bei Loading-State
6. **Teilweise befüllte Felder** → Nur leere Felder werden befüllt
7. **Admin ändert Modell während Call** → Modell wird pro Call frisch gelesen
8. **Admin ändert Rate-Limit** → Neues Limit gilt sofort
9. **Trainer-Account gelöscht** → `ai_usage_log` CASCADE
10. **Mehrere Admins** → Plattformweite Settings, nicht pro Admin
11. **Undo nach Einzelfeld-Optimierung** → React State, nicht DB
12. **Undo nach Speichern** → Nicht möglich, State wird verworfen
13. **Admin deaktiviert KI während Call** → Laufender Call wird fertig, nächster abgelehnt
14. **Admin aktiviert KI** → Sichtbar beim nächsten Seitenaufruf
15. **Limit ist 0** → Button sichtbar aber deaktiviert

## Technical Requirements

### Security
- `suggestExerciseDetails` prüft `is_platform_admin || app_metadata.ai_enabled === true`
- Rate Limiting wird server-seitig geprüft VOR dem KI-Call (nicht client-seitig umgehbar)
- API Keys werden NIE an den Client gesendet (nur Server Actions)
- Trainer kann sich nicht selbst `ai_enabled` setzen (benötigt Admin API + Service Role Key)
- **Input-Sanitization:** `sanitizeForPrompt()` entfernt ALLE Steuerzeichen inkl. `\n`, `\r`, `\t` (Regex `[\x00-\x1F\x7F]`), begrenzt auf 200 Zeichen
- **Prompt-Template-Parameter** werden vor Injection sanitized (`sanitizePromptParam()` in `prompts.ts`)
- **Custom Prompts** max. 5.000 Zeichen (`PROMPT_TOO_LONG` Error)
- **RLS:** Trainer können nur AI-Config-Keys lesen (`ai_model`, `ai_extended_thinking`, `ai_rate_limit_*`), **nicht** Custom Prompts
- **Rate Limit Input** blockiert negative Werte (`onKeyDown` + `Math.max(0, ...)`)
- Rate Limiting **fail-closed** — bei DB-Fehler wird der Call verweigert

### Performance
- KI-Call: 1-3s (Haiku), bis 5s (Sonnet/GPT-4o), bis 60-90s (Opus + Extended Thinking)
- Rate-Limit-Check: einfacher COUNT-Query mit Index `(user_id, created_at)` (< 10ms)
- Zähler-Reset: query-basiert (kein Cron): `COUNT(*) WHERE created_at >= period_start AND created_at < period_end`
- **UTC-Zeitzone** für Perioden-Berechnung (`Date.UTC()`) — kein Drift auf Vercel Serverless

### Correctness
- **Optimistisches Usage-Logging:** `logAiUsage()` wird VOR dem AI-Call aufgerufen, bei Fehler Rollback via `deleteAiUsageEntry()` — verhindert Race Condition bei gleichzeitigen Requests
- **Rate-Limit-Query** hat Upper Bound (`.lt(end.toISOString())`)
- **Batch-Upsert** für Rate-Limit-Config (Period + Count atomar in einem DB-Call)
- **setTimeout-Cleanup** für Highlight-Animation via `useRef` + `useEffect`

### Datenmodell
- `ai_usage_log` Tabelle: `id`, `user_id`, `model_id`, `action_type`, `exercise_name`, `field_name`, `created_at`
- `admin_settings` Keys: `ai_model`, `ai_extended_thinking`, `ai_rate_limit_period`, `ai_rate_limit_count`, `ai_prompt_suggest_all`, `ai_prompt_optimize_field`
- `app_metadata.ai_enabled`: boolean (Default: false)
- Prop-Durchreichung: `page.tsx` → `ExerciseDetailPage` → `ExerciseForm` für `showAiSuggest` + `usageData`

### Zukunftssicherheit
- Prompt lädt Taxonomy dynamisch → neue Kategorien sofort verfügbar
- Provider-Abstraktion → neue Modelle durch Array-Erweiterung hinzufügbar (`supportsThinking` Flag)
- Prompt-Templates Admin-anpassbar → Verhalten ohne Code-Änderung steuerbar
- Extended Thinking als separater Toggle → unabhängig von Modellauswahl

## Datenbankschema

```
ai_usage_log
├── id: uuid (PK, DEFAULT gen_random_uuid())
├── user_id: uuid (FK → auth.users ON DELETE CASCADE, NOT NULL)
├── model_id: text (welches Modell verwendet wurde)
├── action_type: text ("suggest_all" | "optimize_field")
├── exercise_name: text (Input, für Audit)
├── field_name: text (nur bei optimize_field, sonst NULL)
├── created_at: timestamptz (DEFAULT now())

Index: idx_ai_usage_log_user_created ON (user_id, created_at DESC)

RLS:
- SELECT: Trainer liest nur eigene Einträge (auth.uid() = user_id)
- SELECT: Admin liest alle (is_platform_admin())
- INSERT: Authentifizierte User können eigene Einträge erstellen (auth.uid() = user_id)
- DELETE: Für Rollback bei fehlgeschlagenem AI-Call (auth.uid() = user_id)
- Kein UPDATE — Audit-Trail ist append-only
```

Admin Settings Erweiterung (bestehende Tabelle):
```
admin_settings Keys:
- 'ai_model': "claude-haiku-4-5-20251001" (Default)
- 'ai_extended_thinking': false (Default)
- 'ai_rate_limit_period': "month" | "week" | "day"
- 'ai_rate_limit_count': 50
- 'ai_prompt_suggest_all': Custom System-Prompt (max 5000 Zeichen)
- 'ai_prompt_optimize_field': Custom Field-Prompt (max 5000 Zeichen)

RLS:
- Admin: Full CRUD
- Trainer: SELECT nur auf ai_model, ai_extended_thinking, ai_rate_limit_period, ai_rate_limit_count
- Trainer: KEIN Zugriff auf Custom Prompts (werden via Server Actions mit Admin-Verifikation gelesen)
```

User-Metadaten:
```
app_metadata.ai_enabled: boolean (default: false)
— Gesetzt via Admin API (auth.admin.updateUserById)
— Admin hat immer Zugang (ai_enabled wird nicht geprüft wenn is_platform_admin)
```

## KI-Modelle

| Modell | ID | Provider | Kosten | Extended Thinking |
|---|---|---|---|---|
| Claude 4.5 Haiku | claude-haiku-4-5-20251001 | Anthropic | € | Nein |
| Claude Sonnet 4.6 | claude-sonnet-4-6-20250514 | Anthropic | €€ | Ja |
| GPT-4o Mini | gpt-4o-mini | OpenAI | € | Nein |
| GPT-4o | gpt-4o | OpenAI | €€€ | Nein |
| Claude Opus 4.6 | claude-opus-4-6-20250620 | Anthropic | €€€€ | Ja |

**Extended Thinking API-Details:**
- Separater Admin-Toggle (nicht ans Modell gebunden)
- Nur bei Anthropic-Modellen mit `supportsThinking: true` wirksam
- System-Prompt wird in User-Message integriert (API-Anforderung)
- `tool_choice: "auto"` statt forced (API-Anforderung bei Thinking)
- Thinking Budget: 10.000 Tokens (suggest-all), 5.000 Tokens (optimize-field)
- Timeouts: 60s / 90s (statt Standard 15s / 10s)

## Abgrenzung
- PROJ-12 = Übungsbibliothek CRUD (Erstellen, Bearbeiten, Löschen, Suche, Filter)
- PROJ-19 = KI-Unterstützung (AI-Suggest, Rate Limiting, Admin-Konfiguration, Extended Thinking)
- Die bestehende AI-Implementierung (Admin-only) wird in PROJ-19 erweitert, nicht in PROJ-12

---

## Tech Design (Solution Architect)
_Erstellt: 2026-03-21_

### A) Komponentenstruktur

```
Übungsformular (exercise-form.tsx — ERWEITERT)
├── KI Toolbar
│   ├── Sparkles Icon + Beschreibung
│   ├── "KI vorausfüllen" Button (mit Tooltip bei Rate Limit)
│   └── Verbrauchsanzeige ("3 von 50 Aufrufen" / "Unbegrenzt (Admin)")
│
├── Name DE Input
│   └── FieldAiActions: Sparkles Mini-Button + Undo-Button
├── Name EN Input
│   └── FieldAiActions: Sparkles Mini-Button + Undo-Button
├── Beschreibung DE Textarea
│   └── FieldAiActions: Sparkles Mini-Button + Undo-Button
├── Beschreibung EN Textarea
│   └── FieldAiActions: Sparkles Mini-Button + Undo-Button
│
├── Kategorie, Muskelgruppen, Equipment (unverändert)
└── Actions (Abbrechen / Speichern — Speichern löscht Undo-State)


Admin Settings (admin-settings-page.tsx — ERWEITERT)
├── KI-Modell Sektion
│   ├── Modell-Dropdown (5 Modelle, nach Provider gruppiert)
│   ├── Kosten-Badge pro Modell (€ bis €€€€)
│   ├── Warning wenn API Key fehlt
│   ├── Speichern Button
│   ├── Extended Thinking Toggle (Switch)
│   │   ├── Beschreibung + Verfügbarkeitshinweis
│   │   └── Deaktiviert wenn Modell kein Thinking unterstützt
│   └── API Key Status Card (Anthropic + OpenAI)
│
├── Rate-Limit Sektion
│   ├── Zeitraum Select (Tag / Woche / Monat)
│   ├── Max Aufrufe Input (0-10000, negative blockiert)
│   └── Speichern Button
│
├── Test-Panel
│   ├── Übungsname Input + Test Button
│   └── Ergebnis-Anzeige (Name, Typ, Beschreibungen, Muskelgruppen, Equipment)
│
└── Prompt-Editor Sektion (Accordion)
    ├── "System-Prompt: Alle Felder" + Variablen-Hinweis + Save + Reset
    └── "System-Prompt: Einzelfeld" + Variablen-Hinweis + Save + Reset


Admin User Slide-Over (user-detail-slide-over.tsx — ERWEITERT)
└── Toggle "KI-Unterstützung" an/aus (Admin kann eigene nicht deaktivieren)

Admin Users Table (users-table.tsx — ERWEITERT)
└── KI-Badge (Sparkles-Icon + "KI"/"AI") bei freigegebenen Usern
```

### B) Datenmodell

Siehe Abschnitt "Datenbankschema" oben.

### C) Tech-Entscheidungen

| Entscheidung | Gewählt | Warum |
|---|---|---|
| Rate-Limit-Zähler | Query-basiert (`COUNT WHERE created_at >= start AND < end`) | Kein Cron nötig, UTC-basiert, <10ms mit Index |
| Race Condition | Optimistisches Logging + Rollback | Usage wird VOR dem AI-Call geloggt, bei Fehler gelöscht |
| Undo-State | React State (`Map<fieldName, previousValue>`) + Ref-Cleanup | Temporär bis Speichern, kein Memory Leak |
| Per-User AI Toggle | `app_metadata.ai_enabled` | Feature-Flag in Auth-Metadaten, server-seitig sofort prüfbar |
| Prompt-Templates | `admin_settings` Key-Value (max 5000 Zeichen) | Wiederverwendung bestehender Tabelle, Admin-only RLS |
| Einzelfeld-Optimierung | Eigene Server Action `optimizeExerciseField` | Leichtgewichtiger Prompt, weniger Tokens, schnellere Antwort |
| Custom vs Default Prompts | Hardcoded Default + Optional Override | System funktioniert ohne Custom-Prompt |
| Verbrauchsanzeige | Server-seitig berechnet, als Prop durchgereicht | `getAiUsageData()` → `{ used, limit, periodEnd }` |
| Authorization | Doppelt: Client (Button) + Server (Action) | Nicht umgehbar |
| Extended Thinking | Separater Toggle, nicht ans Modell gebunden | Flexibel: Admin kann Thinking für jedes kompatible Modell ein/ausschalten |
| Prompt-Sanitization | Alle Control Chars (`\x00-\x1F\x7F`) + 200 Zeichen Limit | Verhindert Prompt Injection inkl. Newlines |
| Timezone | UTC (`Date.UTC()`) für alle Perioden-Berechnungen | Kein Drift auf Vercel Serverless |
| Rate-Limit Config | Batch-Upsert (ein DB-Call für Period + Count) | Atomar, kein Partial Failure |

### D) Abhängigkeiten

Keine neuen Pakete nötig:
- `@anthropic-ai/sdk`, `openai` (AI Provider)
- `sonner` (Toasts), `lucide-react` (Sparkles, Undo2 Icons)
- `zod` (Validierung)

### E) Implementierte Dateien

**Neue Dateien:**
- `src/lib/ai/providers.ts` — Modell-Registry (5 Modelle), Typen, Helpers
- `src/lib/ai/suggest-exercise.ts` — AI-Suggest mit Tool Use (Anthropic) / Function Calling (OpenAI) + Extended Thinking
- `src/lib/ai/optimize-field.ts` — Einzelfeld-Optimierung (leichtgewichtiger Prompt)
- `src/lib/ai/prompts.ts` — Custom-Prompt CRUD, Taxonomy-Injection, Template-Variablen
- `src/lib/ai/prompt-defaults.ts` — Hardcoded Default-Prompts, CustomPrompts Interface
- `src/lib/ai/usage.ts` — Rate Limiting (UTC-Perioden, fail-closed, optimistisches Logging + Rollback)
- `src/lib/ai/usage-types.ts` — TypeScript Types für Rate Limiting
- `src/lib/ai/ai-invariants.test.ts` — 103 Invariant-Tests
- `supabase/migrations/20260321100000_proj19_ai_usage_log.sql` — ai_usage_log Tabelle
- `supabase/migrations/20260321200000_proj19_admin_settings_trainer_read.sql` — Trainer-RLS (nur Config-Keys)
- `supabase/migrations/20260321300000_fix_admin_settings_trainer_rls.sql` — RLS-Tightening (Prompt-Keys entfernt)

**Erweiterte Dateien:**
- `src/lib/exercises/actions.ts` — `suggestExerciseDetails`, `optimizeExerciseField`, `isAiAuthorized`
- `src/lib/admin/actions.ts` — `toggleUserAiAccess`
- `src/lib/admin/settings-actions.ts` — `getExtendedThinkingSetting`, `setExtendedThinkingSetting`, `getRateLimitConfigAdmin`, `setRateLimitConfig`
- `src/lib/admin/types.ts` — `aiEnabled` Feld in AdminUser
- `src/lib/admin/queries.ts` — `aiEnabled` Mapping
- `src/components/exercises/exercise-form.tsx` — AI Toolbar, FieldAiActions, Undo, Verbrauchsanzeige
- `src/components/exercises/exercise-detail-page.tsx` — `showAiSuggest` + `usageData` Props
- `src/components/exercises/exercise-library-page.tsx` — `asChild` Fix (kein `iconLeft` mit `asChild`)
- `src/components/admin/admin-settings-page.tsx` — Rate-Limit Config, Prompt-Editor, Extended Thinking Toggle
- `src/components/admin/user-detail-slide-over.tsx` — AI Toggle pro User
- `src/components/admin/users-table.tsx` — KI-Badge Spalte
- `src/components/ui/button.tsx` — `asChild` Fix (keine Icons bei Slot-Rendering)
- `src/components/nav-main.tsx` — Tooltip-Fix (kein `tooltip` Prop bei `CollapsibleTrigger asChild`)
- `src/app/[locale]/(protected)/training/exercises/new/page.tsx` — AI Auth Check + Usage Data
- `src/app/[locale]/(protected)/training/exercises/[id]/page.tsx` — AI Auth Check + Usage Data
- `src/app/[locale]/(protected)/admin/settings/page.tsx` — Extended Thinking + Rate Limit Props

---

## QA Test Results

### Initial QA (2026-03-21)
**Build:** PASS | **Tests:** 1067/1067 | **AC:** 31/33 | **Bugs:** 4

### QA Round 1 — Bugs Found & Fixed

| Bug | Severity | Issue | Fix |
|-----|----------|-------|-----|
| BUG-1 | High | RLS blockiert Trainer-Reads auf `admin_settings` | Migration: SELECT-Policy für authentifizierte User auf AI-Config-Keys |
| BUG-2 | Medium | Rate Limit fail-open bei DB-Fehler | `checkRateLimit()` gibt `allowed: false` zurück |
| BUG-3 | Low | Keine Prompt-Injection-Sanitization | `sanitizeForPrompt()` mit Control-Char-Regex + 200-Zeichen-Limit |
| BUG-4 | Low | Rate-Count-Input erlaubt negative Werte | `onKeyDown` blockiert `-`, `.`, `e`, `E` + `Math.max(0, ...)` |

### QA Round 2 — Re-Test
**Build:** PASS | **Tests:** 1067/1067 | **AC:** 33/33 | **Bugs:** 0/4 offen | **Production Ready:** JA

### Post-Deploy Bugfix — React.Children.only

| Bug | Severity | Issue | Fix |
|-----|----------|-------|-----|
| BUG-5 | Critical | `Button asChild` + `iconLeft`/`iconRight` rendert `undefined` Siblings → Radix Slot crasht | Icons bei `asChild` übersprungen (nur `children`) |
| BUG-6 | Critical | `NavMain CollapsibleTrigger asChild` + `SidebarMenuButton tooltip` → Tooltip-Wrapper hat mehrere Children | `tooltip` Prop entfernt von Collapsible-Section-Headers |
| BUG-7 | Medium | `exercise-library-page` nutzt `Button asChild iconLeft={...}` | Icon in `<Link>` verschoben statt `iconLeft` Prop |
| BUG-8 | Medium | Bedingte `TooltipContent` in `exercise-form` → Radix wirft wenn `isRateLimited` false | Aufgeteilt in zwei Branches: Tooltip wenn rate-limited, plain Button sonst |

### Code Review — 10 Findings Fixed

| # | Finding | Severity | Fix |
|---|---------|----------|-----|
| 1 | Sanitization entfernt keine Newlines | Medium | Regex `[\x00-\x1F\x7F]` (alle Control Chars) |
| 2 | Rate-Limit-Query fehlt End-Bound | Low | `.lt("created_at", end.toISOString())` hinzugefügt |
| 3 | Lokale Timezone für Perioden-Berechnung | Medium | `Date.UTC()` statt `setHours(0,0,0,0)` |
| 4 | Race Condition: Rate-Limit-Check + AI-Call nicht atomar | High | Optimistisches Logging VOR Call, Rollback bei Fehler |
| 5 | Memory Leak: setTimeout ohne Cleanup | Medium | `useRef` + `useEffect` Cleanup |
| 6 | Partial Failure: Rate-Limit Period + Count als 2 Upserts | Medium | Batch-Upsert (ein DB-Call) |
| 7 | Prompt-Template-Params nicht sanitized | High | `sanitizePromptParam()` für alle 4 Parameter |
| 8 | Custom Prompts ohne Längenbegrenzung | Medium | `MAX_PROMPT_LENGTH = 5000` |
| 9 | Trainer können Custom Prompts via RLS lesen | Medium | Prompt-Keys aus Trainer-Policy entfernt |
| 10 | Optimize-Field Thinking Timeout zu kurz (45s) | Low | Erhöht auf 90s |

### Final Test Status
**Build:** PASS | **Tests:** 1170/1170 (103 neue AI-Invariant-Tests) | **Bugs:** 0 offen

---

## Deployment

- **Production URL:** https://www.train-smarter.at
- **Deployed:** 2026-03-21
- **Latest Commit:** 1e30bb7
- **Tag:** v1.8.0-PROJ-19

### Migrations Applied
1. `20260321000000_admin_settings.sql` — admin_settings Tabelle (PROJ-12)
2. `20260321100000_proj19_ai_usage_log.sql` — ai_usage_log Tabelle + RLS + Index
3. `20260321200000_proj19_admin_settings_trainer_read.sql` — Trainer-RLS (nur Config-Keys, keine Prompts)
4. `20260321300000_fix_admin_settings_trainer_rls.sql` — RLS-Tightening (Live-Update)

### Env Vars (Vercel Dashboard)
- `ANTHROPIC_API_KEY` — Claude API Key (console.anthropic.com)
- `OPENAI_API_KEY` — OpenAI API Key (optional)
- Mindestens einer muss gesetzt sein

### API-Kosten Orientierung (pro Call)
| Modell | ~Kosten/Call |
|---|---|
| Haiku 4.5 | ~$0.001 |
| Sonnet 4.6 | ~$0.01 |
| GPT-4o-mini | ~$0.001 |
| GPT-4o | ~$0.05 |
| Opus 4.6 | ~$0.10 |
| Opus 4.6 + Thinking | ~$0.30-0.50 |

### Hinweis: Claude Pro/Max Mitgliedschaft
Die Claude Pro/Max Mitgliedschaft (claude.ai) ist NICHT für die API nutzbar. Die API ist ein separates Produkt mit eigenem Billing über console.anthropic.com (Prepaid-Modell).
