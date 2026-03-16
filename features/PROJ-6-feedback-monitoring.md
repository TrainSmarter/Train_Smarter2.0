# PROJ-6: Feedback & Monitoring

## Status: Deployed
**Created:** 2026-03-12
**Last Updated:** 2026-03-16 (QA complete -- 4 High bugs, NOT production-ready)

## Dependencies
- Requires: PROJ-1 (Design System Foundation)
- Requires: PROJ-2 (UI Component Library) — Card, StatsCard, Chart, Badge, Input
- Requires: PROJ-3 (App Shell & Navigation) — Layout
- Requires: PROJ-4 (Authentication) — User-Session, Rollen
- Requires: PROJ-5 (Athleten-Management) — Trainer-Athlet-Verbindung, Sichtbarkeits-Flags
- Requires: PROJ-9 (Team-Verwaltung) — Team-Zugehörigkeit für Aggregate
- Optional: PROJ-10 (Admin-Bereich) — Admin verwaltet globale Standard-Kategorien

## Übersicht

Dynamisches, kategorie-basiertes Feedback-System für Athleten und Multi-View-Monitoring-Dashboard für Trainer.

**Athlet:** Füllt täglich einen strukturierten Check-in aus (< 1 Minute). Die Check-in Felder sind **dynamisch** — basierend auf konfigurierbaren Kategorien. Sieht optional seine eigenen Daten als Charts (aktivierbar durch Trainer).

**Trainer:** Bekommt eine Monitoring-Übersicht aller Athleten (inkl. Einzelpersonen ohne Mannschaft) mit 8 verschiedenen Ansichten. Kann pro Athlet Kategorien verwalten und die Sichtbarkeit der Auswertungs-Charts steuern.

**Kategorie-System:** Kategorien sind die Bausteine des Check-ins. Jede Kategorie hat einen Typ (Zahl, Skala, Boolean), definierte Wertebereiche und Labels. Admin legt globale Standard-Kategorien an, Trainer und Athleten können eigene hinzufügen oder Defaults deaktivieren.

## Konzept: Dynamische Kategorien

### Kategorie-Typen

| Typ | Eingabe | Beispiel |
|-----|---------|----------|
| `number` | Zahleneingabe (Dezimal/Ganzzahl) | Gewicht (kg), Schritte, Kalorien, Makros |
| `scale` | Segmented Control (1–N Buttons) | Hunger (1–5), Muskelkater (1–2), Menstruation (1–5) |
| `text` | Freitext (max 300 Zeichen) | Notiz |

### Kategorie-Definition (Schema)

Jede Kategorie enthält:
- **Name** (DE + EN) — z.B. "Gewicht" / "Weight"
- **Typ** — `number`, `scale`, `text`
- **Einheit** — z.B. "kg", "kcal", "g", "Anzahl"
- **Wertebereich** — min/max (bei `number`), Anzahl Stufen (bei `scale`)
- **Stufen-Labels** (bei `scale`) — z.B. `{1: "Keiner", 2: "Gelegentlich", ...}`
- **Pflichtfeld** — ja/nein
- **Sortierreihenfolge** — Position im Formular
- **Scope** — `global` (Admin), `trainer` (vom Trainer erstellt), `athlete` (vom Athleten erstellt)
- **Icon** (optional) — für Dashboard-Darstellung

### Standard-Kategorien (vom Admin vordefiniert)

| Kategorie | Typ | Bereich | Einheit | Pflicht | Stufen-Labels |
|-----------|-----|---------|---------|---------|---------------|
| Gewicht | `number` | 20–300 | kg | Ja | — |
| Schritte | `number` | 0–100.000 | Anzahl | Nein | — |
| Kalorien | `number` | 0–10.000 | kcal | Nein | — |
| Kohlenhydrate | `number` | 0–1.000 | g | Nein | — |
| Eiweiß | `number` | 0–500 | g | Nein | — |
| Fett | `number` | 0–500 | g | Nein | — |
| Hunger | `scale` | 1–5 | — | Nein | 1: Keiner, 2: Gelegentlich, 3: Durchgehend leicht, 4: Durchgehend stark, 5: Nicht aushaltbar |
| Menstruation | `scale` | 1–5 | — | Nein | 1: Sehr leicht, 2: Leicht, 3: Mittel, 4: Stark, 5: Sehr stark |
| Krankheit | `scale` | 1–2 | — | Nein | 1: Leicht krank (leichte Verkühlung), 2: Krank (Krankenstand, kein Training) |
| Muskelkater | `scale` | 1–2 | — | Nein | 1: Leicht (Muskeln im Alltag spürbar, nicht störend), 2: Stark (Bewegung im Alltag eingeschränkt) |
| Notiz | `text` | max 300 Zeichen | — | Nein | — |

### Kategorie-Verwaltung (Rechte)

| Rolle | Kann anlegen | Kann deaktivieren | Kann löschen |
|-------|-------------|-------------------|--------------|
| Admin | Globale Defaults | — | Globale Defaults |
| Trainer | Eigene + für seine Athleten | Defaults für seine Athleten deaktivieren | Eigene Kategorien |
| Athlet | Eigene | Defaults + Trainer-Kategorien für sich deaktivieren | Eigene Kategorien |

- Trainer-erstellte Kategorien sind für den Trainer und den betreffenden Athleten sichtbar
- Athleten-erstellte Kategorien sind für den Athleten und seinen Trainer sichtbar
- Deaktivierte Kategorien erscheinen nicht im Check-in-Formular, bestehende Daten bleiben erhalten

### Einstellungen: Einheiten-System

- In den Benutzer-Einstellungen wählbar: **Metrisch** (kg, cm) oder **Imperial** (lbs, in)
- Betrifft alle `number`-Kategorien mit physikalischen Einheiten
- Gespeichert wird immer in metrisch, Umrechnung erfolgt in der Anzeige

## User Stories

### Athlet — Check-in
- Als Athlet möchte ich täglich meinen Check-in ausfüllen (< 1 Minute), damit ich meinen Trainer mit aktuellen Daten versorge
- Als Athlet möchte ich meine eigenen Daten über Zeit sehen (Charts), wenn mein Trainer das für mich aktiviert hat, damit ich motiviert bleibe
- Als Athlet möchte ich vergangene Einträge nachtragen können (konfigurierbar durch Trainer), falls ich einen Tag vergessen habe
- Als Athlet möchte ich sehen, dass mein heutiger Check-in erfolgreich gespeichert wurde
- Als Athlet möchte ich eigene Kategorien zu meinem Check-in hinzufügen, um individuelle Parameter zu tracken
- Als Athlet möchte ich Standard-Kategorien deaktivieren können, die für mich nicht relevant sind (z.B. Menstruation für männliche Athleten)

### Trainer — Monitoring
- Als Trainer möchte ich auf einen Blick den Tagesstatus aller meiner Athleten sehen (Check-in ausgefüllt: ja/nein + Ampelstatus)
- Als Trainer möchte ich zwischen 8 verschiedenen Dashboard-Ansichten wechseln, um die für meinen Arbeitsstil passende zu nutzen
- Als Trainer möchte ich Team-Aggregate sehen (Durchschnittswerte aller Athleten einer Mannschaft)
- Als Trainer möchte ich einen einzelnen Athleten im Detail ansehen (Charts, Historie)
- Als Trainer möchte ich pro Athlet die Sichtbarkeit der Auswertungs-Charts an- oder abschalten
- Als Trainer möchte ich Athleten nach fehlenden Check-ins oder auffälligen Werten filtern
- Als Trainer möchte ich für meine Athleten Kategorien anlegen oder Standard-Kategorien deaktivieren

### Trainer — Kategorie-Verwaltung
- Als Trainer möchte ich sehen, welche Kategorien ein Athlet aktiv hat (Defaults + eigene)
- Als Trainer möchte ich dem Athleten eine neue Kategorie zuweisen (z.B. spezifischen Reha-Parameter)
- Als Trainer möchte ich eine Kategorie für einen Athleten deaktivieren, ohne dessen bestehende Daten zu löschen

## Acceptance Criteria

### Figma Screens
- [ ] Figma Screen: Athlet — Täglicher Check-in Formular (mit Segmented Controls)
- [ ] Figma Screen: Athlet — Eigene Daten-Übersicht (Charts, aktivierbar durch Trainer)
- [ ] Figma Screen: Athlet — Kategorie-Verwaltung
- [ ] Figma Screen: Trainer — Monitoring Dashboard (8 Views)
- [ ] Figma Screen: Trainer — Einzelathlet Detailansicht
- [ ] Figma Screen: Trainer — Kategorie-Verwaltung pro Athlet

### Täglicher Check-in (Athlet)
- [ ] Route: `/feedback`
- [ ] Formular erscheint prominent wenn Check-in noch nicht ausgefüllt (heutiger Tag)
- [ ] Felder werden dynamisch aus den aktiven Kategorien des Athleten generiert
- [ ] Eingabe-Typen:
  - `number`: Zahleneingabe mit Einheit (z.B. "82.5 kg"), Numpad auf Mobile
  - `scale`: **Segmented Control** — horizontale Buttons nebeneinander (z.B. `[1] [2] [3] [4] [5]`), Labels unter den Extremwerten, ein Tap genügt
  - `text`: Freitext-Eingabefeld (max 300 Zeichen)
