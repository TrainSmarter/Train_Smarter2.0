# PROJ-7: Training Workspace & Periodisierungssystem

## Status: Planned
**Created:** 2026-03-12
**Last Updated:** 2026-03-12

## Dependencies
- Requires: PROJ-1–PROJ-4 (Fundament)
- Requires: PROJ-5 (Athleten-Management) — Trainer weist Pläne zu
- Soft dependency: PROJ-8 (Trainingskalender) — Mikrozyklen werden im Kalender sichtbar

## Training Workspace Konzept

**Route:** `/training`

Der Training-Bereich ist ein einheitlicher Workspace mit einem **Universal-Selector** oben, der bestimmt, wessen Plan (oder welches Template) gerade geladen ist:

```
Universal-Selector (Dropdown)
  ── Eigene Planung ──
  Mein Plan / Meine Templates
  ── Platform Templates ──      ← Admin-Bibliothek (alle Ebenen, read-only)
  Hypertrophie Block 4W
  Wettkampfvorbereitung 8W
  Einsteiger Jahresplan
  [weitere Admin-Templates...]
  ── Meine Athleten ──
  Max Müller
  Anna Schmidt
  ── Mannschaften ──
  TSV München U18
```

**Verhalten:**
- Standard beim Öffnen: Eigene Planung (eigene Templates + leere Planung)
- Platform Template wählen: Template wird in identischer Planstruktur angezeigt → Trainer kann es direkt klonen und anpassen (Original bleibt unverändert)
- Athlet/Mannschaft wählen: Deren Plan wird in identischer Planstruktur angezeigt (+ Kalender-Tab via PROJ-8)
- Planstruktur (Mehrjahresplan → Einheit) ist für alle Kontexte identisch — nur die Daten und Bearbeitungsrechte ändern sich
- Athlet-Perspektive: Athlet öffnet `/training` → sieht seinen eigenen Plan (kein Universal-Selector sichtbar)

## Platform Templates — Konzept

Platform Templates werden von Platform-Admins (PROJ-10) erstellt und gepflegt. Sie sind für alle registrierten Trainer lesend zugänglich und können auf allen Planungsebenen existieren.

**Alle Template-Ebenen verfügbar:**
- Mehrjahresplan-Templates (z.B. "4-Jahres-Olympia-Zyklus")
- Jahresplan-Templates (z.B. "Einsteiger Jahresplan Kraft")
- Makrozyklus-Templates (z.B. "Hypertrophie Block 8 Wochen")
- Mesozyklus-Templates (z.B. "3:1 Belastungs-Entlastungs-Block")
- Mikrozyklus-Templates / Wochenpläne (z.B. "Push/Pull/Legs Split")

**Library-Modell (keine Einschränkungen):**
- Templates sind read-only im Original (Admin-Eigentum)
- Trainer können jedes Template jederzeit klonen → wird zu persönlichem Template → frei bearbeitbar
- Kein Versions-Tracking: Geklonte Templates sind isolierte Kopien, unabhängig vom Original
- Keine Genehmigung nötig — sofort nutzbar nach Klonen

**Datenbankschema (Phase 2):**
```
platform_templates
├── id: uuid (PK)
├── created_by: uuid (FK → auth.users, must have is_platform_admin = true)
├── level: "multi_year" | "year" | "macro" | "meso" | "micro"
├── title: text
├── description: text
├── sport_type: text (z.B. "Kraft", "Ausdauer", "Kampfsport")
├── difficulty: "beginner" | "intermediate" | "advanced"
├── duration_weeks: integer | null
├── payload: jsonb  ← serialisiertes Plan-Objekt (gleiche Struktur wie Trainer-Templates)
├── is_published: boolean (default: false — Admin kann Entwürfe haben)
└── created_at: timestamp
```

## Zoom Navigation — Kernprinzip

Der Training Workspace basiert auf einem **nahtlosen Zoom-Prinzip**: Der Trainer navigiert durch die gesamte Planungshierarchie durch Hinein- und Herauszoomen — ohne Kontextverlust.

```
ZOOM OUT ←─────────────────────────────────────────────────────→ ZOOM IN

Mehrjahresplan  →  Jahresplan  →  Makrozyklus  →  Mesozyklus  →  Mikrozyklus  →  Trainingseinheit  →  Übung
   (4 Jahre)       (1 Jahr)       (8–16 Wo.)      (3–4 Wo.)       (7 Tage)        (1 Tag)
```

