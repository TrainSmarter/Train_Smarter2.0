# PROJ-20: Hierarchisches Übungs-Taxonomie-System

## Status: Planned
**Created:** 2026-03-22
**Last Updated:** 2026-03-22
**Priority:** P0 (MVP)

## Vision

Das hierarchische Taxonomie-System ist das **Herzstück der Wissensdatenbank** von Train Smarter. Es ersetzt das bisherige flache Kategorie-System (nur Muskelgruppe + Equipment) durch ein mehrdimensionales, beliebig tiefes Klassifikationssystem. Der Admin kann unabhängige Kategorie-Dimensionen (Bewegungsmuster, Equipment, Gelenke, Lateralität, etc.) erstellen — jede mit einem eigenen hierarchischen Baum. Verschiedene Übungsarten (Kraft, Ausdauer, Schnelligkeit, Beweglichkeit) können jeweils eigene Dimensionen haben. Langfristig bildet diese Taxonomie die Grundlage, auf der die KI Übungen versteht, klassifiziert und empfiehlt.

## Dependencies

- **Requires:** PROJ-12 (Übungsbibliothek) — Übungen + bisherige Taxonomie
- **Requires:** PROJ-10 (Admin-Bereich) — Admin-UI für Taxonomie-Verwaltung
- **Informs:** PROJ-19 (KI-Übungserstellung) — KI nutzt Taxonomie als Wissenskontext
- **Informs:** PROJ-7 (Training Workspace) — Übungskategorisierung für Trainingsplanung
- **Informs:** PROJ-15 (Globale Suche) — Suche über Taxonomie-Hierarchien

## User Stories

### Admin — Taxonomie-Verwaltung

- **US-01:** Als Admin möchte ich **neue Kategorie-Dimensionen anlegen** (z.B. "Bewegungsmuster", "Gelenke"), damit ich unabhängige Klassifikationsachsen für Übungen definieren kann.
- **US-02:** Als Admin möchte ich **Dimensionen an eine Übungsart binden** (z.B. "Bewegungsmuster" nur für Kraft-Übungen) oder als übergreifend markieren (z.B. Equipment für alle), damit die richtige Taxonomie bei der richtigen Übungsart erscheint.
- **US-03:** Als Admin möchte ich **beliebig tiefe Kategorie-Bäume** innerhalb einer Dimension erstellen (z.B. Kraft > Main > Upper > Push > Vertical), damit ich mein Fachwissen vollständig abbilden kann.
- **US-04:** Als Admin möchte ich **Knoten umbenennen, verschieben und löschen**, damit ich die Taxonomie jederzeit anpassen und erweitern kann.
- **US-05:** Als Admin möchte ich **Knoten per Drag-and-Drop innerhalb einer Ebene sortieren**, damit die Reihenfolge meiner Logik entspricht.
- **US-06:** Als Admin möchte ich **pro Knoten festlegen, ob er für Trainer sichtbar ist** (`trainerVisible`-Flag), damit Trainer nur eine vereinfachte Ansicht sehen.
- **US-07:** Als Admin möchte ich **KI-Hinweise pro Knoten hinterlegen** (`aiHint`), damit die KI den Kontext jeder Kategorie versteht.
- **US-08:** Als Admin möchte ich **bilingual (DE/EN) Knoten-Namen und -Beschreibungen** pflegen, damit die Taxonomie in beiden Sprachen funktioniert.

### Admin — Übung kategorisieren

- **US-09:** Als Admin möchte ich beim **Erstellen/Bearbeiten einer Übung Knoten aus mehreren Dimensionen gleichzeitig** zuweisen (z.B. Bewegungsmuster: "Main > Upper > Push > Vertical" UND Equipment: "Langhantel" UND Gelenk: "Schulter"), damit Übungen mehrdimensional klassifiziert werden.
- **US-10:** Als Admin möchte ich in der **Übungsbibliothek nach Taxonomie-Knoten filtern** (inkl. Unterkategorien: "alle Push-Übungen" zeigt auch Vertical/Horizontal/Lateral), damit ich schnell finde was ich suche.

### Trainer — Vereinfachte Ansicht