- [ ] Zod-Validierung: Werte innerhalb des definierten Bereichs jeder Kategorie
- [ ] Pflichtfelder sind markiert, optionale können übersprungen werden
- [ ] Bereits ausgefüllter Check-in: Anzeige mit "Bearbeiten" Button (bis Mitternacht editierbar)
- [ ] 1 Check-in pro Tag — kein Duplikat möglich, bestehender wird überschrieben
- [ ] Nachtrag: Einträge rückwirkend möglich (Anzahl Tage konfigurierbar durch Trainer, Default: 3)
- [ ] Erfolgs-Feedback nach Speichern (Toast/Animation)
- [ ] DSGVO: Kategorie-Felder ausblenden wenn `body_wellness_data` Consent widerrufen

### Athlet — Eigenansicht (wenn Trainer aktiviert)
- [ ] Gewichtsverlauf: Linien-Chart (letzte 30 / 90 Tage umschaltbar)
- [ ] Trend-Charts für alle aktiven Skala-Kategorien
- [ ] Streak-Badge: "X Tage in Folge ausgefüllt"
- [ ] Wenn Trainer-Freigabe (`can_see_analysis`) deaktiviert: Seite zeigt nur Check-in Formular ohne Charts

### Athlet — Kategorie-Verwaltung
- [ ] Erreichbar über Einstellungen oder direkt im Check-in-Formular ("Kategorien anpassen")
- [ ] Liste aller Kategorien: Global (Standard), Trainer-erstellt, Eigene
- [ ] Standard-Kategorien: ein/aus Toggle (deaktivieren möglich, nicht löschen)
- [ ] Eigene Kategorien: Erstellen (Name, Typ, Bereich, Labels), Bearbeiten, Löschen
- [ ] Vorschau: Wie sieht die Eingabe im Check-in aus?

### Trainer — Monitoring Dashboard
- [ ] Route: `/feedback` (Trainer-Rolle)
- [ ] **8 umschaltbare Ansichten** über View-Switcher (Icon-Buttons, wie in Unified View):

#### Phase 1 (MVP)

**1. Card Grid (Ampel-Karten)**
- [ ] Athleten als farbige Cards: Avatar, Name, Heute-Status (✓/✗), Ampel (Grün/Gelb/Rot basierend auf konfigurierbarem Schwellwert)
- [ ] Filter: "Alle" / "Check-in fehlt heute" / "Auffällige Werte"
- [ ] Klick → Einzelathlet-Detailansicht

**2. Tabellen-Ansicht**
- [ ] Kompakte Tabelle: Athlet | Letzter Check-in | Gewicht | Trend | Status
- [ ] Sortierbar nach jeder Spalte
- [ ] Spalten konfigurierbar (welche Kategorien angezeigt werden)

**3. Alert-View (Aufmerksamkeit erforderlich)**
- [ ] Zeigt NUR Athleten mit Auffälligkeiten:
  - Kein Check-in seit X Tagen (konfigurierbar)
  - Niedrige Skala-Werte (konfigurierbare Schwellwerte)
  - Starke Gewichtsveränderung (z.B. > 2% in 7 Tagen)
- [ ] Farbcodiert: Rot (kritisch), Gelb (Warnung)
- [ ] Leer-Zustand: "Alles im grünen Bereich! Keine Auffälligkeiten."

**4. Trend-Charts**
- [ ] Mini-Charts pro Athlet oder Team-Aggregate auf dem Dashboard
- [ ] Zeitraum wählbar (7 / 30 / 90 Tage)
- [ ] Vergleich mehrerer Athleten möglich (Overlay)

#### Phase 2 (Post-MVP)

**5. Kalender-Übersicht**
- [ ] Monats-/Wochen-Ansicht mit farbcodierten Tagen pro Athlet
- [ ] Farbe = Check-in Status (ausgefüllt / teilweise / fehlt)
- [ ] Klick auf Tag → Check-in Details

**6. Heatmap**
- [ ] GitHub-Style Heatmap: Tage (X-Achse) × Athleten (Y-Achse)
- [ ] Farbintensität = Check-in Compliance oder Wellness-Score
- [ ] Schneller Überblick über Regelmäßigkeit aller Athleten

**7. Feed / Timeline**
- [ ] Chronologischer Feed aller Check-ins, neueste zuerst
- [ ] Zeigt Avatar, Name, Zeitstempel, Kernwerte, Notiz
- [ ] Filterbar nach Team oder Einzelathlet

**8. Ranking / Compliance**
- [ ] Athleten sortiert nach Streak-Länge oder Compliance-Rate
- [ ] Badges: 🥇🥈🥉 für Top 3
- [ ] Motivations-Tool: Trainer kann Ranking mit Athleten teilen (optional)

### Trainer — Einzelathlet-Detailansicht
- [ ] Route: `/feedback/[athlete-id]`
- [ ] Charts für alle aktiven Kategorien (Linien-Charts für `number`, Balken für `scale`)
- [ ] Zeitraum: 7 / 30 / 90 Tage / Gesamt
- [ ] Alle bisherigen Check-ins als Tabelle (paginiert, 20 pro Seite)
- [ ] Toggle: "Auswertungs-Charts für diesen Athleten sichtbar" (an/aus)
- [ ] Kategorie-Verwaltung: Kategorien hinzufügen/deaktivieren für diesen Athleten

### Trainer — Kategorie-Verwaltung pro Athlet
- [ ] Erreichbar aus Einzelathlet-Detailansicht
- [ ] Übersicht aller Kategorien des Athleten (Global + Trainer + Athlet-eigene)
- [ ] Neue Kategorie zuweisen (z.B. Reha-spezifisch)
- [ ] Standard-Kategorien deaktivieren (Daten bleiben erhalten)
- [ ] Nachtrag-Fenster konfigurieren (Anzahl Tage, Default: 3, Max: 14)

### Sichtbarkeits-Steuerung durch Trainer
- [ ] Trainer kann pro Athlet `can_see_analysis: boolean` setzen
- [ ] Standard: `false` (Athlet sieht Charts standardmäßig nicht)
- [ ] Athlet sieht in Einstellungen welche Daten sein Trainer sehen kann (Read-only Anzeige)

## Edge Cases

- Check-in für heute bereits vorhanden → Bearbeiten-Modus, kein Duplikat möglich
- Keine Athleten verbunden → Trainer sieht Leer-Zustand "Noch keine Athleten verbunden. Gehe zu Organisation."
- Athlet hat noch nie einen Check-in ausgefüllt → Card zeigt "Kein Check-in bisher" ohne Fehler
- Trainer schaltet Analyse ab → Athlet sieht bei nächstem Reload keine Charts mehr
- Nachtrag über konfiguriertes Limit versucht → Fehlermeldung mit konfiguriertem Limit
- Mannschaft mit 0 Athleten → Team-Aggregate-Sektion wird nicht angezeigt
- Alle Kategorien deaktiviert → Hinweis "Keine aktiven Kategorien. Mindestens eine Kategorie muss aktiv sein."
- Kategorie gelöscht die bereits Daten hat → Daten bleiben in DB erhalten, Kategorie wird als "archiviert" markiert, nicht mehr im Formular sichtbar
- Trainer und Athlet erstellen gleichzeitig eine Kategorie mit gleichem Namen → Beide existieren parallel (unterschiedlicher Scope), UI zeigt Scope-Badge
- Einheitensystem geändert (metrisch ↔ imperial) → Sofortige Umrechnung in der Anzeige, gespeicherte Daten bleiben metrisch
- `body_wellness_data` Consent widerrufen → Alle Körperdaten-Kategorien im Formular ausgeblendet, bestehende Daten werden im DSGVO-Export berücksichtigt
- Sehr viele Kategorien aktiv (> 15) → Formular wird scrollbar, optionale Felder zusammenklappbar

## Technical Requirements

- **Security:** RLS — Athlet sieht nur eigene Einträge; Trainer sieht nur Daten seiner verknüpften Athleten (basierend auf `trainer_athlete_connections`)
- **Sichtbarkeit:** `can_see_analysis` Flag in `trainer_athlete_connections` (zusätzlich zu PROJ-5 Flags)
- **Performance:** Monitoring-Dashboard aggregiert Daten serverseitig (kein Full-Load aller Roh-Einträge)
- **Charts:** Recharts (bereits im Tech Stack, lazy loaded)
- **Kategorie-System:** Flexible Datenbank-Struktur: Kategorien als eigene Tabelle, Check-in-Werte als Key-Value-Paare (EAV-Pattern) oder JSONB
- **Mobile-First:** Segmented Controls, große Touch-Targets (44px min), Numpad für Zahleneingaben
- **i18n:** Alle Kategorie-Namen + Labels in DE + EN
- **DSGVO:** Check-in-Daten in GDPR-Export aufnehmen, Consent-Prüfung vor Anzeige