**Navigation:**
- **Hineinzoomen:** Klick auf ein Element öffnet die nächste Ebene darunter
- **Herauszoomen:** Breadcrumb-Leiste (immer sichtbar) ermöglicht Sprung zu jeder übergeordneten Ebene
- **URL-basiert:** Jede Zoom-Ebene hat eine eigene URL — Browser-Back funktioniert korrekt, Links sind teilbar
- **Kein Kontextverlust:** Beim Rauszoomen wird die zuletzt aktive Position wiederhergestellt (z.B. welche Woche war geöffnet)

**Breadcrumb-Beispiel:**
```
Training  >  Max Müller  >  Jahresplan 2026  >  GPP Phase I  >  Hypertrophie Block  >  Woche 3  >  Montag
   ↑              ↑               ↑                  ↑                  ↑                 ↑           ↑
  (zurück      (Athlet-       (Jahresplan-        (Makro-             (Meso-           (Mikro-    (aktuell)
  zum Sel.)    wechsel)          ebene)           ebene)              ebene)            ebene)
```

**Visualisierung je Ebene:**
| Ebene | Darstellung |
|-------|-------------|
| Mehrjahresplan | Horizontale Zeitleiste (Jahre als Spalten, Makrozyklen als Farbblöcke) |
| Jahresplan | Jahres-Timeline mit Makrozyklus-Blöcken + Lücken als Übergangsphase |
| Makrozyklus | Meso-Blöcke + Belastungs-/Entlastungs-Muster visuell dargestellt |
| Mesozyklus | Wochenraster (Mikrozyklen als Zeilen) |
| Mikrozyklus | 7-Tage-Wochenansicht + Kalender-Tab (PROJ-8) |
| Trainingseinheit | Übungsliste mit Sets/Reps/Gewicht/RPE |
| Übung | Einzelübung-Detail (Anleitung, Video-Link, Verlauf) |

**Warum das ein Alleinstellungsmerkmal ist:**
- TrainingPeaks: Separate Seiten für Calendar, Plan, Workout — kein Zoom-Prinzip
- Trainerize: Nur Tages- und Wochenansicht — keine Hierarchie sichtbar
- TeamBuildr: Block-Planung ohne Drill-Down
- Train Smarter 2.0: Einziges Tool mit nahtlosem Zoom durch alle 7 Ebenen

## Alleinstellungsmerkmal
Das vollständige Periodisierungssystem kombiniert mit dem Zoom-Navigationsprinzip ist das zentrale Differenzierungsmerkmal von Train Smarter 2.0. Kein Konkurrent bietet die vollständige Hierarchie mit nahtlosem Drill-Down/Zoom-Out in einem konsistenten Workspace.

## Planungshierarchie
```
Mehrjahresplan (1–4 Jahre)
  └── Jahresplan (1 Jahr)
        └── Makrozyklus (4–16 Wochen, z.B. Vorbereitungsphase)
              └── Mesozyklus (2–4 Wochen, z.B. Hypertrophie-Block)
                    └── Mikrozyklus (1 Woche = 7 Tage)
                          └── Trainingseinheit (einzelner Tag)
                                └── Übung (Sets × Reps × Gewicht × Pause × RPE)
```

## User Stories

### Trainer — Universal-Selector & Navigation
- Als Trainer möchte ich beim Öffnen des Training Workspace im Universal-Selector zwischen eigener Planung, meinen Athleten, meinen Mannschaften und Platform Templates wählen, damit ich sofort den richtigen Kontext habe
- Als Trainer möchte ich durch alle Planungsebenen nahtlos hineinzoomen (Klick auf Element) und herauszoomen (Breadcrumb), damit ich nie den Überblick verliere
- Als Trainer möchte ich per Breadcrumb direkt zu jeder übergeordneten Ebene springen (z.B. von Mikrozyklus zurück zum Jahresplan), ohne durch Zwischenebenen navigieren zu müssen
- Als Trainer möchte ich ein Platform Template im Universal-Selector auswählen, es als Klon in meine persönliche Planung übernehmen und dann frei bearbeiten
- Als Trainer möchte ich eigene Pläne als persönliche Templates speichern und sie im Universal-Selector unter "Meine Templates" finden

