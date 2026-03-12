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

## Alleinstellungsmerkmal
Das vollständige Periodisierungssystem ist das zentrale Differenzierungsmerkmal von Train Smarter 2.0 gegenüber allen Konkurrenten (TrainingPeaks, Trainerize, TeamBuildr, CoachAccountable). Kein anderes Tool bietet die vollständige Hierarchie von Mehrjahresplänen bis zur einzelnen Trainingseinheit in einem konsistenten UX.

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

### Trainer — Planung
- Als Trainer möchte ich einen Mehrjahresplan für meinen Athleten anlegen, damit ich die langfristige Entwicklung strukturiere
- Als Trainer möchte ich Jahrespläne innerhalb eines Mehrjahresplans erstellen und Makrozyklen zuweisen
- Als Trainer möchte ich Makrozyklen (z.B. "Vorbereitungsphase", "Wettkampfphase") mit Zielen und Phasentypen definieren
- Als Trainer möchte ich Mesozyklen als Blöcke innerhalb eines Makrozyklus strukturieren (z.B. Hypertrophie → Kraft → Peaking)
- Als Trainer möchte ich Mikrozyklen (Wochen) mit konkreten Trainingstagen befüllen
- Als Trainer möchte ich Trainingspläne als Vorlagen speichern und für andere Athleten wiederverwenden
- Als Trainer möchte ich einen Makrozyklus einem Athleten zuweisen (mit Startdatum)

### Athlet — Ausführung
- Als Athlet möchte ich meine aktuelle Woche (Mikrozyklus) und die heutige Einheit sehen
- Als Athlet möchte ich eine Einheit durchführen und Satz für Satz abharken
- Als Athlet möchte ich mein Ist-Gewicht pro Übung erfassen (tatsächlich ausgeführt vs. geplant)
- Als Athlet möchte ich eine Einheit als abgeschlossen markieren

## Acceptance Criteria

### Figma Screens
- [ ] Figma Screen: Planungsübersicht — Mehrjahresplan / Jahresplan Zeitleiste (Trainer)
- [ ] Figma Screen: Makrozyklus-Editor (Mesozyklen als Blöcke visualisiert)
- [ ] Figma Screen: Mikrozyklus-Editor (Wochenansicht mit Trainingstagen)
- [ ] Figma Screen: Trainingseinheit-Editor (Übungsliste mit Sets/Reps/RPE)
- [ ] Figma Screen: Vorlagen-Bibliothek (Trainer)
- [ ] Figma Screen: Athlet — Aktuelle Woche / Heutige Einheit
- [ ] Figma Screen: Athlet — Einheit durchführen (Satz-für-Satz)

### Planungsübersicht (Trainer)
- [ ] Route: `/training/plans`
- [ ] Zeitleisten-Ansicht: Alle Makrozyklen eines Athleten auf einer horizontalen Achse (Jahr-View)
- [ ] Farbkodierung nach Phasentyp: Vorbereitung (teal), Wettkampf (violet), Übergang (slate), Rehabilitation (warning)
- [ ] "Neuer Plan" Button → Wizard startet

### Mehrjahres- und Jahresplan
- [ ] Trainer kann Mehrjahresplan anlegen: Titel, Zeitraum (Start/Ende), Ziel (Freitext)
- [ ] Mehrjahresplan enthält 1–4 Jahrespläne (automatisch nach Kalenderjahr unterteilt)
- [ ] Jahresplan zeigt alle Makrozyklen des Jahres als Zeitleiste
- [ ] Lücken zwischen Makrozyklen werden als "Übergangsphase" markiert

### Makrozyklus-Editor
- [ ] Route: `/training/plans/[id]/macro/[macroId]`
- [ ] Felder: Name (z.B. "GPP Phase 1"), Phasentyp (Vorbereitung/Kraft/Hypertrophie/Peaking/Wettkampf/Regeneration), Startdatum, Dauer (Wochen)
- [ ] Mesozyklen als Blöcke innerhalb des Makrozyklus anlegen (Drag-Reorder)
- [ ] Jeder Mesozyklus: Name, Schwerpunkt, Dauer (1–4 Wochen), Intensitätsstufe (niedrig/mittel/hoch/sehr hoch)
- [ ] Belastungs-Entlastungs-Muster: z.B. 3:1 (3 Belastungswochen + 1 Entlastungswoche) — visuell dargestellt
- [ ] Als Vorlage speichern: Makrozyklus ohne Athleten-Bindung speicherbar

### Mikrozyklus-Editor (Woche)
- [ ] Jeder Mesozyklus enthält N Wochen (Mikrozyklen)
- [ ] Route: `/training/plans/[id]/week/[weekId]`
- [ ] Wochenansicht: 7 Tage als Spalten, Trainingstage per Drag-and-Drop befüllbar
- [ ] Trainingstag: Name (z.B. "Oberkörper A"), Typ (Kraft/Ausdauer/Mobility/Regeneration/Wettkampf/Rest)
- [ ] Übung hinzufügen: Suche aus globaler Übungsdatenbank oder Freitext
- [ ] Je Übung: Sets × Reps/Dauer, % 1RM oder absolutes Gewicht, RPE-Ziel (1–10), Pausendauer (s), Notiz
- [ ] Kopieren: Woche als Vorlage für nächste Woche übernehmen (mit optionaler Progression +2.5–5%)

### Zuweisung
- [ ] Modal: Athlet auswählen (aus eigenen Athleten), Startdatum setzen
- [ ] System berechnet automatisch alle Einheitendaten (Datum = Startdatum + Offset)
- [ ] Warnung wenn Athlet bereits einen aktiven Plan hat
- [ ] Überlappungs-Check: Keine zwei Makrozyklen können am selben Tag beginnen

### Athlet-Ansicht
- [ ] Dashboard-Widget: Aktuelle Woche (Mikrozyklus) mit Fortschrittsbalken + nächste Einheit
- [ ] Route: `/training` — Heutige Einheit (Übungsliste, geplante Sets/Reps/Gewicht)
- [ ] Einheit durchführen: Satz für Satz abhaken, Ist-Gewicht eintragen
- [ ] RPE erfassen (tatsächlich empfunden): 1–10 Skala nach jeder Übung
- [ ] Einheit abschließen → Timestamp + Gesamtvolumen gespeichert
- [ ] Einheit überspringen: Grund angeben (Verletzung/Reisen/Sonstiges)

### Vorlagen-Bibliothek
- [ ] Route: `/training/templates`
- [ ] Liste aller gespeicherten Makrozyklus-Vorlagen des Trainers
- [ ] Vorlage klonen → wird zu neuem Makrozyklus (bearbeitbar, nicht mehr Vorlage)
- [ ] Vorlagen privat (v2.0 Scope)

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