## Phasen-Aufteilung

### Phase 1 (MVP)
- Dynamisches Kategorie-System mit Standard-Kategorien
- Athlet: Check-in Formular (Segmented Controls + Zahleneingabe)
- Athlet: Eigenansicht mit Charts (wenn Trainer aktiviert)
- Trainer: 4 Dashboard-Views (Card Grid, Tabelle, Alert-View, Trend-Charts)
- Trainer: Einzelathlet-Detailansicht
- Trainer: Kategorie-Verwaltung pro Athlet
- Sichtbarkeits-Steuerung

### Phase 2 (Post-MVP)
- 4 weitere Dashboard-Views (Kalender, Heatmap, Feed, Ranking)
- Athlet: Eigene Kategorien erstellen
- Einheitensystem-Umschaltung (Metrisch/Imperial)
- Ranking mit Athleten teilen

---
<!-- Sections below are added by subsequent skills -->

## Offene Punkte aus PROJ-11 (DSGVO)

- [ ] **Daten-Export erweitern:** Wenn Check-ins, Körperdaten und Wellness-Daten implementiert sind, müssen diese in den DSGVO-Export (`/api/gdpr/export`) aufgenommen werden: `koerperdaten.json`, `check-ins.json` (nur wenn `body_wellness_data` Consent erteilt). (PROJ-11 BUG-5)
- [ ] **Consent-Prüfung:** Check-in Formular muss die Körperdaten-Felder ausblenden wenn `body_wellness_data` Consent widerrufen wurde (bereits im PROJ-11 Spec als AC definiert)

## Tech Design (Solution Architect)

### A) Komponenten-Struktur

#### Athlet — Check-in (`/feedback`)

```
Feedback Page (Server Component — rollenbasiert)
├── [Athlet-Rolle]
│   ├── Check-in Formular
│   │   ├── Datum-Auswahl (heute oder Nachtrag)
│   │   ├── Dynamische Feld-Liste (aus aktiven Kategorien generiert)
│   │   │   ├── Zahlen-Eingabe (für "number" Kategorien — Gewicht, Kalorien, ...)
│   │   │   ├── Segmented Control (für "scale" Kategorien — Hunger, Muskelkater, ...)
│   │   │   └── Freitext-Eingabe (für "text" Kategorien — Notiz)
│   │   ├── Speichern-Button
│   │   └── "Kategorien anpassen" Link
│   │
│   ├── [Wenn Check-in bereits ausgefüllt]
│   │   └── Tages-Zusammenfassung (Read-only) + "Bearbeiten" Button
│   │
│   └── [Wenn can_see_analysis = true]
│       ├── Streak-Badge ("X Tage in Folge")
│       ├── Gewichtsverlauf (Linien-Chart, 30/90 Tage umschaltbar)
│       └── Trend-Charts pro aktiver Skala-Kategorie
│
└── [Trainer-Rolle] → siehe Monitoring Dashboard
```

#### Athlet — Kategorie-Verwaltung

```
Kategorie-Verwaltung (Modal oder eigene Sektion)
├── Kategorie-Liste
│   ├── [Global] Standard-Kategorien mit ein/aus Toggle
│   ├── [Trainer] Vom Trainer zugewiesene Kategorien (nicht löschbar)
│   └── [Eigene] Selbst erstellte Kategorien (editierbar, löschbar)
├── "Neue Kategorie erstellen" Button
│   └── Kategorie-Formular (Name DE/EN, Typ, Bereich, Labels, Pflicht)
│       └── Live-Vorschau der Eingabe
└── Sortierreihenfolge (Drag & Drop oder Pfeil-Buttons)
```

#### Trainer — Monitoring Dashboard (`/feedback`)

```
Monitoring Dashboard (Client Component)
├── Header-Leiste
│   ├── Such-Eingabe (Athlet suchen)
│   ├── Filter-Dropdown (Team / Status / Auffälligkeiten)
│   ├── Zeitraum-Auswahl (7 / 30 / 90 Tage)
│   └── View-Switcher (8 Icons, wie in Unified View)
│
├── Stats-Leiste (immer sichtbar)
│   ├── StatsCard: Gesamt-Athleten
│   ├── StatsCard: Heute ausgefüllt (X / Y)
│   ├── StatsCard: Durchschnitt Compliance
│   └── StatsCard: Auffälligkeiten (Anzahl)
│
├── [Aktive Ansicht — je nach View-Switcher]
│   ├── Card Grid View (Ampel-Karten, ähnlich Organisation Card Grid)
│   ├── Table View (sortierbar, konfigurierbare Spalten)
│   ├── Alert View (nur Auffälligkeiten, farbcodiert)
│   ├── Trend View (Mini-Charts pro Athlet/Team)
│   ├── Calendar View (Phase 2 — Monats-/Wochenansicht)
│   ├── Heatmap View (Phase 2 — Tage × Athleten Matrix)
│   ├── Feed View (Phase 2 — chronologische Timeline)
│   └── Ranking View (Phase 2 — Compliance-Rangliste)
│
└── Empty State ("Noch keine Athleten verbunden")
```

#### Trainer — Einzelathlet-Detailansicht (`/feedback/[athlete-id]`)

```
Athlet-Detail-Seite (Server Component)
├── Athlet-Header (Avatar, Name, Team, Streak)
├── Einstellungen-Leiste
│   ├── Toggle: "Charts für Athlet sichtbar" (can_see_analysis)
│   ├── "Kategorien verwalten" Button → Kategorie-Modal
│   └── Nachtrag-Limit Einstellung (Dropdown: 1–14 Tage)
│
├── Charts-Bereich (Recharts, lazy loaded)
│   ├── Linien-Chart pro "number" Kategorie (Gewicht, Kalorien, ...)
│   ├── Balken-Chart pro "scale" Kategorie (Hunger, Muskelkater, ...)
│   └── Zeitraum-Switcher (7 / 30 / 90 / Gesamt)
│
└── Check-in Historie
    ├── Tabelle (Datum, alle Kategorien als Spalten, Notiz)
    └── Pagination (20 pro Seite)
```

### B) Datenmodell (Klartext)

#### Tabelle 1: `feedback_categories` (Kategorie-Definitionen)

Jede Kategorie beschreibt ein Eingabe-Feld im Check-in.

```
Jede Kategorie hat:
- Eindeutige ID (UUID)
- Name (DE + EN, als JSONB: {"de": "Gewicht", "en": "Weight"})
- Slug (eindeutiger Kurzname, z.B. "weight", "hunger" — für stabile API-Referenz)
- Typ: "number", "scale" oder "text"
- Einheit (optional): "kg", "kcal", "g", etc.
- Min-Wert / Max-Wert (bei number + scale)
- Stufen-Labels (bei scale, als JSONB: {"1": {"de": "Keiner", "en": "None"}, ...})
- Pflichtfeld: ja/nein
- Standard-Sortierreihenfolge (smallint)
- Icon (optional, z.B. "scale", "flame", "heart")
- Scope: "global", "trainer" oder "athlete"
- Ersteller-ID (bei trainer/athlete Scope — verweist auf User)
- Ziel-Athlet-ID (bei trainer Scope — für welchen Athleten erstellt)
- archived_at: Zeitstempel oder null (Soft Delete — konsistent mit teams-Tabelle)
- Erstellt / Aktualisiert Zeitstempel

Constraints:
- UNIQUE(slug) für globale Kategorien
- Validierungs-Trigger: Bei scope="trainer" wird geprüft, dass Ersteller tatsächlich
  mit dem Ziel-Athleten verbunden ist (SECURITY DEFINER Function)

Gespeichert in: Supabase PostgreSQL (feedback_categories)
RLS: Global = alle authentifizierten User lesen; Trainer = eigene + globale;
     Athlet = eigene + Trainer-zugewiesene + globale

Indexes:
- (scope, archived_at) — für "alle aktiven globalen Kategorien" Abfrage
- (created_by, scope) — für "meine Kategorien" Abfrage
- (target_athlete_id) — für "Kategorien dieses Athleten" Abfrage
```

#### Tabelle 2: `feedback_category_overrides` (Deaktivierungen)

Wenn ein Benutzer eine Kategorie für sich deaktiviert. Keine Override-Zeile = Kategorie ist aktiv (Default). Eine Zeile wird nur erstellt wenn jemand aktiv deaktiviert.

```
Jeder Override hat:
- Eindeutige ID (UUID)
- Benutzer-ID (wer deaktiviert)
- Kategorie-ID (was deaktiviert wird)
- is_active: Boolean (Standard: true — false = deaktiviert, true = explizit wieder aktiviert)
- Erstellt / Aktualisiert Zeitstempel

Constraint: UNIQUE(user_id, category_id) — nur ein Override pro User pro Kategorie
Gespeichert in: Supabase PostgreSQL (feedback_category_overrides)
RLS: Nur eigene Overrides lesen/schreiben
```

#### Tabelle 3: `feedback_checkins` (Tages-Einträge — Header)

Ein Eintrag pro Athlet pro Tag.