### Trainer — Planung (Hierarchie)
- Als Trainer möchte ich einen Mehrjahresplan anlegen, damit ich die langfristige Entwicklung eines Athleten strukturiere
- Als Trainer möchte ich Jahrespläne innerhalb eines Mehrjahresplans erstellen und Makrozyklen auf einer Zeitleiste sehen
- Als Trainer möchte ich Makrozyklen (z.B. "Vorbereitungsphase") mit Phasentyp, Dauer und Zielen definieren
- Als Trainer möchte ich Mesozyklen als Blöcke innerhalb eines Makrozyklus strukturieren (z.B. Hypertrophie → Kraft → Peaking) und das Belastungs-/Entlastungsmuster visuell sehen
- Als Trainer möchte ich Mikrozyklen (Wochen) mit konkreten Trainingstagen per Drag-and-Drop befüllen
- Als Trainer möchte ich einen fertigen Plan einem Athleten oder einer Mannschaft zuweisen (mit Startdatum)

### Athlet — Ausführung
- Als Athlet möchte ich beim Öffnen von `/training` sofort meine aktuelle Woche (Mikrozyklus) und die heutige Einheit sehen — ohne Kontext-Selector
- Als Athlet möchte ich eine Einheit durchführen und Satz für Satz mit Ist-Gewicht und RPE abharken
- Als Athlet möchte ich eine Einheit als abgeschlossen markieren und mein Gesamtvolumen sehen
- Als Athlet möchte ich in den Kalender (PROJ-8) zoomen um meine Woche im Überblick zu sehen

## Acceptance Criteria

### Figma Screens
- [ ] Figma Screen: Training Workspace — Universal-Selector + Breadcrumb-Navigation
- [ ] Figma Screen: Zoom-Ebene Mehrjahresplan (Jahres-Timeline, Makrozyklen als Farbblöcke)
- [ ] Figma Screen: Zoom-Ebene Makrozyklus-Editor (Mesozyklen als Blöcke, Belastungsmuster)
- [ ] Figma Screen: Zoom-Ebene Mikrozyklus (7-Tage-Wochenansicht mit Drag-and-Drop)
- [ ] Figma Screen: Zoom-Ebene Trainingseinheit (Übungsliste mit Sets/Reps/RPE)
- [ ] Figma Screen: Platform Templates im Universal-Selector (Bibliotheks-Ansicht)
- [ ] Figma Screen: Athlet — Training Workspace (kein Selector, direkt Mikrozyklus/Woche)
- [ ] Figma Screen: Athlet — Einheit durchführen (Satz-für-Satz)

### Universal-Selector
- [ ] Route: `/training` (Einstieg — Universal-Selector prominent sichtbar wenn kein Kontext aktiv)
- [ ] Dropdown-Gruppen: "Eigene Planung", "Platform Templates", "Meine Athleten", "Mannschaften"
- [ ] Suchfeld im Dropdown (filtert alle Gruppen gleichzeitig)
- [ ] Zuletzt verwendeter Kontext wird beim nächsten Öffnen vorausgewählt
- [ ] Athlet-Perspektive: Kein Universal-Selector sichtbar (direkt auf eigenen Plan)

### Zoom-Navigation (alle Ebenen)
- [ ] Breadcrumb immer sichtbar: `Training > [Kontext] > [Jahresplan] > [Makro] > [Meso] > [Woche] > [Tag]`
- [ ] Jede Ebene hat eigene URL (Browser-Back navigiert eine Ebene hoch)
- [ ] Klick auf Element → nächste Ebene (Hineinzoomen)
- [ ] Klick auf Breadcrumb-Item → direkt zu dieser Ebene (Herauszoomen)

### Zoom-Ebene: Jahresplan / Mehrjahresplan
- [ ] Route: `/training/[plan-id]`
- [ ] Horizontale Zeitleiste: Makrozyklen als Farbblöcke auf Jahresachse
- [ ] Farbkodierung: Vorbereitung (teal), Wettkampf (violet), Übergang (slate), Regeneration (warning)
- [ ] Lücken zwischen Makrozyklen → "Übergangsphase" Placeholder
- [ ] "Neuer Makrozyklus" Button öffnet Editor
- [ ] Mehrjahresplan: 1–4 Jahres-Tabs, automatisch nach Kalenderjahr

### Zoom-Ebene: Makrozyklus
- [ ] Route: `/training/[plan-id]/macro/[macro-id]`
- [ ] Mesozyklen als horizontale Blöcke (Drag-Reorder)
- [ ] Felder: Name, Phasentyp (Vorbereitung/Kraft/Hypertrophie/Peaking/Wettkampf/Regeneration), Dauer (Wochen)
- [ ] Belastungs-/Entlastungs-Muster visuell (z.B. 3:1 — 3 Belastungswochen farbig, 1 Entlastung gedimmt)
- [ ] "Als persönliches Template speichern" Button