- **US-11:** Als Trainer möchte ich beim **Kategorisieren einer Übung vereinfachte Dropdown-Selektoren** sehen (nur Top-2-3 Ebenen, Breadcrumb-Prefix), damit ich nicht von der Komplexität überfordert werde.
- **US-12:** Als Trainer möchte ich in der **Übungsbibliothek nach Dimensionen filtern**, auch wenn ich die volle Tiefe der Taxonomie nicht sehe.

### KI-Integration

- **US-13:** Als System möchte ich der **KI den kompletten Taxonomie-Baum als Kontext mitgeben**, damit sie Übungen automatisch in die richtigen Kategorien einordnen kann.
- **US-14:** Als Admin möchte ich, dass die **KI beim Erstellen einer Übung automatisch passende Knoten** aus allen relevanten Dimensionen vorschlägt.

## Acceptance Criteria

### Dimensionen

- [ ] AC-01: Admin kann neue Dimensionen mit bilingualen Namen (DE/EN), Beschreibung und optionalem `exercise_type`-Scoping erstellen
- [ ] AC-02: Dimension mit `exercise_type = NULL` erscheint bei allen Übungsarten; Dimension mit `exercise_type = 'strength'` nur bei Kraft-Übungen
- [ ] AC-03: Dimensionen können umbenannt, sortiert und soft-deleted werden
- [ ] AC-04: Nur Admins können Dimensionen erstellen/bearbeiten/löschen

### Kategorie-Baum

- [ ] AC-05: Admin kann Knoten mit bilingualen Namen, Slug, Beschreibung, Icon und Metadata erstellen
- [ ] AC-06: Knoten können beliebig tief verschachtelt werden (mind. 6 Ebenen, max. 10)
- [ ] AC-07: Jeder Knoten hat einen automatisch berechneten `path` (materialized path, z.B. `"main.upper.push.vertical"`)
- [ ] AC-08: Knoten-Slugs sind innerhalb desselben Parent eindeutig
- [ ] AC-09: Knoten können per Drag-and-Drop innerhalb ihrer Ebene umsortiert werden (`@dnd-kit/sortable`)
- [ ] AC-10: Knoten können über eine "Verschieben nach..."-Aktion unter einen anderen Parent verschoben werden (Re-Parenting)
- [ ] AC-11: Beim Verschieben werden alle `path`-Werte der Unterknoten automatisch aktualisiert
- [ ] AC-12: Knoten können umbenannt und soft-deleted werden
- [ ] AC-13: Löschen eines Knotens mit Kindern zeigt Warnung und löscht den gesamten Subtree (soft-delete)

### Admin-UI (Taxonomie-Verwaltungsseite)

- [ ] AC-14: Eigene Admin-Seite unter `/admin/taxonomy` mit Dimensionswähler (Tabs oder vertikale Pillen)
- [ ] AC-15: Haupt-Bereich zeigt rekursive Baumansicht mit Expand/Collapse pro Knoten
- [ ] AC-16: Jeder Knoten zeigt: Name (lokalisiert), Tiefe-Indikator, Scope-Badge (Global/Eigene), Kind-Anzahl-Badge
- [ ] AC-17: Hover-Aktionen pro Knoten: Bearbeiten, Kind hinzufügen, Löschen
- [ ] AC-18: Node-Detail-SlideOver (rechte Seite): Name (DE/EN), Beschreibung (DE/EN), Slug, Icon, `trainerVisible`-Toggle, `aiHint`-Textarea
- [ ] AC-19: "Neue Dimension"-Dialog zum Erstellen neuer Dimensionen

### Übung-Kategorisierung (Exercise Form)

- [ ] AC-20: Die Übungserstellungs-/Bearbeitungsseite zeigt pro relevanter Dimension einen Multi-Select-Dropdown
- [ ] AC-21: Multi-Select zeigt hierarchische Gruppierung (Parent als Gruppenheader, Kinder als Einträge)
- [ ] AC-22: Trainer-Ansicht zeigt nur Knoten mit `trainerVisible = true` oder `depth <= 2`
- [ ] AC-23: Admin-Ansicht zeigt alle Knoten aller Tiefen
- [ ] AC-24: Zuweisungen werden in `exercise_category_assignments` gespeichert
- [ ] AC-25: Übungen können Knoten aus beliebig vielen Dimensionen gleichzeitig zugewiesen werden