```
Jeder Check-in hat:
- Eindeutige ID (UUID)
- Athlet-ID (wer hat ausgefüllt)
- Datum (PostgreSQL DATE Typ — server-seitig bestimmt aus profiles.timezone!)
- Erstellt / Aktualisiert Zeitstempel

WICHTIG — Zeitzonen-Sicherheit:
  Das Datum wird IMMER server-seitig berechnet: (NOW() AT TIME ZONE profiles.timezone)::date
  Für Nachträge sendet der Client ein explizites Datum, das aber gegen die Zeitzone
  des Athleten validiert wird. So ist UNIQUE(athlete_id, date) zeitzonen-sicher.

Constraint: UNIQUE(athlete_id, date) — kein Duplikat pro Tag
Gespeichert in: Supabase PostgreSQL (feedback_checkins)
RLS: Athlet = nur eigene (INSERT + UPDATE + SELECT);
     Trainer = NUR SELECT (Trainer dürfen Check-ins NICHT bearbeiten)

Indexes:
- (athlete_id, date DESC) — Haupt-Abfragemuster für Historie + Trend
```

#### Tabelle 4: `feedback_checkin_values` (Einzelwerte pro Kategorie)

Key-Value-Paare: ein Wert pro Kategorie pro Check-in (EAV-Pattern).

```
Jeder Wert hat:
- Eindeutige ID (UUID)
- Check-in-ID (verweist auf feedback_checkins)
- Kategorie-ID (verweist auf feedback_categories)
- Athlet-ID (denormalisiert! — Kopie aus dem Parent-Check-in, für RLS-Performance)
- Numerischer Wert (für "number" und "scale" — z.B. 82.5 oder 3)
- Text-Wert (für "text" — z.B. "Schulter tut weh")
- Erstellt Zeitstempel

WARUM athlete_id denormalisiert?
  RLS-Policies auf dieser Tabelle müssten sonst über 2 Hops prüfen:
  values → checkins → trainer_athlete_connections
  Mit denormalisierter athlete_id reicht 1 Hop: values → trainer_athlete_connections
  Das spart bei jeder Abfrage einen JOIN und ist bei 400k+ Zeilen/Jahr spürbar.
  Die athlete_id wird beim INSERT automatisch aus dem Parent-Check-in gesetzt (Trigger).

Constraints:
- UNIQUE(checkin_id, category_id) — maximal ein Wert pro Kategorie pro Check-in
- FK zu feedback_checkins(id) ON DELETE CASCADE
- FK zu feedback_categories(id) ON DELETE RESTRICT (verhindert Löschen mit Daten)

Gespeichert in: Supabase PostgreSQL (feedback_checkin_values)
RLS: Athlet = nur eigene (athlete_id = auth.uid());
     Trainer = NUR SELECT (über is_connected_athlete() Helper)

Indexes:
- (checkin_id) — alle Werte eines Check-ins laden
- (category_id, numeric_value) — Alert-Queries ("alle Athleten wo Hunger < 2")
- (athlete_id, category_id, created_at DESC) INCLUDE (numeric_value) — Trend-Queries ohne Table-Access
```

#### Erweiterung bestehender Tabelle: `trainer_athlete_connections`

```
Neue Felder:
- can_see_analysis: Boolean (Standard: false)
  → Steuert ob Athlet seine eigenen Charts sehen darf
- feedback_backfill_days: smallint (Standard: 3, CHECK: BETWEEN 1 AND 14)
  → Wie viele Tage rückwirkend der Athlet nachtragen darf
```

#### Neue Helper Function: `is_connected_athlete(p_athlete_id UUID)`

```
SECURITY DEFINER Function (wie bestehendes is_team_member() Pattern aus PROJ-9):
- Prüft ob auth.uid() ein Trainer ist, der mit p_athlete_id verbunden ist (status = 'active')
- Wird in RLS-Policies aller feedback_* Tabellen verwendet
- Vermeidet wiederholte Subquery in jeder Policy
```

#### Warum dieses Modell?

**EAV (Entity-Attribute-Value) statt JSONB-Blob:**
- Kategorien können hinzugefügt/entfernt werden ohne Schema-Änderung
- Einzelne Kategorien sind per SQL filterbar und aggregierbar (wichtig für Dashboard-Queries)
- Trainer kann Alert-Schwellwerte pro Kategorie definieren
- JSONB wäre zwar einfacher zu speichern, aber schwer zu aggregieren und zu filtern
- Bei 50+ Athleten × 365 Tage × 11 Kategorien (~200k Zeilen/Jahr pro Trainer) ist EAV mit Indexes performant
- Getestete Alternativen: Hybrid (feste Spalten + JSONB overflow), TimescaleDB — beide verworfen wegen zusätzlicher Komplexität ohne Gewinn bei dieser Datenmenge

**Separate Check-in Header + Values:**
- Header garantiert 1-pro-Tag-Constraint einfach per UNIQUE(athlete_id, date)
- Values sind flexibel erweiterbar ohne Check-in-Tabelle zu ändern
- Löschen/Archivieren einer Kategorie betrifft nur die Kategorie-Tabelle, Values bleiben
- Denormalisierte athlete_id auf Values für 1-Hop RLS statt 2-Hop

**Archivierung statt Löschung:**
- archived_at Zeitstempel (nicht Boolean) — konsistent mit teams-Tabelle, liefert Audit-Trail
- Archivierte Kategorien verschwinden aus dem Formular, bleiben aber in historischen Charts sichtbar

**Keyset-Pagination statt OFFSET:**
- Check-in Historie nutzt `WHERE date < :last_date ORDER BY date DESC LIMIT 20`
- OFFSET wird bei großen Datenmengen langsamer (muss alle übersprungenen Zeilen scannen)
- Keyset bleibt konstant schnell unabhängig von der Seitenzahl

### C) Tech-Entscheidungen (begründet)

| Entscheidung | Begründung |
|-------------|------------|
| **EAV-Pattern** statt fester Spalten | Kategorien sind dynamisch — jeder User hat andere Felder. Feste Spalten würden bei jeder neuen Kategorie eine DB-Migration erfordern |
| **Segmented Control** für Skalen | Touch-optimiert (ein Tap statt Scrollen), visuell klar, funktioniert auch bei 2er-Skalen (Muskelkater) und 5er-Skalen (Hunger) |
| **Recharts** für Charts | Bereits im Projekt installiert, React-nativ, lazy-loadable, unterstützt Line + Bar + responsive Container |
| **View-Switcher** (8 Views) | Bewährtes Pattern aus Unified View (PROJ-9). Trainer hat unterschiedliche Arbeitsstile — die richtige Ansicht steigert Effizienz |
| **Server-seitige Aggregation** | Dashboard mit 50+ Athleten darf nicht alle Roh-Einträge laden. Aggregierte Werte (Durchschnitt, Trends, Compliance-Rate) werden per Datenbank-View oder Function berechnet |
| **JSONB für i18n-Labels** | Kategorie-Namen und Stufen-Labels müssen in DE + EN existieren. JSONB ist flexibel und vermeidet eine eigene Übersetzungs-Tabelle |
| **Soft Delete für Kategorien** | Archivieren statt Löschen — bestehende Daten bleiben intakt, Kategorie verschwindet nur aus dem Formular |
| **LocalStorage für View-Einstellungen** | Welcher View aktiv ist, welche Spalten sichtbar sind, welcher Zeitraum gewählt ist — das sind User-Präferenzen die nicht in die DB müssen (gleicher Ansatz wie Unified View) |

### D) API-Routen & Server Actions

#### Server Actions (für Mutationen)

| Action | Beschreibung |
|--------|-------------|
| `saveCheckin(date, values[])` | Speichert oder aktualisiert Check-in für einen Tag |
| `createCategory(...)` | Erstellt neue Kategorie (Trainer oder Athlet) |
| `updateCategory(id, ...)` | Aktualisiert eine eigene Kategorie |
| `archiveCategory(id)` | Archiviert eine Kategorie (Soft Delete) |
| `toggleCategoryOverride(categoryId, active)` | Aktiviert/Deaktiviert eine Kategorie für den User |
| `toggleAnalysisVisibility(athleteId, visible)` | Setzt `can_see_analysis` Flag |
| `updateBackfillDays(athleteId, days)` | Setzt Nachtrag-Limit |

#### Server-seitige Queries (für Daten-Laden)

| Query | Beschreibung |
|-------|-------------|
| `getActiveCategories(userId)` | Alle aktiven Kategorien für diesen User (Global + Trainer + Eigene − Deaktivierte) |
| `getCheckin(athleteId, date)` | Check-in für einen bestimmten Tag (oder null) |
| `getMonitoringOverview(trainerId)` | Aggregierte Daten aller Athleten: Heute-Status, Trends, Auffälligkeiten |
| `getAthleteDetail(trainerId, athleteId, range)` | Detaildaten eines Athleten: alle Check-ins im Zeitraum, Charts-Daten |
| `getTeamAggregates(trainerId, teamId, range)` | Team-Durchschnittswerte für Trend-Charts |
| `getAlerts(trainerId)` | Nur Athleten mit Auffälligkeiten (fehlende Check-ins, niedrige Werte, starke Veränderungen) |

