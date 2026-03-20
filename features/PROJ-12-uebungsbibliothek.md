# PROJ-12: Übungsbibliothek

## Status: Planned
**Created:** 2026-03-12
**Last Updated:** 2026-03-20

## Dependencies
- Requires: PROJ-1 (Design System Foundation)
- Requires: PROJ-2 (UI Component Library) — Card, Modal, Button, Input, Badge, EmptyState, Sheet
- Requires: PROJ-3 (App Shell & Navigation) — Tab innerhalb /training
- Requires: PROJ-4 (Authentication) — Trainer-Session + Rolle
- Informs: PROJ-7 (Training Workspace) — Übungen werden in Trainingsplanung verwendet
- Informs: PROJ-10 (Admin-Bereich) — Admin verwaltet globale Übungen + Kategorien (teilt dieselben Tabellen)

## Navigation-Kontext
Übungsbibliothek ist ein **Tab innerhalb der Training-Sektion**:

```
/training
  /                ← Training Workspace (PROJ-7)
  /calendar        ← Trainingskalender (PROJ-8)
  /exercises       ← Übungsbibliothek (PROJ-12)
```

## Übersicht

Trainer haben Zugang zu einer zweigeteilten Übungsbibliothek: **globale Übungen** (vom Admin gepflegt, für alle Trainer verfügbar) und **eigene Übungen** (nur in der eigenen Bibliothek sichtbar). Trainer können globale Übungen direkt 1:1 verwenden oder als eigene Kopie klonen und anpassen. Alle Übungen — global wie personal — stehen in der Trainingsplanung (PROJ-7) zur Verfügung.

### Hierarchisches Kategorie-System (Admin/Trainer-Pattern)

Das Kategorie-System folgt demselben Muster wie die Feedback-Kategorien (PROJ-6/PROJ-18):
- **Admin** erstellt und verwaltet globale Kategorien (Muskelgruppen, Equipment, etc.) → gelten als Default für alle Trainer
- **Trainer** können globale Kategorien verwenden (read-only) UND eigene Kategorien erstellen (nur für sich sichtbar)
- Dieses Know-How-System wird ein Herzstück der Webapp und über die Zeit immer umfangreicher

### Hauptkategorien (Übungstypen)

Vier Hauptkategorien, genau eine pro Übung:
1. **Kraft** — Start-Fokus, mit Muskelgruppen + Equipment als Unterkategorien
2. **Ausdauer** — spätere Ausbaustufe
3. **Schnelligkeit** — spätere Ausbaustufe
4. **Beweglichkeit** — spätere Ausbaustufe

**MVP-Scope:** Nur Kraft-Übungen mit Muskelgruppen + Equipment. Die restlichen Hauptkategorien und deren spezifische Unterkategorien werden in späteren Iterationen entwickelt.

## User Stories

### Trainer: Bibliothek durchsuchen
- Als Trainer möchte ich alle verfügbaren Übungen (global + meine eigenen) in einer einheitlichen Bibliothek sehen, damit ich schnell die richtige Übung finde
- Als Trainer möchte ich Übungen nach Hauptkategorie, Muskelgruppe, Equipment und Name filtern, damit ich die passende Übung finde
- Als Trainer möchte ich in einem Slide-Over Panel die Details einer Übung sehen (Name, Beschreibung, Muskelgruppen, Equipment), damit ich entscheiden kann ob ich sie verwenden will

### Trainer: Eigene Übungen verwalten
- Als Trainer möchte ich eigene Übungen anlegen mit Name (de/en), Beschreibung, Muskelgruppen (primär + sekundär) und Equipment, damit ich spezifische Übungen für mein Training verwenden kann
- Als Trainer möchte ich eigene Übungen bearbeiten und löschen, damit meine Bibliothek aktuell bleibt
- Als Trainer möchte ich eine globale Übung klonen und für mich anpassen, damit ich sie mit meiner eigenen Beschreibung oder Variante speichern kann
- Als Trainer möchte ich eigene Muskelgruppen und Equipment-Einträge erstellen die nur ich sehen kann, falls die globale Liste nicht ausreicht