### Übungsbibliothek-Filter

- [ ] AC-26: Filter in der Übungsbibliothek zeigen Dimensionen als Dropdown-Gruppen
- [ ] AC-27: Filtern nach einem Parent-Knoten inkludiert automatisch alle Nachkommen (z.B. "Push" zeigt auch Vertical, Horizontal, Lateral)
- [ ] AC-28: Unified Search durchsucht auch Kategorie-Knoten-Namen

### Migration & Rückwärtskompatibilität

- [ ] AC-29: Bestehende `exercise_taxonomy`-Einträge (Muskelgruppen + Equipment) werden in `category_nodes` migriert
- [ ] AC-30: Bestehende `exercise_taxonomy_assignments` werden in `exercise_category_assignments` überführt
- [ ] AC-31: Keine bestehende Übung verliert ihre Kategorisierung durch die Migration
- [ ] AC-32: Dual-Write-Phase: Neue Zuweisungen werden in beide Tabellen geschrieben bis Cut-Over

### KI-Integration

- [ ] AC-33: Der KI-Prompt erhält den vollständigen Taxonomie-Baum aller relevanten Dimensionen als Kontext
- [ ] AC-34: Die KI gibt Node-IDs aus mehreren Dimensionen zurück, die gegen die Datenbank validiert werden
- [ ] AC-35: `metadata.aiHint` wird im KI-Prompt pro Knoten eingebunden

### Seed-Daten

- [ ] AC-36: Initial-Migration enthält Dimension "Bewegungsmuster" (slug: `movement_pattern`, exercise_type: `strength`)
- [ ] AC-37: Vollständiger Strength-Baum gemäß Referenz-Struktur:
  - Main > Upper (Push [Vertical/Horizontal/Lateral], Pull [Vertical/Horizontal/Lateral]), Lower (Squat [Sagittal/Frontal], Deadlift [Sagittal/Frontal], Hinge [Hamstring-dominant/Glute-dominant/Adductor-dominant])
  - Assist > Upper (Push [Shoulders/Chest/Triceps], Pull [Latissimus/Trapezius/Biceps]), Lower (Anterior [Quadriceps/Hip Flexors/Tibialis Ant.], Posterior [Hamstrings/Gluteus Max./Calf], Lateral [Abductors/Adductors])
  - Core > Anterior Chain (Dynamic-Flexion/Anti-Extension/Reactive-Anti-Extension), Posterior Chain (Dynamic-Extension/Anti-Flexion/Reactive-Anti-Flexion), Lateral Chain (Dynamic-Lateral-Flexion/Anti-Lateral-Flexion/Reactive-Anti-Lateral-Flexion), Rotational Chain (Dynamic-Rotation/Anti-Rotation/Reactive-Anti-Rotation)
  - Prep > Cervical Spine, Thoracic Spine, Lumbar Spine, Shoulder, Hip, Wrist, Knee, Ankle
- [ ] AC-38: Bestehende Dimensionen `muscle_group` und `equipment` werden als übergreifende Dimensionen (`exercise_type = NULL`) migriert

## Edge Cases

### Baum-Operationen
- **EC-01:** Was passiert, wenn ein Knoten unter sich selbst verschoben wird? → Muss verhindert werden (Zirkelverweis-Check)
- **EC-02:** Was passiert, wenn ein Knoten mit zugewiesenen Übungen gelöscht wird? → Soft-Delete, Zuweisungen bleiben erhalten (für historische Referenz)
- **EC-03:** Was passiert, wenn ein Parent-Knoten gelöscht wird? → Warnung zeigen, gesamter Subtree wird soft-deleted
- **EC-04:** Was passiert bei doppelten Slugs innerhalb desselben Parents? → UNIQUE-Constraint verhindert dies, Fehlermeldung anzeigen
- **EC-05:** Was passiert, wenn die Baumtiefe 10 überschreitet? → CHECK-Constraint blockiert, Fehlermeldung anzeigen

