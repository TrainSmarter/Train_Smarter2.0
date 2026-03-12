# PROJ-6: Feedback & Monitoring

## Status: Planned
**Created:** 2026-03-12
**Last Updated:** 2026-03-12

## Dependencies
- Requires: PROJ-1 (Design System Foundation)
- Requires: PROJ-2 (UI Component Library) — Card, StatsCard, Chart, Badge, Input
- Requires: PROJ-3 (App Shell & Navigation) — Layout
- Requires: PROJ-4 (Authentication) — User-Session, Rollen
- Requires: PROJ-5 (Athleten-Management) — Trainer-Athlet-Verbindung, Sichtbarkeits-Flags

## Übersicht
Tägliches Feedback-System für Athleten und Monitoring-Dashboard für Trainer.

**Athlet:** Befüllt täglich einen strukturierten Check-in (Körpergewicht, Schlafqualität, subjektives Wohlbefinden, Ernährungs-Compliance, Trainings-RPE). Sieht optional seine eigenen Daten als Charts — aktivierbar pro Athlet durch den Trainer.

**Trainer:** Bekommt eine Monitoring-Übersicht aller Athleten (inkl. Einzelpersonen ohne Mannschaft) mit Tagesstatus, Trends und Team-Aggregaten. Kann pro Athlet die Sichtbarkeit der Auswertungs-Charts steuern.

## Konzept: Athleten ohne Mannschaft
Trainer können Athleten auch direkt (1:1) coachen, ohne dass diese einer Mannschaft angehören. Beide Strukturen sind gleichwertig im Monitoring sichtbar — individuelle Athleten und Mannschaften erscheinen nebeneinander in der Trainer-Übersicht.

## User Stories

### Athlet — Check-in
- Als Athlet möchte ich täglich meinen Check-in ausfüllen (< 1 Minute), damit ich meinen Trainer mit aktuellen Daten versorge
- Als Athlet möchte ich meine eigenen Daten über Zeit sehen (Charts), wenn mein Trainer das für mich aktiviert hat, damit ich motiviert bleibe
- Als Athlet möchte ich vergangene Einträge bis zu 3 Tage nachtragen können, falls ich einen Tag vergessen habe
- Als Athlet möchte ich sehen, dass mein heutiger Check-in erfolgreich gespeichert wurde

### Trainer — Monitoring
- Als Trainer möchte ich auf einen Blick den Tagesstatus aller meiner Athleten sehen (Check-in ausgefüllt: ja/nein + Ampelstatus)
- Als Trainer möchte ich Team-Aggregate sehen (Durchschnittswerte aller Athleten einer Mannschaft)
- Als Trainer möchte ich einen einzelnen Athleten (aus Mannschaft oder als Einzelperson) im Detail ansehen
- Als Trainer möchte ich pro Athlet die Sichtbarkeit der Auswertungs-Charts an- oder abschalten
- Als Trainer möchte ich Athleten nach niedrigem Wohlbefinden oder fehlenden Check-ins filtern

## Acceptance Criteria

### Figma Screens
- [ ] Figma Screen: Athlet — Täglicher Check-in Formular
- [ ] Figma Screen: Athlet — Eigene Daten-Übersicht (Charts, aktivierbar durch Trainer)
- [ ] Figma Screen: Trainer — Monitoring-Übersicht (alle Athleten, Tagesstatus)
- [ ] Figma Screen: Trainer — Einzelathlet Detailansicht
- [ ] Figma Screen: Trainer — Team-Aggregate Ansicht

### Täglicher Check-in (Athlet)
- [ ] Route: `/feedback`
- [ ] Formular erscheint prominent wenn Check-in noch nicht ausgefüllt (heutiger Tag)
- [ ] Felder:
  - Körpergewicht (kg, Dezimalzahl, z.B. 82.5) — Pflichtfeld
  - Schlafqualität (1–10 Skala)
  - Subjektives Wohlbefinden / Energie (1–10 Skala)
  - Ernährungs-Compliance (1–10, z.B. "Habe ich meinen Plan eingehalten?")
  - Trainings-RPE der letzten Einheit (1–10, falls Einheit stattgefunden hat) — optional
  - Freitext-Notiz (max 300 Zeichen, optional)