### Trainer: Globale Übungen nutzen
- Als Trainer möchte ich globale Übungen direkt ohne Klonen in der Trainingsplanung verwenden, damit ich keine unnötige Kopie anlegen muss
- Als Trainer möchte ich globale Übungen in der Detail-Ansicht als „Platform" gekennzeichnet sehen, damit ich weiß dass diese vom Admin gepflegt werden

### Admin: Globale Inhalte verwalten (Abgrenzung zu PROJ-10)
- Als Admin möchte ich globale Muskelgruppen, Equipment und Übungen verwalten, damit alle Trainer eine konsistente Basis haben
- _Hinweis: Die Admin-UI wird in PROJ-10 gebaut. PROJ-12 baut nur die Trainer-Perspektive + das geteilte Datenmodell._

## Acceptance Criteria

### Figma Screens
- [ ] Figma Screen: Übungsbibliothek-Tab (Liste mit Filter/Suche, Desktop + Mobile)
- [ ] Figma Screen: Übung erstellen/bearbeiten (Slide-Over Panel)
- [ ] Figma Screen: Übungs-Detail-Ansicht (Slide-Over, globale Übung mit „Klonen"-Option)
- [ ] Figma Screen: Leerer Zustand (keine eigenen Übungen, noch keine globalen vorhanden)

### Übungsbibliothek-Übersicht
- [ ] Route: `/training/exercises`
- [ ] Nur für Trainer und Admin sichtbar (Athleten haben keinen Zugang)
- [ ] Tab-Navigation: Zusammen mit Training Workspace und Kalender (PROJ-7/PROJ-8)
- [ ] Zwei Sektionen in einer Ansicht:
  - **Globale Übungen** (Badge „Platform") — vom Admin erstellt, read-only für Trainer
  - **Meine Übungen** (Badge „Eigene") — vom Trainer selbst erstellt oder geklont
- [ ] Darstellung: Liste oder Grid (umschaltbar via ViewSwitcher), Card zeigt: Name (lokalisiert), primäre Muskelgruppen-Tags, Equipment-Tags, Quelle (Platform / Eigene), Hauptkategorie-Badge
- [ ] Suche: Live-Suche nach Übungsname (über beide Sektionen gleichzeitig, durchsucht beide Sprachen)
- [ ] Filter: Hauptkategorie (Single-Select), Muskelgruppe (Multi-Select), Equipment (Multi-Select), Quelle (Alle / Nur Platform / Nur Eigene)
- [ ] Sortierung: Alphabetisch A–Z / Z–A, Zuletzt erstellt
- [ ] Button „Neue Übung erstellen" (primary, oben rechts)
- [ ] Leerer Zustand Eigene Übungen: EmptyState-Komponente „Du hast noch keine eigenen Übungen — erstelle deine erste oder verwende eine Platform-Übung"
- [ ] Leerer Zustand gesamt (keine Ergebnisse bei Suche/Filter): „Keine Übungen gefunden"

### Übungs-Detail-Ansicht (Slide-Over Panel)
- [ ] Klick auf eine Übung öffnet ein Slide-Over Panel von rechts
- [ ] Liste bleibt links sichtbar (Desktop), Panel gleitet über die Liste (Mobile)
- [ ] Panel zeigt: Name (lokalisiert), Beschreibung, Hauptkategorie-Badge, primäre Muskelgruppen, sekundäre Muskelgruppen, Equipment, Quelle (Platform/Eigene)
- [ ] Globale Übung: „In meine Bibliothek kopieren" Button + read-only Hinweis
- [ ] Eigene Übung: „Bearbeiten" und „Löschen" Buttons
- [ ] Video-Bereich: Platzhalter „Video kommt in einer zukünftigen Version" (TODO für spätere Iteration)

### Übung erstellen (Trainer-Personal)
- [ ] Öffnet im Slide-Over Panel (gleicher Panel wie Detail, aber im Edit-Modus)
- [ ] Felder:
  - Name DE (Pflicht, max 100 Zeichen)
  - Name EN (Pflicht, max 100 Zeichen)
  - Beschreibung DE (optional, Textarea max 2000 Zeichen)
  - Beschreibung EN (optional, Textarea max 2000 Zeichen)
  - Hauptkategorie (Single-Select: Kraft/Ausdauer/Schnelligkeit/Beweglichkeit, Pflicht)
  - Primäre Muskelgruppen (Multi-Select aus globalen + eigenen Muskelgruppen)
  - Sekundäre Muskelgruppen (Multi-Select, optional)
  - Equipment (Multi-Select aus globalen + eigenen Equipment-Einträgen, optional)
- [ ] Validierung: Name DE + EN dürfen nicht leer sein, Hauptkategorie Pflicht
- [ ] Duplikat-Prüfung innerhalb eigener Bibliothek: Warnung „Du hast bereits eine Übung mit diesem Namen" — nicht blockierend
- [ ] Nach Speichern: Übung erscheint sofort in „Meine Übungen" Sektion

### Übung bearbeiten und löschen (nur eigene Übungen)
- [ ] Bearbeiten: Alle Felder editierbar (Name de/en, Beschreibung de/en, Hauptkategorie, Muskelgruppen, Equipment)
- [ ] Löschen: Soft-Delete mit ConfirmDialog „Diese Übung löschen? Sie wird aus deiner Bibliothek entfernt, bleibt aber in bestehenden Trainingsplänen erhalten."
- [ ] Globale Übungen: Kein Bearbeiten- oder Löschen-Button sichtbar (read-only)

### Globale Übung klonen
- [ ] Button „In meine Bibliothek kopieren" auf jeder globalen Übung (im Slide-Over Panel)
- [ ] Klon wird sofort in „Meine Übungen" gespeichert mit Suffix „(Kopie)" / „(Copy)" am Namen — editierbar
- [ ] Alle Felder der Original-Übung werden übernommen, danach vollständig editierbar
- [ ] Klon ist unabhängig vom Original: Änderungen am Original (durch Admin) aktualisieren die Kopie **nicht**
- [ ] Klon ist als eigene Übung markiert (Badge „Eigene"), nicht mehr als „Platform"
- [ ] Mehrfaches Klonen derselben Übung: Warnung „Du hast diese Übung bereits geklont" — nicht blockierend

### Kategorie-Verwaltung (Muskelgruppen + Equipment)
- [ ] Trainer kann eigene Muskelgruppen erstellen (nur für sich sichtbar)
- [ ] Trainer kann eigene Equipment-Einträge erstellen (nur für sich sichtbar)
- [ ] Globale Muskelgruppen + Equipment (vom Admin) sind für alle Trainer les-bar, nicht editierbar
- [ ] Eigene Kategorien können bearbeitet und gelöscht werden
- [ ] Eigene Kategorien erscheinen neben globalen im Multi-Select (mit Badge „Eigene")
- [ ] i18n: Globale Kategorien sind zweisprachig (name: { de, en }), eigene ebenfalls
- [ ] Erstellen eigener Kategorien: kleines Inline-Formular am Ende des Multi-Selects (+ Button → Textfeld → Speichern)

### Integration Training Workspace (PROJ-7) — Vorbereitung
- [ ] Beim Hinzufügen einer Übung im Training Workspace: Übungs-Picker zeigt globale + eigene Übungen
- [ ] Übungs-Picker hat dieselbe Suche/Filter-Logik wie die Bibliothek
- [ ] Gelöschte eigene Übungen in bestehenden Plänen: werden als „[Übung gelöscht]" angezeigt (kein Hard-Delete)
- [ ] Gelöschte globale Übungen (Admin Soft-Delete): werden in bestehenden Plänen als „[Übung entfernt]" angezeigt

### i18n
- [ ] Alle neuen Strings in `de.json` + `en.json`
- [ ] Namespace: `exercises` (neu)
- [ ] Übungsnamen + Beschreibungen sind strukturiert zweisprachig: `{ de: string, en: string }` (wie Feedback-Kategorien)
- [ ] Deutsche Umlaute korrekt (ä, ö, ü, ß)

## Edge Cases

1. **Trainer löscht eigene Übung die in aktivem Trainingsplan verwendet wird** → Soft-Delete, Plan zeigt „[Übung gelöscht]" Placeholder, kein Datenverlust
2. **Admin löscht globale Übung die ein Trainer direkt (ohne Klonen) in einem Plan verwendet** → Plan zeigt „[Übung entfernt]" Placeholder
3. **Trainer klont eine globale Übung, Admin ändert danach die Original-Übung** → Klon ist unberührt (isolierter Snapshot)
4. **Übungs-Picker im Training Workspace: mehr als 200 Übungen** → Pagination oder virtualisierte Liste
5. **Trainer-Account gelöscht (PROJ-11)** → eigene Übungen werden mit Account gelöscht (Soft-Delete), Pläne behalten Placeholder
6. **Trainer erstellt eigene Muskelgruppe die identisch zu einer globalen heißt** → Erlaubt, aber Warnung „Eine globale Muskelgruppe mit diesem Namen existiert bereits"
7. **Admin fügt neue globale Muskelgruppe hinzu** → Sofort für alle Trainer sichtbar im Multi-Select
8. **Trainer hat 0 Übungen und filtert nach einer Kategorie** → EmptyState mit Hinweis zum Erstellen
9. **Suche findet Treffer in der anderen Sprache** → Suche durchsucht beide Sprachfelder (de + en)
10. **Hauptkategorie wird später geändert (z.B. Kraft → Ausdauer)** → Erlaubt, alle verknüpften Daten bleiben erhalten

## Technical Requirements

- Security: RLS — Trainer kann ausschließlich seine eigenen Übungen (`created_by = trainer_id`) schreiben/löschen. Globale Übungen (`scope = 'global'`) sind für alle Trainer les-bar, aber nur via Admin (platform_admin) schreibbar
- Security: RLS auf Kategorien-Tabellen — gleicher Scope-Mechanismus (global = read-only für Trainer, eigene = CRUD)
- Performance: Übungs-Suche filtert client-seitig bei < 200 Übungen, server-seitig bei mehr
- Performance: Bibliothek lädt in < 500ms (initialer Load, ohne Suche)
- Soft-Delete: Übungen werden nie hart gelöscht — `is_deleted = true` + `deleted_at` Timestamp
- Datenmodell: Backend-Agent entscheidet über normalisiert vs. JSON (Ziel: zukunftssicher + hoch anpassbar)
- i18n: Alle Namen/Beschreibungen als `jsonb { de, en }` (wie `feedback_categories.name`)

## Datenbankschema (Konzept — Backend-Agent finalisiert)

### Kernprinzip
Das Kategorie-System (Muskelgruppen, Equipment, Hauptkategorien) soll:
- Normalisiert und erweiterbar sein
- Admin/Trainer-Scope unterstützen (global vs. personal)
- Zweisprachig sein (de/en als JSONB)
- Für zukünftige Unterkategorien erweiterbar sein (z.B. Ausdauer-spezifische Felder)

### Tabellen (grob)

```
exercises
├── id: uuid (PK)
├── name: jsonb { de, en }          — zweisprachig
├── description: jsonb { de, en } | null
├── exercise_type: text             — 'strength' | 'endurance' | 'speed' | 'flexibility'
├── scope: text                     — 'global' | 'trainer'
├── created_by: uuid | null         — null = Platform (Admin), uuid = Trainer-ID
├── cloned_from: uuid | null        — FK → exercises.id (wenn Klon)
├── is_deleted: boolean (default: false)
├── deleted_at: timestamptz | null
├── created_at: timestamptz
└── updated_at: timestamptz

exercise_taxonomy                    — normalisierte Kategorien (Muskelgruppen, Equipment, etc.)
├── id: uuid (PK)
├── name: jsonb { de, en }
├── type: text                       — 'muscle_group' | 'equipment' | (zukünftig: 'movement_pattern' etc.)
├── scope: text                      — 'global' | 'trainer'
├── created_by: uuid | null
├── sort_order: integer
├── is_deleted: boolean
├── created_at: timestamptz
└── updated_at: timestamptz

exercise_taxonomy_assignments        — Junction-Tabelle: Übung ↔ Kategorie
├── id: uuid (PK)
├── exercise_id: uuid (FK → exercises)
├── taxonomy_id: uuid (FK → exercise_taxonomy)
├── is_primary: boolean (default: true) — true = primäre Muskelgruppe, false = sekundäre
└── created_at: timestamptz
```

### Sichtbarkeits-Regeln (RLS)

| Entity | Wer sieht | Wer kann schreiben |
|--------|-----------|-------------------|
| `exercises` scope='global' | Alle Trainer (read) | Nur Admin (platform_admin) |
| `exercises` scope='trainer', created_by=X | Nur Trainer X | Nur Trainer X |
| `exercise_taxonomy` scope='global' | Alle Trainer (read) | Nur Admin |
| `exercise_taxonomy` scope='trainer', created_by=X | Nur Trainer X | Nur Trainer X |

### Abgrenzung PROJ-12 vs. PROJ-10

| | PROJ-12 (Trainer-Bibliothek) | PROJ-10 (Admin-Bereich) |
|---|---|---|
| Route | `/training/exercises` | `/admin/exercises` |
| Zielgruppe | Trainer (eigene + globale anzeigen) | Platform-Admin (nur globale verwalten) |
| Schreiben | Eigene Übungen + eigene Kategorien | Globale Übungen + globale Kategorien |
| Datengrundlage | Dieselben Tabellen | Dieselben Tabellen |

## Initiale Kategorie-Daten (Seed via Admin, nicht via Migration)

### Muskelgruppen (global, vom Admin angelegt)
Brust, Rücken, Schultern, Bizeps, Trizeps, Unterarme, Quadrizeps, Hamstrings, Waden, Gluteus, Core, Nacken

### Equipment (global, vom Admin angelegt — minimal starten)
Langhantel, Kurzhantel, Kettlebell, Körpergewicht, Maschine, Kabelzug

### Hauptkategorien
Fest im Code (`exercise_type` Enum): strength, endurance, speed, flexibility
_Keine eigene Tabelle — die 4 Typen sind im Schema als CHECK constraint definiert._

## Offene Punkte (für spätere Iterationen)

- [ ] **Video-Einbettung:** YouTube/Vimeo URLs als embedded Player vs. externer Link (entscheiden wenn umgesetzt)
- [ ] **Ausdauer-Übungen:** Eigene Unterkategorien (Distanz, Dauer, Intensitäts-Zonen)
- [ ] **Schnelligkeit-Übungen:** Eigene Unterkategorien (Reaktionszeit, Sprint-Distanz)
- [ ] **Beweglichkeit-Übungen:** Eigene Unterkategorien (Haltezeit, Dehnungsart)
- [ ] **Übungs-Bilder:** Upload-Funktion für Übungsfotos (aktuell nur Video-URL Platzhalter)
- [ ] **Übungs-Vorschau im Plan:** Inline-Preview der Übungsbeschreibung beim Hovern im Trainingsplan
- [ ] **Import/Export:** CSV/JSON Import für Bulk-Upload von Übungen

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