### Dimensionen
- **EC-06:** Was passiert, wenn eine Dimension mit zugewiesenen Knoten gelöscht wird? → Soft-Delete mit Bestätigung, alle Knoten der Dimension werden soft-deleted
- **EC-07:** Was passiert, wenn `exercise_type` einer Dimension geändert wird? → Übungen mit Zuweisungen aus dieser Dimension behalten ihre Zuweisungen, aber die Dimension erscheint nicht mehr im Form für den alten Typ
- **EC-08:** Was passiert bei 500+ Knoten in einer Dimension? → Expand/Collapse reduziert DOM-Last, Virtualisierung nur bei Bedarf

### Migration
- **EC-09:** Was passiert, wenn ein Taxonomy-Eintrag in altem UND neuem System existiert? → Mapping-Tabelle (`taxonomy_migration_map`) verhindert Duplikate
- **EC-10:** Was passiert mit Trainer-eigenen Taxonomy-Einträgen? → Werden als `scope: 'trainer'`-Knoten in die passende Dimension migriert

### Trainer-Ansicht
- **EC-11:** Was passiert, wenn der Admin keine Knoten als `trainerVisible` markiert? → Trainer sieht Knoten bis `depth <= 2` als Fallback
- **EC-12:** Was passiert, wenn ein Trainer eine Übung mit tiefen Kategorien im SlideOver betrachtet? → Voller Breadcrumb-Pfad wird angezeigt (z.B. "Main > Upper > Push > Vertical")

### KI
- **EC-13:** Was passiert, wenn die Taxonomie 200+ Knoten hat und der Prompt zu lang wird? → Nur Blatt-Knoten + deren Pfade an die KI senden, nicht den ganzen Baum
- **EC-14:** Was passiert, wenn die KI ungültige Node-IDs zurückgibt? → Validierung gegen `category_nodes`, ungültige IDs werden ignoriert (bestehendes Muster)

## Technische Anforderungen

### Datenbank
- **Tabellen:** `category_dimensions`, `category_nodes`, `exercise_category_assignments`
- **Speicherstrategie:** Adjacency List (`parent_id`) + Materialized Path (`path` text column)
- **Indizes:** `parent_id`, `dimension_id`, `path` (GIN trigram), `depth`, `scope`
- **Utility Functions:** `compute_category_path()`, `get_category_subtree()`, `get_category_ancestors()`
- **RLS:** Gleiches Pattern wie `exercise_taxonomy` (Global read-all, Admin write global, Trainer write own)

### Performance
- Baumabfragen via recursive CTE: < 50ms für 500 Knoten
- Übungsbibliothek-Filter inkl. Subtree: < 100ms
- Admin-Baumansicht: < 200ms initiales Rendern

### Sicherheit
- Nur Admins können Dimensionen und globale Knoten verwalten
- RLS auf allen neuen Tabellen
- Soft-Delete für alle Operationen (kein Datenverlust)
- Zirkelverweis-Prüfung bei Re-Parenting

### i18n
- Alle Knoten-Namen und -Beschreibungen bilingual (DE/EN) als JSONB
- Alle UI-Strings via `useTranslations()` — keine hardcodierten Strings
- Deutsche Umlaute korrekt (ä, ö, ü, ß)

## Referenz-Struktur: Strength-Bewegungsmuster