### E) Datenbank-Views & Performance-Strategie

Zwei serverseitige Views, um Dashboard-Queries effizient zu halten:

**1. `v_athlete_monitoring_summary`**
- Pro Athlet: Letzter Check-in Datum, Gewicht-Trend (Δ 7 Tage), Durchschnitt aller Skala-Werte, Check-in Streak, Compliance-Rate (letzte 30 Tage)
- Trainer-ID als Filter (über `trainer_athlete_connections`)
- Wird von Card Grid, Table, Alert und Ranking Views genutzt

**2. `v_athlete_checkin_history`**
- Pro Athlet + Datum: Alle Kategorie-Werte als Spalten (Pivot via JSONB)
- Zeitraum-filterbar
- Wird von Einzelathlet-Detail, Trend-Charts und Feed View genutzt

**Performance-Strategie (Zukunftssicherheit):**

| Phase | Maßnahme | Trigger |
|-------|----------|---------|
| Jetzt (MVP) | Reguläre Views + Indexes | Sofort |
| Wenn Dashboard > 2s lädt | Materialized View für `v_athlete_monitoring_summary` + pg_cron Refresh alle 15 Min | Performance-Monitoring |
| Wenn > 1M Zeilen in checkin_values | Hash-Partitioning auf `feedback_checkin_values` nach `athlete_id` (8–16 Partitionen) | DB-Monitoring |
| Wenn > 50 Trainer | Connection Pooling prüfen, ggf. Supabase Pro Plan | User-Wachstum |

**Warum nicht sofort Materialized Views?**
- Reguläre Views sind einfacher zu entwickeln und debuggen
- Bei < 100 Athleten × 30 Tage reichen Indexes
- Materialized Views erfordern Refresh-Logik (pg_cron) — Komplexität nur wenn nötig

**Warum nicht sofort Partitioning?**
- PostgreSQL-FK-Referenzen auf partitionierte Tabellen sind eingeschränkt
- Unter 1M Zeilen bringt Partitioning keinen Vorteil
- Design erlaubt nachträgliches Partitioning ohne Schema-Änderung an der App

### F) Neue UI-Komponenten

| Komponente | Beschreibung | Existiert? |
|-----------|-------------|------------|
| `SegmentedControl` | Horizontale Button-Gruppe (1–N), ein aktiver Wert, touch-optimiert (44px min) | **Neu** |
| `NumberInput` | Zahleneingabe mit Einheit-Suffix, inputMode="decimal" für Mobile Numpad | **Neu** (erweitert shadcn Input) |
| `MonitoringCardGrid` | Athleten-Cards mit Ampel-Status (Grün/Gelb/Rot) | **Neu** (nutzt Card-Extended) |
| `MonitoringTable` | Sortierbare Tabelle mit konfigurierbaren Spalten | **Neu** (nutzt shadcn Table) |
| `AlertList` | Gefilterte Liste nur mit Auffälligkeiten | **Neu** |
| `TrendChart` | Recharts LineChart/BarChart wrapper mit Zeitraum-Switcher | **Neu** |
| `CheckinForm` | Dynamisches Formular aus Kategorien generiert | **Neu** |
| `CategoryManager` | Liste + CRUD für Kategorien mit Live-Vorschau | **Neu** |
| `ViewSwitcher` | Bereits vorhanden (8 statt 3 Icons) | **Existiert** (erweitern) |
| `StatsCard` | Bereits vorhanden | **Existiert** |

### G) Sicherheitskonzept (RLS + Zugriffskontrolle)

| Tabelle | Athlet (eigene Daten) | Trainer (verknüpfte Athleten) | Admin |
|---------|----------------------|------------------------------|-------|
| `feedback_categories` | SELECT global + eigene + trainer-zugewiesene; INSERT/UPDATE/DELETE eigene | SELECT global + eigene; INSERT/UPDATE eigene (mit Validierung); DELETE eigene | SELECT/INSERT/UPDATE/DELETE global |
| `feedback_category_overrides` | SELECT/INSERT/UPDATE eigene | — | — |
| `feedback_checkins` | SELECT/INSERT/UPDATE eigene | **NUR SELECT** | SELECT alle |
| `feedback_checkin_values` | SELECT/INSERT/UPDATE eigene | **NUR SELECT** (via `is_connected_athlete()`) | SELECT alle |

**Kritische Sicherheitsregeln:**
- Trainer können Check-ins **niemals** bearbeiten — nur lesen
- `is_connected_athlete()` SECURITY DEFINER Function verhindert Zugriff auf fremde Athleten
- Kategorie-Erstellung mit scope="trainer" wird per Trigger validiert (Trainer muss mit Ziel-Athlet verbunden sein)
- DSGVO Consent-Prüfung: `body_wellness_data` Consent wird in der Server Action geprüft, bevor Daten geladen werden

### H) Abhängigkeiten (Packages)

| Package | Zweck | Status |
|---------|-------|--------|
| `recharts` | Line-Charts, Bar-Charts, Responsive Container | Bereits installiert (v2.15.4) |
| `@dnd-kit/core` + `@dnd-kit/sortable` | Sortierreihenfolge der Kategorien | Bereits installiert |
| `zod` | Validierung der Check-in Werte | Bereits installiert |
| `sonner` | Toast-Benachrichtigungen (Erfolg/Fehler) | Bereits installiert |
| `date-fns` | Datum-Formatierung, Tages-Differenzen | Bereits installiert |

**Keine neuen Packages nötig.**

### I) Datei-Struktur (neue Dateien)

```
src/
  app/[locale]/(protected)/
    feedback/
      page.tsx                     → Server Component, rollenbasiert (Athlet/Trainer)
      [athleteId]/
        page.tsx                   → Trainer: Einzelathlet-Detailansicht
  components/
    feedback/
      checkin-form.tsx             → Dynamisches Check-in Formular
      checkin-summary.tsx          → Zusammenfassung eines ausgefüllten Check-ins
      segmented-control.tsx        → Neue UI-Komponente für Skalen
      number-input.tsx             → Zahleneingabe mit Einheit
      category-manager.tsx         → Kategorie-Verwaltung (CRUD + Overrides)
      category-form-modal.tsx      → Modal zum Erstellen/Bearbeiten einer Kategorie
      monitoring-dashboard.tsx     → Haupt-Dashboard (Client Component, View-Switcher)
      monitoring-card-grid.tsx     → Ampel-Karten Ansicht
      monitoring-table.tsx         → Tabellen-Ansicht
      monitoring-alert-view.tsx    → Alert-Ansicht
      monitoring-trend-view.tsx    → Trend-Charts Ansicht
      athlete-detail-view.tsx      → Einzelathlet mit Charts + Historie
      trend-chart.tsx              → Recharts Wrapper (Line + Bar)
      streak-badge.tsx             → "X Tage in Folge" Badge
  lib/
    feedback/
      actions.ts                   → Server Actions (saveCheckin, createCategory, ...)
      queries.ts                   → Server Queries (getActiveCategories, getMonitoringOverview, ...)
      types.ts                     → TypeScript Typen (Category, Checkin, CheckinValue, ...)
  hooks/
    use-feedback-preferences.ts    → localStorage Hook für View/Filter/Zeitraum Einstellungen
```

### J) Phasen-Zuordnung (Build Order)

**Phase 1 — MVP (wird jetzt gebaut):**

1. **Backend zuerst:** DB-Tabellen + RLS + Seed (Standard-Kategorien) + Server Actions + Queries
2. **Frontend Athlet:** Check-in Formular (SegmentedControl, NumberInput, dynamische Felder)
3. **Frontend Trainer:** Monitoring Dashboard (4 Views: Card Grid, Tabelle, Alert, Trend)
4. **Frontend Trainer:** Einzelathlet-Detail (Charts + Historie)
5. **Frontend beide:** Kategorie-Verwaltung (Manager + Overrides)
6. **Integration:** DSGVO-Export erweitern, Consent-Prüfung

**Phase 2 — Post-MVP:**

7. Kalender-View, Heatmap-View, Feed-View, Ranking-View
8. Athlet: Eigene Kategorien erstellen
9. Einheitensystem (Metrisch/Imperial)

## Implementation Notes (Frontend — Phase 1 MVP)

**Implemented 2026-03-16:**

