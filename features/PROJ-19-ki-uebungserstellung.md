# PROJ-19: KI-gestützte Übungserstellung

## Status: Planned
**Created:** 2026-03-21
**Last Updated:** 2026-03-21

## Dependencies
- Requires: PROJ-12 (Übungsbibliothek) — nutzt Exercise-Form, Taxonomy, Server Actions
- Requires: PROJ-4 (Authentication) — Trainer-Session + Admin-Flag
- Requires: PROJ-10 (Admin-Bereich) — Admin Settings Seite für Modell-Konfiguration

## Übersicht

KI-gestützte Vorausfüllung von Übungsfeldern: Trainer oder Admin gibt den Übungsnamen ein → auf Knopfdruck füllt die KI alle restlichen Felder vor (Übersetzung, Beschreibung, Muskelgruppen, Equipment, Kategorie). Bereits befüllte Felder werden **niemals überschrieben**.

**Architektur-Prinzip:** Die KI lädt bei jedem Call die aktuelle Taxonomy (Muskelgruppen, Equipment) frisch aus der Datenbank. Wenn der Admin neue Kategorien hinzufügt, sind diese beim nächsten KI-Call automatisch als Optionen verfügbar — ohne Code-Änderung.

### Bestehende Implementierung (Admin-only, bereits deployed)
- AI-Suggest Engine: `src/lib/ai/suggest-exercise.ts` (Claude + OpenAI Provider)
- Provider-Abstraktion: `src/lib/ai/providers.ts` (4 Modelle)
- Admin Settings: `/admin/settings` (Modellauswahl + Test-Panel)
- Sparkles-Button im Exercise-Form (nur für `is_platform_admin`)
- `admin_settings` Tabelle (key-value, RLS-geschützt)
- Env Vars: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` (optional)

### Erweiterung in PROJ-19
- Zugang für **alle Trainer** (nicht nur Admin)
- Rate Limiting pro Trainer (Admin-konfigurierbar)
- Verbrauchsanzeige im Formular
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
- Als Admin möchte ich das KI-Modell zentral wählen (Claude Haiku, Sonnet, GPT-4o-mini, GPT-4o), damit ich Kosten und Qualität steuern kann
- Als Admin möchte ich das gewählte Modell live testen bevor ich es für alle Trainer freischalte
- Als Admin möchte ich das Trainer-Kontingent konfigurieren (Zeitraum + Anzahl), damit ich die API-Kosten kontrolliere
- Als Admin möchte ich sehen welche API Keys konfiguriert sind, damit ich weiß welche Modelle verfügbar sind
- Als Admin möchte ich die KI-Funktion pro Benutzer einzeln freigeben oder sperren, damit ich kontrolliere wer Zugang hat
- Als Admin möchte ich in der Benutzertabelle sehen welche User KI-Zugang haben

## Acceptance Criteria

### KI-Vorausfüllung (Trainer + Admin)
- [ ] "KI vorausfüllen" Button (Sparkles-Icon, violet) im Übungsformular
- [ ] Button ist sichtbar für alle Trainer UND Admin (nicht nur Admin)
- [ ] Button ist nur aktiv wenn mindestens ein Name-Feld (DE oder EN) ausgefüllt ist
- [ ] Button ist deaktiviert + Tooltip wenn Kontingent aufgebraucht
- [ ] Klick → Loading-Spinner → Felder werden vorausgefüllt (1-3 Sekunden)
- [ ] **KRITISCH: Bereits befüllte Felder werden NIEMALS überschrieben:**
  - Name DE/EN: Nur leeres Feld wird befüllt (Übersetzung)
  - Beschreibung DE/EN: Nur leere Textareas werden befüllt
  - Hauptkategorie: Nur wenn auf Default "Kraft" und KI schlägt etwas anderes vor
  - Primäre Muskelgruppen: Nur wenn Array leer ist
  - Sekundäre Muskelgruppen: Nur wenn Array leer ist
  - Equipment: Nur wenn Array leer ist
- [ ] Vorausgefüllte Felder bekommen kurzes visuelles Highlight (1s teal/violet Border-Flash)
- [ ] Success-Toast: "KI-Vorschläge eingefügt — bitte prüfen und anpassen"
- [ ] Error-Toast wenn KI-Call fehlschlägt (mit verständlicher Fehlermeldung)
- [ ] Funktioniert beim Erstellen (Create) UND beim Bearbeiten (Edit) von Übungen

### Einzelfeld-Optimierung
- [ ] Neben jedem Textfeld (Beschreibung DE, Beschreibung EN) erscheint ein kleines Sparkles-Icon
- [ ] Klick auf das Icon optimiert NUR dieses eine Feld per KI (z.B. bessere Formulierung, mehr Detail)
- [ ] Der vorherige Feldinhalt wird gespeichert (im State, nicht in DB)
- [ ] Nach der Optimierung erscheint ein "Rückgängig"-Button (Undo-Icon) neben dem Feld
- [ ] Klick auf Undo stellt den vorherigen Inhalt wieder her
- [ ] Undo ist nur bis zum Speichern der Übung verfügbar (danach wird der neue Wert übernommen)
- [ ] Einzelfeld-Optimierung zählt als 1 KI-Aufruf (Rate Limit)
- [ ] Optimierung funktioniert auch wenn das Feld bereits befüllt ist (bewusstes Überschreiben durch explizite Aktion)

### Benutzer-Freigabe durch Admin
- [ ] Admin kann in `/admin/users` (Slide-Over) pro Benutzer die KI-Funktion aktivieren/deaktivieren
- [ ] Toggle: "KI-Unterstützung" an/aus (Default: aus)
- [ ] Nur Benutzer mit aktivierter KI-Funktion sehen den Sparkles-Button im Formular
- [ ] Admin hat KI immer aktiviert (kann nicht deaktiviert werden)
- [ ] Statusanzeige in der Benutzertabelle: KI-Badge bei freigegebenen Usern
- [ ] Speicherung: `app_metadata.ai_enabled = true/false` via Admin API

### Rate Limiting (Pro Trainer)
- [ ] Jeder KI-Aufruf wird pro Trainer gezählt (Tabelle `ai_usage_log`)
- [ ] Admin konfiguriert in `/admin/settings`:
  - Zeitraum: Tag / Woche / Monat (Select)
  - Max Aufrufe pro Zeitraum: Zahl (z.B. 50)
- [ ] Default: 50 Aufrufe pro Monat
- [ ] Verbrauchsanzeige dezent unter dem KI-Button: "3 von 50 Aufrufen verwendet"
- [ ] Button deaktiviert + Tooltip wenn Limit erreicht: "Dein Kontingent von X Aufrufen ist aufgebraucht. Nächster Reset: [Datum]."
- [ ] Zähler wird automatisch zurückgesetzt nach Ablauf des Zeitraums
- [ ] Admin hat KEIN Limit (unbegrenzt)

### Admin Einstellungen (bestehend, erweitern)
- [ ] Route: `/admin/settings` (bereits vorhanden)
- [ ] KI-Modell Dropdown mit 4 Modellen + Kosten-Badges (bereits vorhanden)
- [ ] API Key Status Anzeige (bereits vorhanden)
- [ ] Test-Panel (bereits vorhanden)
- [ ] **NEU:** Rate-Limit Konfiguration:
  - Zeitraum-Select: Tag / Woche / Monat
  - Limit-Eingabe: Zahl
  - "Speichern" Button
- [ ] **NEU:** Übersicht aktive Trainer + deren aktueller Verbrauch (optional, spätere Iteration)

### Transparenz
- [ ] Trainer sieht NICHT welches Modell im Hintergrund läuft
- [ ] Kein "Powered by..." Hinweis — die KI ist ein nahtloser Teil der App
- [ ] Admin sieht das Modell in den Einstellungen

### i18n
- [ ] Alle neuen Strings in `de.json` + `en.json`
- [ ] Neue Keys im `exercises` Namespace: `aiSuggest`, `aiSuggestLoading`, `aiSuggestSuccess`, `aiSuggestError`, `aiSuggestNoName`, `aiLimitReached`, `aiUsageCount`
- [ ] Neue Keys im `admin` Namespace: `rateLimitTitle`, `rateLimitPeriod`, `rateLimitCount`, `rateLimitDay`, `rateLimitWeek`, `rateLimitMonth`

## Edge Cases

1. **Trainer gibt unbekannten Übungsnamen ein (z.B. "Foobar123")** → KI gibt trotzdem ihr bestes, aber Ergebnis kann ungenau sein. Alle Felder sind editierbar, Trainer korrigiert.
2. **KI gibt UUID zurück die nicht in der Taxonomy existiert** → Server-seitige Validierung filtert ungültige UUIDs heraus (bereits implementiert in `filterValidUuids`).
3. **API Key fehlt für gewähltes Modell** → Server Action gibt "API_KEY_NOT_CONFIGURED" zurück → Toast: "KI-Dienst momentan nicht verfügbar. Bitte den Admin kontaktieren."
4. **API Timeout (>15s)** → Error wird abgefangen → Toast: "KI-Anfrage hat zu lange gedauert. Bitte erneut versuchen."
5. **Trainer drückt KI-Button mehrfach schnell hintereinander** → Button wird beim ersten Klick disabled (Loading-State). Zweiter Klick wird ignoriert.
6. **Trainer hat Felder teilweise befüllt, dann KI-Button** → Nur leere Felder werden befüllt. Beispiel: Name DE + primäre Muskelgruppen befüllt → KI füllt nur Name EN, Beschreibung, Equipment, sekundäre Muskelgruppen.
7. **Admin ändert Modell während ein Trainer gerade einen Call macht** → Kein Problem, das Modell wird bei jedem Call frisch aus admin_settings gelesen.
8. **Admin ändert Rate-Limit während Trainer im Zeitraum ist** → Neues Limit gilt sofort. Wenn Trainer bereits 40 Aufrufe hat und Limit auf 30 gesenkt wird, ist er sofort am Limit.
9. **Trainer-Account gelöscht (PROJ-11)** → `ai_usage_log` wird mit Account gelöscht (CASCADE).
10. **Mehrere Admins (Zukunft)** → Admin-Settings sind plattformweit (admin_settings Tabelle), nicht pro Admin. Alle Admins sehen/ändern dieselbe Config.
11. **Trainer optimiert Beschreibung per Einzelfeld-KI, Ergebnis gefällt nicht** → Klickt Undo → vorheriger Text wird wiederhergestellt. Undo-State lebt nur im React State, nicht in der DB.
12. **Trainer klickt Undo nach dem Speichern** → Nicht möglich. Undo-State wird beim Speichern verworfen. Der neue Text ist jetzt der gespeicherte Wert.
13. **Admin deaktiviert KI für einen Trainer der gerade einen Call macht** → Laufender Call wird noch abgeschlossen. Nächster Call wird abgelehnt (Server-seitige Prüfung).
14. **Admin aktiviert KI für einen Trainer** → Trainer sieht den Sparkles-Button sofort beim nächsten Seitenaufruf (kein Reload nötig wenn Seite neu geladen wird).
15. **Trainer hat KI-Zugang aber Limit ist 0** → Button ist sichtbar aber sofort deaktiviert mit Tooltip "Kein Kontingent verfügbar".

## Technical Requirements

- Security: `suggestExerciseDetails` Action prüft Authentication (nicht nur Admin, sondern alle eingeloggten Trainer)
- Security: Rate Limiting wird server-seitig geprüft (nicht client-seitig umgehbar)
- Security: API Keys werden NIE an den Client gesendet (nur Server Actions)
- Performance: KI-Call dauert 1-3 Sekunden (Haiku), bis zu 5 Sekunden (Sonnet/GPT-4o)
- Performance: Rate-Limit-Check ist ein einfacher COUNT-Query auf `ai_usage_log` (< 10ms)
- Datenmodell: `ai_usage_log` Tabelle mit `user_id`, `model_id`, `created_at` — für Zählung und Audit
- Zukunftssicherheit: Prompt lädt Taxonomy dynamisch → neue Kategorien sofort verfügbar
- Zukunftssicherheit: Provider-Abstraktion → neue Modelle durch Array-Erweiterung hinzufügbar

## Datenbankschema (Konzept)

```
ai_usage_log
├── id: uuid (PK)
├── user_id: uuid (FK → auth.users, NOT NULL)
├── model_id: text (welches Modell verwendet wurde)
├── exercise_name: text (Input, für Audit)
├── created_at: timestamptz (DEFAULT now())

RLS:
- Trainer kann nur eigene Einträge lesen (für Verbrauchsanzeige)
- Admin kann alle lesen (für Übersicht)
- INSERT: alle authentifizierten User
```

Admin Settings Erweiterung (bestehende Tabelle):
```
admin_settings Keys:
- 'ai_model': "claude-haiku-4-5-20251001" (bereits vorhanden)
- 'ai_rate_limit_period': "month" | "week" | "day" (NEU)
- 'ai_rate_limit_count': 50 (NEU)
```

## Abgrenzung
- PROJ-12 = Übungsbibliothek CRUD (Erstellen, Bearbeiten, Löschen, Suche, Filter)
- PROJ-19 = KI-Unterstützung (AI-Suggest, Rate Limiting, Admin-Konfiguration)
- Die bestehende AI-Implementierung (Admin-only) wird in PROJ-19 erweitert, nicht in PROJ-12

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