```
Kraft (Strength)
├── Main (Hauptübungen)
│   ├── Upper (Oberkörper)
│   │   ├── Push (Drücken)
│   │   │   ├── Vertical (Vertikal)
│   │   │   ├── Horizontal (Horizontal)
│   │   │   └── Lateral (Lateral)
│   │   └── Pull (Ziehen)
│   │       ├── Vertical (Vertikal)
│   │       ├── Horizontal (Horizontal)
│   │       └── Lateral (Lateral)
│   └── Lower (Unterkörper)
│       ├── Squat (Kniebeuge)
│       │   ├── Sagittal (Sagittal)
│       │   └── Frontal (Frontal)
│       ├── Deadlift (Kreuzheben)
│       │   ├── Sagittal (Sagittal)
│       │   └── Frontal (Frontal)
│       └── Hinge (Hüftbeugung)
│           ├── Hamstring-dominant (Beinbeuger-dominant)
│           ├── Glute-dominant (Gesäß-dominant)
│           └── Adductor-dominant (Adduktoren-dominant)
├── Assist (Assistenzübungen)
│   ├── Upper (Oberkörper)
│   │   ├── Push (Drücken)
│   │   │   ├── Shoulders (Schultern)
│   │   │   ├── Chest (Brust)
│   │   │   └── Triceps (Trizeps)
│   │   └── Pull (Ziehen)
│   │       ├── Latissimus (Latissimus)
│   │       ├── Trapezius (Trapez)
│   │       └── Biceps (Bizeps)
│   └── Lower (Unterkörper)
│       ├── Anterior (Vordere Kette)
│       │   ├── Quadriceps (Quadrizeps)
│       │   ├── Hip Flexors (Hüftbeuger)
│       │   └── Tibialis Ant. (Tibialis Anterior)
│       ├── Posterior (Hintere Kette)
│       │   ├── Hamstrings (Beinbeuger)
│       │   ├── Gluteus Max. (Großer Gesäßmuskel)
│       │   └── Calf (Wade)
│       └── Lateral (Seitliche Kette)
│           ├── Abductors (Abduktoren)
│           └── Adductors (Adduktoren)
├── Core
│   ├── Anterior Chain (Vordere Kette)
│   │   ├── Dynamic-Flexion (Dynamische Flexion)
│   │   ├── Anti-Extension (Anti-Extension)
│   │   └── Reactive-Anti-Extension (Reaktive Anti-Extension)
│   ├── Posterior Chain (Hintere Kette)
│   │   ├── Dynamic-Extension (Dynamische Extension)
│   │   ├── Anti-Flexion (Anti-Flexion)
│   │   └── Reactive-Anti-Flexion (Reaktive Anti-Flexion)
│   ├── Lateral Chain (Seitliche Kette)
│   │   ├── Dynamic-Lateral-Flexion (Dynamische Lateralflexion)
│   │   ├── Anti-Lateral-Flexion (Anti-Lateralflexion)
│   │   └── Reactive-Anti-Lateral-Flexion (Reaktive Anti-Lateralflexion)
│   └── Rotational Chain (Rotationskette)
│       ├── Dynamic-Rotation (Dynamische Rotation)
│       ├── Anti-Rotation (Anti-Rotation)
│       └── Reactive-Anti-Rotation (Reaktive Anti-Rotation)
└── Prep (Prehab/Mobilität)
    ├── Cervical Spine (Halswirbelsäule)
    ├── Thoracic Spine (Brustwirbelsäule)
    ├── Lumbar Spine (Lendenwirbelsäule)
    ├── Shoulder (Schulter)
    ├── Hip (Hüfte)
    ├── Wrist (Handgelenk)
    ├── Knee (Knie)
    └── Ankle (Sprunggelenk)
```

## Geplante Cross-Cutting Dimensionen (exercise_type = NULL)

| Dimension Slug | Name (DE) | Name (EN) | Beispiel-Knoten |
|----------------|-----------|-----------|-----------------|
| `muscle_group` | Muskelgruppe | Muscle Group | Brust, Rücken, Schultern... (migriert aus PROJ-12) |
| `equipment` | Equipment | Equipment | Langhantel, Kurzhantel, Kettlebell... (migriert aus PROJ-12) |
| `joint` | Gelenk | Joint | Schulter, Hüfte, Knie, Sprunggelenk... |
| `laterality` | Lateralität | Laterality | Bilateral, Unilateral, Alternierend |
| `movement_plane` | Bewegungsebene | Movement Plane | Sagittal, Frontal, Transversal |

## Geplante Exercise-Type-spezifische Dimensionen

| Dimension Slug | Exercise Type | Name (DE) | Beschreibung |
|----------------|---------------|-----------|-------------|
| `movement_pattern` | `strength` | Bewegungsmuster | Der vollständige Baum (Main/Assist/Core/Prep) |
| `endurance_type` | `endurance` | Ausdauerart | Aerob/Anaerob, Kontinuierlich/Intervall, etc. (zukünftig) |
| `speed_type` | `speed` | Schnelligkeitsart | Antritt/Reaktion/Agilität, etc. (zukünftig) |
| `flexibility_type` | `flexibility` | Beweglichkeitsart | Statisch/Dynamisch/Ballistisch, etc. (zukünftig) |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