### Zoom-Ebene: Mesozyklus
- [ ] Route: `/training/[plan-id]/macro/[macro-id]/meso/[meso-id]`
- [ ] Wochenraster: Alle Mikrozyklen des Mesozyklus als Zeilen
- [ ] Schwerpunkt, Intensitätsstufe (niedrig/mittel/hoch/sehr hoch) pro Meso editierbar

### Zoom-Ebene: Mikrozyklus (Woche)
- [ ] Route: `/training/[plan-id]/macro/[macro-id]/meso/[meso-id]/week/[week-id]`
- [ ] 7-Tage-Grid: Spalten = Tage, Trainingstage per Drag-and-Drop befüllbar
- [ ] Trainingstag: Name, Typ (Kraft/Ausdauer/Mobility/Regeneration/Wettkampf/Rest)
- [ ] Woche kopieren als Template für nächste Woche (mit optionaler Progression +2.5–5%)
- [ ] Tab-Wechsel zu Kalender-Ansicht (PROJ-8) auf dieser Ebene

### Zoom-Ebene: Trainingseinheit
- [ ] Route: `/training/[plan-id]/macro/[macro-id]/meso/[meso-id]/week/[week-id]/day/[day-id]`
- [ ] Übung hinzufügen: Suche aus globaler Übungsdatenbank (PROJ-10) oder Freitext
- [ ] Je Übung: Sets × Reps/Dauer, % 1RM oder absolutes Gewicht, RPE-Ziel (1–10), Pausendauer (s), Notiz

### Platform Templates — Klonen
- [ ] Template im Universal-Selector wählen → Read-only Vorschau der Planstruktur
- [ ] "Klonen & Bearbeiten" Button → Kopie wird zu persönlichem Template (Original unverändert)
- [ ] Geklontes Template erscheint sofort unter "Eigene Planung" im Universal-Selector

### Zuweisung an Athlet/Mannschaft
- [ ] Aus beliebiger Zoom-Ebene: "Zuweisen" Button → Modal: Kontext (Athlet/Mannschaft) + Startdatum
- [ ] System berechnet alle Einheitendaten (Datum = Startdatum + Offset)
- [ ] Warnung wenn Athlet/Mannschaft bereits aktiven Plan hat
- [ ] Überlappungs-Check: Keine zwei Makrozyklen am selben Startdatum

### Athlet-Ansicht (Training Workspace)
- [ ] Route: `/training` → Direkt auf Mikrozyklus-Ebene der aktuellen Woche
- [ ] Dashboard-Widget: Aktuelle Woche mit Fortschrittsbalken + heutige Einheit
- [ ] Einheit durchführen: Satz für Satz abhaken, Ist-Gewicht + RPE eintragen
- [ ] Einheit abschließen → Timestamp + Gesamtvolumen gespeichert
- [ ] Einheit überspringen: Grund angeben (Verletzung/Reisen/Sonstiges)

## Edge Cases
- Makrozyklus löschen der aktiv zugewiesen ist → Warnung + Bestätigung + Athlet-Benachrichtigung
- Athlet ohne aktiven Plan → EmptyState "Dein Trainer hat noch keinen Plan zugewiesen"
- Übungs-Datenbank leer → Freitext-Eingabe immer als Fallback
- Plan-Dauer überschritten → Trainer-Dashboard-Banner "Plan für [Athlet] abgelaufen"
- Mikrozyklus kopieren mit Progression → Warnung wenn % 1RM > 100% resultieren würde
- Trainer editiert laufenden Plan → Änderungen ab nächster Woche, vergangene Wochen unveränderlich (Audit-Trail)

## Technical Requirements
- Data Model: `plans` → `macro_cycles` → `meso_cycles` → `micro_cycles` → `training_days` → `exercises`
- Security: RLS — Athleten sehen nur ihnen zugewiesene Pläne; Trainer sieht nur eigene Pläne
- Performance: Plan-Editor mit bis zu 52 Wochen × 7 Tage × 20 Übungen muss flüssig rendern (virtualisiert)
- Performance: Zeitleisten-View wird server-side aggregiert
- Data: Übungs-Datenbank als Supabase-Tabelle mit ~200 Standard-Übungen (Seed-Script)
- Offline: Einheit durchführen muss offline funktionieren (PWA-Cache oder optimistische Updates)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