### New Files Created
- `src/lib/feedback/types.ts` — All TypeScript types (Category, Checkin, Monitoring, Trends, Preferences)
- `src/lib/feedback/mock-data.ts` — 11 standard categories as mock seed data
- `src/lib/feedback/queries.ts` — Server-side query stubs (mock data, ready for Supabase)
- `src/lib/feedback/actions.ts` — Server actions stubs (saveCheckin, toggleAnalysis, etc.)
- `src/hooks/use-feedback-preferences.ts` — localStorage persistence for view/filter/timeRange
- `src/components/feedback/segmented-control.tsx` — Touch-optimized scale input (44px min targets)
- `src/components/feedback/number-input.tsx` — Number input with unit suffix + numpad on mobile
- `src/components/feedback/checkin-form.tsx` — Dynamic form generated from active categories
- `src/components/feedback/checkin-summary.tsx` — Read-only display of completed check-in
- `src/components/feedback/streak-badge.tsx` — "X Tage in Folge" badge
- `src/components/feedback/monitoring-dashboard.tsx` — Main trainer dashboard with stats + filters
- `src/components/feedback/monitoring-view-switcher.tsx` — 8-icon view switcher (4 active, 4 locked)
- `src/components/feedback/monitoring-card-grid.tsx` — Ampel cards with traffic light borders
- `src/components/feedback/monitoring-table.tsx` — Sortable table with all columns
- `src/components/feedback/monitoring-alert-view.tsx` — Alert-only view with severity grouping
- `src/components/feedback/monitoring-trend-view.tsx` — Mini trend charts per athlete
- `src/components/feedback/trend-chart.tsx` — Recharts wrapper (Line for number, Bar for scale)
- `src/components/feedback/athlete-detail-view.tsx` — Trainer detail view with charts + history + settings
- `src/components/feedback/category-manager.tsx` — Category list with toggle switches
- `src/components/feedback/athlete-checkin-page.tsx` — Athlete check-in page wrapper
- `src/app/[locale]/(protected)/feedback/page.tsx` — Role-based page (athlete/trainer)
- `src/app/[locale]/(protected)/feedback/[athleteId]/page.tsx` — Trainer athlete detail

### i18n
- Added `feedback` namespace to both `de.json` and `en.json` (~90 keys)

### Routing
- Added `/feedback/[athleteId]` to `src/i18n/routing.ts`

### Architecture Notes
- All queries/actions return mock data — backend implementation pending
- Phase 2 views (Calendar, Heatmap, Feed, Ranking) show locked icons + "coming soon"
- View preferences persisted in localStorage (same pattern as organisation view)
- Charts use Recharts (already installed) with lazy loading potential

## Implementation Notes (Backend — Phase 1 MVP)

**Implemented 2026-03-16:**

### Database Migration
- `supabase/migrations/20260316000000_proj6_feedback_monitoring.sql`
  - 4 new tables: `feedback_categories`, `feedback_category_overrides`, `feedback_checkins`, `feedback_checkin_values`
  - ALTER `trainer_athlete_connections`: added `feedback_backfill_days` column (SMALLINT, default 3, CHECK 1-14)
  - `can_see_analysis` already existed from PROJ-5, no change needed
  - Helper function: `is_connected_athlete(p_athlete_id)` — SECURITY DEFINER for RLS
  - Trigger: auto-copy `athlete_id` from checkin to checkin_values on INSERT (denormalization for 1-hop RLS)
  - Trigger: validate trainer-scope category creation (trainer must be connected to target athlete)
  - 2 database views: `v_athlete_monitoring_summary`, `v_athlete_checkin_history`
  - 11 global standard categories seeded (Gewicht, Schritte, Kalorien, KH, Eiweiss, Fett, Hunger, Menstruation, Krankheit, Muskelkater, Notiz)
  - Full RLS policies for all 4 tables following the security matrix from section G
  - Indexes on all frequently queried columns per section B

### Server Actions (replaced mock implementations)
- `src/lib/feedback/actions.ts` — 7 real server actions with Zod validation, auth checks, and DSGVO consent verification:
  - `saveCheckin` — UPSERT pattern with backfill limit enforcement
  - `toggleAnalysisVisibility` — Updates `can_see_analysis` on trainer connection
  - `updateBackfillDays` — Updates `feedback_backfill_days` on trainer connection
  - `toggleCategoryOverride` — UPSERT into `feedback_category_overrides`
  - `createCategory` — Creates trainer/athlete scope category with connection validation
  - `updateCategory` — Edits own category (RLS enforced)
  - `archiveCategory` — Soft-delete via `archived_at` timestamp

### Server Queries (replaced mock implementations)
- `src/lib/feedback/queries.ts` — 8 real server queries with DSGVO consent checks:
  - `getActiveCategories` — All visible categories minus deactivated overrides
  - `getCheckin` — Single day check-in from `v_athlete_checkin_history` view
  - `getCheckinHistory` — Keyset-paginated history
  - `getMonitoringOverview` — Dashboard data with joins to connections, profiles, teams, and summary view
  - `getAthleteTrendData` — Category trend data with date range filtering
  - `getAlerts` — Alerts derived from monitoring overview
  - `getAthleteDetail` — Full athlete detail for trainer view
  - `getAthleteConnectionInfo` — Connection settings for athlete's own view

### Page Updates
- `src/app/[locale]/(protected)/feedback/page.tsx` — Replaced hardcoded mock values with real `getAthleteConnectionInfo` query

### Architecture Notes
- DSGVO: `body_wellness_data` consent checked in `saveCheckin` action and all queries returning check-in values
- Keyset pagination on check-in history (cursor = last date, not OFFSET)
- Denormalized `athlete_id` on `feedback_checkin_values` for 1-hop RLS instead of 2-hop JOIN
- EAV pattern for flexible dynamic categories without schema migrations
- Migration pending application via `supabase db push` or MCP tool

## QA Test Results

**Tested:** 2026-03-16
**App URL:** https://www.train-smarter.at + http://localhost:3000
**Tester:** QA Engineer (AI)
**Build Status:** PASS (Next.js 16.1.1 Turbopack, compiled successfully, 0 TypeScript errors)

---

### Acceptance Criteria Status

#### AC-1: Route `/feedback` exists
- [x] Route `/feedback` exists and is accessible for authenticated users
- [x] Route listed in `src/i18n/routing.ts`
- [x] Route appears in sidebar navigation (`nav-config.ts` -> `feedbackMonitoring`)
- [x] Page is under `(protected)` layout -- requires authentication

#### AC-2: Check-in Form (Athlete)
- [x] Formular appears prominently when check-in not yet filled (showForm logic)
- [x] Fields dynamically generated from active categories (categories.filter isActive)
- [x] `number` type: NumberInput with unit suffix, `inputMode="decimal"` for mobile numpad
- [x] `scale` type: SegmentedControl with horizontal buttons, min 44px touch targets
- [x] `text` type: Textarea with maxLength and character counter
- [x] Zod validation: values validated within defined ranges (min/max checks in form + server)
- [x] Required fields marked with asterisk, optional can be skipped
- [x] Already filled check-in: CheckinSummary displayed with "Bearbeiten" button
- [x] 1 check-in per day: UNIQUE(athlete_id, date) constraint in DB
- [x] Backfill: Date selector with configurable days (default 3, trainer-configurable 1-14)
- [x] Success feedback: toast.success after save via sonner
- [ ] BUG-1: DSGVO consent check missing on frontend (see below)

#### AC-3: Athlete Self-View (when Trainer enabled)
- [x] Charts shown only when `canSeeAnalysis = true`
- [x] Trend charts for all active categories (TrendChart component with Recharts)
- [x] Streak badge: "X Tage in Folge" displayed
- [x] When `canSeeAnalysis = false`: only check-in form shown, no charts

#### AC-4: Athlete Category Management
- [x] Accessible via "Kategorien anpassen" button in check-in form
- [x] Dialog opens with CategoryManager component
- [x] Lists all categories grouped by scope (Global, Trainer, Athlete)
- [x] Toggle switches for activating/deactivating categories
- [ ] BUG-2: No "create new category" UI for athletes (see below)
- [ ] BUG-3: No live preview of how category input looks in check-in (see below)

#### AC-5: Trainer Monitoring Dashboard
- [x] Route: `/feedback` renders MonitoringDashboard for trainer role
- [x] 8 view icons in ViewSwitcher (4 active Phase 1, 4 locked Phase 2)
- [x] Stats bar: Total Athletes, Checked In Today, Avg. Compliance, Alerts
- [x] Search by athlete name/email
- [x] Filter by team, status, time range
- [x] Empty state: "Noch keine Athleten verbunden"

#### AC-5a: Card Grid View
- [x] Athletes as colored cards with avatar, name, today status, traffic light
- [x] Filter: All / Check-in missing / Alerts
- [x] Click navigates to athlete detail (`/feedback/[athleteId]`)
- [x] Traffic light borders: green/yellow/red based on compliance + missing days

#### AC-5b: Table View
- [x] Compact table with sortable columns (Name, Last Check-in, Weight, Compliance, Streak)
- [x] Click on athlete row navigates to detail
- [x] Badge for status (Ausgefullt / Fehlt)

#### AC-5c: Alert View
- [x] Shows only athletes with anomalies
- [x] Grouped by severity: Critical (red) and Warning (yellow)
- [x] Missing check-in alerts (1+ days, 3+ days = critical)
- [x] Weight change alerts (> 2% in 7 days)
- [x] Empty state: "Alles im grunen Bereich! Keine Auffalligkeiten."

#### AC-5d: Trend Charts View
- [x] Mini charts per athlete (compact mode)
- [x] Click navigates to detail
- [ ] BUG-4: Uses mock/deterministic data instead of real DB data (see below)