- [ ] Zod-Validierung: Gewicht 20–300 kg, alle Skalen im definierten Bereich
- [ ] Bereits ausgefüllter Check-in: Anzeige mit "Bearbeiten" Button (bis Mitternacht editierbar)
- [ ] Nachtrag: Einträge für bis zu 3 Tage in der Vergangenheit möglich

### Athlet-Eigenansicht (wenn Trainer aktiviert)
- [ ] Gewichtsverlauf: Linien-Chart (letzte 30 / 90 Tage)
- [ ] Wohlbefinden-Trend: Linien-Chart über Zeit
- [ ] Streak-Badge: "X Tage in Folge ausgefüllt"
- [ ] Wenn Trainer-Freigabe deaktiviert: Seite zeigt nur Check-in Formular ohne Charts

### Trainer — Monitoring-Dashboard
- [ ] Route: `/feedback`
- [ ] Übersicht-Grid: Alle Athleten (Einzelpersonen + Mannschaftsmitglieder) als Cards
  - Athleten-Card: Avatar, Name, Heute-Status (✓ ausgefüllt / ✗ fehlt), Gewicht-Trend (↑↓–), Wohlbefinden-Ampel (Grün ≥7 / Gelb 5–6 / Rot < 5)
- [ ] Filter: "Alle" / "Check-in fehlt heute" / "Wohlbefinden niedrig (< 5)"
- [ ] Team-Aggregate (wenn Mannschaft vorhanden): Durchschnitt Wohlbefinden, Compliance, Check-in Rate %
- [ ] Klick auf Athleten-Card → Einzelathlet-Detailansicht

### Trainer — Einzelathlet-Detailansicht
- [ ] Route: `/feedback/[athlete-id]`
- [ ] Gewichtsverlauf, Wohlbefinden-Trend, Compliance-Trend als Charts
- [ ] Alle bisherigen Check-ins als Tabelle (paginiert, 20 pro Seite)
- [ ] Toggle: "Auswertungs-Charts für diesen Athleten sichtbar" (an/aus)

### Sichtbarkeits-Steuerung durch Trainer
- [ ] Trainer kann pro Athlet `can_see_analysis: boolean` setzen
- [ ] Standard: `false` (Athlet sieht Charts standardmäßig nicht)
- [ ] Athlet sieht in Einstellungen welche Daten sein Trainer sehen kann (Read-only Anzeige)

## Edge Cases
- Check-in für heute bereits vorhanden → Bearbeiten-Modus, kein Duplikat möglich
- Keine Athleten verbunden → Trainer sieht Leer-Zustand "Noch keine Athleten verbunden. Gehe zu Organisation."
- Athlet hat noch nie einen Check-in ausgefüllt → Card zeigt "Kein Check-in bisher" ohne Fehler
- Trainer schaltet Analyse ab → Athlet sieht bei nächstem Reload keine Charts mehr
- Nachtrag für > 3 Tage versucht → Fehlermeldung "Einträge können maximal 3 Tage rückwirkend erstellt werden"
- Mannschaft mit 0 Athleten → Team-Aggregate-Sektion wird nicht im Dashboard angezeigt

## Technical Requirements
- Security: RLS — Athlet sieht nur eigene Einträge; Trainer sieht nur Daten seiner verknüpften Athleten (basierend auf `trainer_athlete_connections`)
- Sichtbarkeit: `can_see_analysis` Flag wird in `trainer_athlete_connections` als neues Feld ergänzt (zusätzlich zu den in PROJ-5 definierten Flags)
- Performance: Monitoring-Dashboard aggregiert Daten serverseitig (kein Full-Load aller Roh-Einträge)
- Charts: Recharts (bereits im Tech Stack, lazy loaded pro Feature)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