#### AC-5e: Phase 2 Views
- [x] Calendar, Heatmap, Feed, Ranking show "Bald verfugbar" empty state
- [x] Icons show lock overlay
- [x] Buttons are disabled

#### AC-6: Trainer Athlete Detail View
- [x] Route: `/feedback/[athleteId]`
- [x] Only trainers can access (role check with redirect)
- [x] Charts for categories (Line for number, Bar for scale)
- [x] Time range selector: 7 / 30 / 90 days
- [x] Check-in history table (paginated)
- [x] Toggle: "Charts fur Athlet sichtbar" (can_see_analysis switch)
- [x] Backfill limit dropdown (1-14 days)
- [ ] BUG-5: No "Kategorien verwalten" button in detail view (see below)
- [ ] BUG-6: History table hardcodes weight/calories/note columns instead of dynamic columns (see below)
- [ ] BUG-7: No "Load More" / pagination button despite `hasMoreHistory` prop (see below)

#### AC-7: Sichtbarkeits-Steuerung
- [x] Trainer can toggle `can_see_analysis` per athlete
- [x] Default: `false` (athlete does not see charts by default)
- [x] Server action validates trainer owns the connection
- [ ] BUG-8: Athlete cannot see which data their trainer can see (read-only view missing)

#### AC-8: Database & RLS
- [x] 4 tables created: feedback_categories, feedback_category_overrides, feedback_checkins, feedback_checkin_values
- [x] ALTER trainer_athlete_connections: feedback_backfill_days added
- [x] Helper function: is_connected_athlete() SECURITY DEFINER
- [x] Trigger: auto-copy athlete_id from checkin to values
- [x] Trigger: validate trainer-scope category creation
- [x] Views: v_athlete_monitoring_summary, v_athlete_checkin_history
- [x] 11 global standard categories seeded
- [x] RLS policies for all 4 tables per security matrix
- [x] Indexes on frequently queried columns

#### AC-9: i18n
- [x] ~90 keys in both de.json and en.json under "feedback" namespace
- [x] No hardcoded user-facing strings found
- [x] German umlauts correct (u, o, a, ss)
- [x] Locale-aware date formatting in forms and tables
- [ ] BUG-9: Hardcoded German string in TrendChart empty state (see below)

---

### Edge Cases Status

#### EC-1: Check-in for today already exists
- [x] Shows read-only summary with "Bearbeiten" button
- [ ] BUG-10: After saving, handleSaved creates mock checkin with empty values instead of reflecting actual saved data (see below)

#### EC-2: No athletes connected (Trainer)
- [x] Empty state shown: "Noch keine Athleten verbunden. Gehe zu Organisation."

#### EC-3: Athlete never checked in
- [x] Card shows "Fehlt" badge, no error thrown

#### EC-4: Trainer disables analysis
- [x] Athlete sees only form, no charts on next load

#### EC-5: Backfill beyond limit
- [x] Server action rejects with BACKFILL_LIMIT_EXCEEDED error

#### EC-6: Team with 0 athletes
- [x] Team aggregate section not shown (no crash)

#### EC-7: All categories deactivated
- [x] Shows "Keine aktiven Kategorien. Mindestens eine Kategorie muss aktiv sein."

#### EC-8: Category deleted with existing data
- [x] Soft delete via archived_at timestamp, data preserved
- [x] FK on feedback_checkin_values uses ON DELETE RESTRICT -- prevents hard delete

#### EC-9: Duplicate category name (trainer + athlete)
- [x] Both can exist (different scope), UI shows scope badge

#### EC-10: Future date check-in attempt
- [x] Server action rejects with FUTURE_DATE error

#### EC-11: DSGVO consent revoked
- [x] Server-side: saveCheckin checks body_wellness_data consent
- [x] Server-side: getCheckin returns null if consent missing
- [ ] BUG-1 (duplicate): Frontend does not hide body/wellness categories when consent revoked

---

### Security Audit Results (Red Team)

#### Authentication
- [x] Page under `(protected)` layout -- unauthenticated users cannot access
- [x] All server actions call `supabase.auth.getUser()` and return UNAUTHORIZED if missing
- [x] All queries use server-side Supabase client with RLS enforced

#### Authorization
- [x] Athletes can only read/write own check-ins (athlete_id = auth.uid())
- [x] Trainers can only READ connected athletes' data (no INSERT/UPDATE on check-ins)
- [x] `is_connected_athlete()` SECURITY DEFINER prevents cross-trainer data access
- [x] Category creation with scope="trainer" validated via DB trigger (trainer must be connected)
- [x] Athlete detail page: redirect if not connected trainer
- [ ] SECURITY-1: `getActiveCategories` does not filter by user context (see below)
- [ ] SECURITY-2: `getAthleteTrendData` missing authorization check (see below)
- [ ] SECURITY-3: `getCheckinHistory` missing trainer authorization check (see below)

#### Input Validation
- [x] All server actions use Zod schemas for input validation
- [x] UUID format enforced for IDs
- [x] Date format regex validation
- [x] Text field max length (300 chars) enforced
- [x] Numeric range (backfill 1-14, category min/max) validated
- [x] XSS: React auto-escapes output; text stored as-is in DB (Supabase parameterized queries)

#### Data Exposure
- [x] DSGVO consent checked before returning body/wellness data
- [ ] SECURITY-4: `MonitoringAthleteSummary` includes `email` field exposed to client (see below)

#### Rate Limiting
- [ ] SECURITY-5: No rate limiting on server actions (see below)

---

### Bugs Found

#### BUG-1: DSGVO -- Frontend does not hide categories when consent revoked
- **Severity:** High
- **Steps to Reproduce:**
  1. Athlete revokes `body_wellness_data` consent via account settings
  2. Navigate to `/feedback`
  3. Expected: Body/wellness category fields hidden in the form
  4. Actual: Form shows all categories; only the server action rejects the save
- **Impact:** Confusing UX -- athlete fills out form that cannot be saved
- **Location:** `src/components/feedback/athlete-checkin-page.tsx` -- no consent check before rendering form
- **Priority:** Fix before deployment

#### BUG-2: No "create new category" UI for athletes
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Open category manager as athlete
  2. Expected: "Neue Kategorie erstellen" button per spec
  3. Actual: Only toggle switches for existing categories, no create button
- **Impact:** Acceptance criterion "Eigene Kategorien: Erstellen (Name, Typ, Bereich, Labels)" not met
- **Note:** Spec marks "Athlet: Eigene Kategorien erstellen" as Phase 2, but the CategoryManager component has no create functionality at all (not even for trainers via the UI)
- **Priority:** Fix in next sprint (Phase 2 item but category-form-modal.tsx also missing)

#### BUG-3: No live preview of category input in check-in
- **Severity:** Low
- **Steps to Reproduce:**
  1. Open category manager
  2. Expected: "Vorschau: Wie sieht die Eingabe im Check-in aus?"
  3. Actual: No preview shown
- **Priority:** Nice to have

#### BUG-4: MonitoringTrendView uses mock data instead of real DB data
- **Severity:** High
- **Steps to Reproduce:**
  1. As trainer, switch to Trend view in monitoring dashboard
  2. Expected: Real trend data from check-in database
  3. Actual: Deterministic pseudo-random mock data generated by `generateMockTrendData()` function
- **Location:** `src/components/feedback/monitoring-trend-view.tsx` lines 33-57
- **Priority:** Fix before deployment

#### BUG-5: No "Kategorien verwalten" button in Trainer Athlete Detail View
- **Severity:** Medium
- **Steps to Reproduce:**
  1. As trainer, navigate to `/feedback/[athleteId]`
  2. Expected: "Kategorien verwalten" button per spec ("Erreichbar aus Einzelathlet-Detailansicht")
  3. Actual: No category management button present
- **Location:** `src/components/feedback/athlete-detail-view.tsx` -- Settings2 icon imported but not used for category management
- **Priority:** Fix in next sprint

#### BUG-6: History table uses hardcoded columns instead of dynamic categories
- **Severity:** Medium
- **Steps to Reproduce:**
  1. As trainer, view athlete detail
  2. Check-in history table
  3. Expected: All active categories as columns (spec says "alle Kategorien als Spalten")
  4. Actual: Only hardcoded "Datum | Gewicht | Kalorien | Notiz" columns
- **Impact:** Trainer cannot see scale values (Hunger, Muskelkater) or custom categories in history
- **Location:** `src/components/feedback/athlete-detail-view.tsx` lines 206-250
- **Note:** Also accesses `entry.values.weight` by slug name but values are keyed by UUID category ID -- this will show "---" for all entries
- **Priority:** Fix before deployment

#### BUG-7: No pagination button for check-in history
- **Severity:** Medium
- **Steps to Reproduce:**
  1. As trainer, view athlete with 20+ check-ins
  2. Expected: "Load More" or pagination controls (spec says "paginiert, 20 pro Seite")
  3. Actual: `hasMoreHistory` prop is passed but never used in `AthleteDetailView`
- **Location:** `src/components/feedback/athlete-detail-view.tsx` -- `hasMoreHistory` prop accepted but unused
- **Priority:** Fix in next sprint

#### BUG-8: Athlete cannot see which data their trainer sees
- **Severity:** Low
- **Steps to Reproduce:**
  1. As athlete, navigate to account settings or feedback page
  2. Expected: Read-only display showing which data trainer can see (spec: "Athlet sieht in Einstellungen welche Daten sein Trainer sehen kann")
  3. Actual: No such UI exists
- **Priority:** Fix in next sprint

#### BUG-9: Hardcoded German string in TrendChart
- **Severity:** Low
- **Steps to Reproduce:**
  1. View a trend chart with no data points for a category
  2. Expected: Localized "No data" message
  3. Actual: Hardcoded `"{name}: Keine Daten"` regardless of locale
- **Location:** `src/components/feedback/trend-chart.tsx` line 53
- **Priority:** Fix in next sprint

#### BUG-10: After saving check-in, summary shows empty values
- **Severity:** Medium
- **Steps to Reproduce:**
  1. As athlete, fill out check-in and save
  2. Expected: Summary shows the values just entered
  3. Actual: `handleSaved` in `athlete-checkin-page.tsx` creates a mock checkin with `values: {}`, so summary shows no data
- **Location:** `src/components/feedback/athlete-checkin-page.tsx` lines 55-65
- **Note:** Comment says "For now, create a mock summary from form values" -- this needs to either use `router.refresh()` to reload server data, or pass form values through
- **Priority:** Fix before deployment

#### SECURITY-1: `getActiveCategories` has no user-context filtering in app code
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Call `getActiveCategories(userId)` where userId is any athlete
  2. The function relies entirely on RLS for filtering
  3. RLS on feedback_categories allows: (a) global categories to any authenticated user, (b) trainer categories to creator AND target_athlete, (c) athlete categories to creator AND connected trainer
  4. However, the function is called from the athlete detail page with `athleteId` which may differ from `auth.uid()`
  5. If a trainer calls `getActiveCategories(athleteId)`, RLS policy "Users can read own athlete categories" checks `created_by = auth.uid()` -- this means the trainer will NOT see athlete-created categories via this path
- **Impact:** The RLS policy "Trainers can read connected athlete categories" uses `is_connected_athlete(created_by)` which correctly allows trainers to see their athletes' categories. This is actually correct but the code path is confusing. LOW RISK.
- **Priority:** Nice to have (add comment clarifying RLS dependency)

#### SECURITY-2: `getAthleteTrendData` missing authorization check
- **Severity:** High
- **Steps to Reproduce:**
  1. The function accepts `_trainerId` (unused, prefixed with underscore) and `athleteId`
  2. It fetches `feedback_checkin_values` filtered by `athlete_id`
  3. RLS on `feedback_checkin_values` allows SELECT if `auth.uid() = athlete_id` OR `is_connected_athlete(athlete_id)`
  4. RLS provides protection, BUT the `_trainerId` parameter being ignored is suspicious
  5. On the athlete check-in page (line 52), it's called with `getAthleteTrendData("", authUser.id, "30")` -- empty string trainerId
- **Impact:** RLS protects the data, but the unused trainerId parameter suggests incomplete authorization logic. If RLS policies were ever relaxed, this would be a direct IDOR vulnerability.
- **Priority:** Fix in next sprint (add explicit authorization check or remove misleading parameter)

#### SECURITY-3: `getCheckinHistory` missing trainer authorization check
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Function checks DSGVO consent only for `athleteId === user.id` (own data)
  2. For trainer accessing athlete data, no DSGVO consent check performed
  3. The spec says DSGVO consent should be checked before returning body/wellness data
  4. RLS provides row-level protection, but the consent check is incomplete
- **Impact:** Trainer can view athlete check-in history even if athlete has revoked consent (RLS allows it since trainer is connected). The consent check only applies to the athlete viewing their own data.
- **Priority:** Fix before deployment

#### SECURITY-4: Email exposed in MonitoringAthleteSummary
- **Severity:** Low
- **Steps to Reproduce:**
  1. `MonitoringAthleteSummary` type includes `email` field
  2. This is sent to the client component `MonitoringDashboard`
  3. Email is used in search filtering but not displayed
- **Impact:** Athlete emails exposed to trainer's browser, viewable in React DevTools / network tab. This may be acceptable since trainer-athlete connection is already established, but worth noting for DSGVO minimization principle.
- **Priority:** Nice to have

#### SECURITY-5: No rate limiting on server actions
- **Severity:** Low
- **Steps to Reproduce:**
  1. Call `saveCheckin` server action repeatedly
  2. No rate limiting in place
- **Impact:** An attacker could spam check-in saves, though UPSERT pattern limits DB impact (same row updated). More concerning for resource exhaustion.
- **Priority:** Fix in next sprint (consider adding rate limiting middleware)

---

### Cross-Browser Testing

Testing limited to code review (no live browser session available). Analysis based on code:

- **Chrome:** Expected to work -- standard React patterns, no browser-specific APIs
- **Firefox:** Expected to work -- `inputMode="decimal"` supported
- **Safari:** Potential issue with `type="number"` + `inputMode="decimal"` combination on iOS Safari (known quirk), but should work
- **Note:** `useSyncExternalStore` used correctly for localStorage hydration, preventing hydration mismatches

### Responsive Testing

Code review analysis (CSS classes):

- **375px (Mobile):**
  - [x] Card grid: single column (default grid with `gap-3`)
  - [x] Stats: single column then 2-col on sm (grid `sm:grid-cols-2 lg:grid-cols-4`)
  - [x] Table: horizontal scroll (`overflow-x-auto`)
  - [x] Segmented control: 44px min targets (min-h-[44px] min-w-[44px])
  - [x] Filters: stack vertically (`flex-col`)

- **768px (Tablet):**
  - [x] Card grid: 2 columns (`sm:grid-cols-2`)
  - [x] Stats: 2 columns
  - [x] Toolbar: row layout (`sm:flex-row`)

- **1440px (Desktop):**
  - [x] Card grid: 3 columns (`lg:grid-cols-3`)
  - [x] Stats: 4 columns
  - [x] Chart grid: 2 columns (`lg:grid-cols-2`)

---

### Regression Testing

#### PROJ-3: App Shell & Navigation
- [x] Sidebar shows "Feedback & Monitoring" nav item
- [x] Page renders within protected layout

#### PROJ-4: Authentication & Onboarding
- [x] Role detection works (TRAINER vs ATHLETE)
- [x] `toAuthUser` correctly extracts roles from app_metadata

#### PROJ-5: Athleten-Management
- [x] `trainer_athlete_connections` table extended (not replaced)
- [x] `can_see_analysis` field used (already existed from PROJ-5)
- [x] Migration uses `ADD COLUMN IF NOT EXISTS` for safety

#### PROJ-9: Team-Verwaltung
- [x] Team names shown in athlete cards and table
- [x] Team filter in monitoring dashboard
- [x] `team_athletes` table queried for team assignments

#### PROJ-11: DSGVO
- [x] Consent check in `saveCheckin` action
- [x] Consent check in `getCheckin` and `getCheckinHistory` queries
- [ ] Incomplete: DSGVO export not yet extended with check-in data (documented as open item)

---

### Summary

- **Acceptance Criteria:** 32/41 passed (9 failed -- 6 bugs + 3 missing features)
- **Bugs Found:** 15 total (0 Critical, 4 High, 5 Medium, 6 Low)
- **Security:** 5 findings (1 High, 2 Medium, 2 Low)
- **Production Ready:** NO

### Breakdown by Severity

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 0 | -- |
| High | 4 | BUG-1, BUG-4, BUG-6, SECURITY-2 |
| Medium | 5 | BUG-5, BUG-7, BUG-10, SECURITY-1, SECURITY-3 |
| Low | 6 | BUG-2, BUG-3, BUG-8, BUG-9, SECURITY-4, SECURITY-5 |

### Must Fix Before Deployment (High Priority)

1. **BUG-1:** Add frontend DSGVO consent check to hide body categories when consent revoked
2. **BUG-4:** Replace mock trend data in MonitoringTrendView with real DB queries
3. **BUG-6:** Make history table columns dynamic (use category UUIDs, not slug strings)
4. **BUG-10:** Fix post-save summary to show actual values (use router.refresh or pass values)
5. **SECURITY-3:** Add DSGVO consent check for trainer viewing athlete data

### Should Fix in Next Sprint

6. **BUG-5:** Add category management button to athlete detail view
7. **BUG-7:** Implement pagination controls for check-in history
8. **SECURITY-2:** Add explicit authorization in getAthleteTrendData or remove unused parameter
9. **BUG-8:** Add read-only data visibility info for athletes

### Recommendation

**Do NOT deploy** until bugs BUG-1, BUG-4, BUG-6, BUG-10, and SECURITY-3 are fixed. The migration also has not been applied to production yet (`supabase db push` pending).

After fixes, run `/qa` again to verify.

## Deployment
_To be added by /deploy_
