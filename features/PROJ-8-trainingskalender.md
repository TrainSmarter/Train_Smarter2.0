# PROJ-8: Trainingskalender

## Status: Planned
**Created:** 2026-03-12
**Last Updated:** 2026-03-12

## Dependencies
- Requires: PROJ-1–PROJ-4 (Fundament)
- Requires: PROJ-7 (Trainingspläne & Programme) — Einheiten kommen aus Programmen

## Übersicht
Kalenderansicht aller geplanten und abgeschlossenen Trainingseinheiten. Athleten sehen ihren persönlichen Trainingskalender. Trainer können den Kalender ihrer Athleten einsehen.

## User Stories
- Als Athlet möchte ich alle meine Trainingseinheiten in einem Monats- oder Wochenkalender sehen
- Als Athlet möchte ich auf einen Termin klicken und die Details sehen (Übungen, Status)
- Als Trainer möchte ich den Kalender eines Athleten einsehen um seinen Fortschritt zu überblicken
- Als Athlet möchte ich ad-hoc Einheiten in den Kalender eintragen (außerhalb eines Programms)

## Acceptance Criteria

### Figma Screens
- [ ] Figma Screen: Kalender Monatsansicht (Desktop + Mobile)
- [ ] Figma Screen: Kalender Wochenansicht
- [ ] Figma Screen: Einheiten-Detail Popover/Modal
- [ ] Figma Screen: Ad-hoc Einheit hinzufügen Modal

### Kalender-Ansicht
- [ ] Route: `/training/calendar`
- [ ] Toggle zwischen Monats- und Wochenansicht
- [ ] Monatsansicht: Jeder Tag zeigt Einheiten-Chips (Name + Status-Farbe)
- [ ] Wochenansicht: Zeitachse mit Einheiten-Blöcken
- [ ] Status-Farben: Geplant (slate), Erledigt (teal/success), Verpasst (rot/error), Heute (primary-teal Umrandung + Ring)
- [ ] Navigation: Vor/Zurück Pfeile, "Heute" Button
- [ ] Klick auf Einheit öffnet Detailansicht (Popover Desktop / Modal Mobile)

### Einheiten-Detail
- [ ] Einheiten-Name, Datum/Uhrzeit, Status
- [ ] Übungsliste (falls aus Programm)
- [ ] Notiz-Feld (nachträglich hinzufügen)
- [ ] Als erledigt markieren (falls noch offen)

### Ad-hoc Einheiten
- [ ] "+" Button im Kalender (auf einem Datum klicken)
- [ ] Felder: Name, Datum, Typ (Kraft/Ausdauer/Mobility/Sonstiges), Notiz
- [ ] Optional: Übungen hinzufügen (wie im Programm-Editor)

## Edge Cases
- Kalender mit 0 Einheiten → EmptyState mit CTA "Erhalte dein erstes Programm von deinem Trainer"
- Viele Einheiten am selben Tag: Overflow zeigt "+X weitere" Chip
- Kalender auf Mobile: Monat passt nicht → kompakte Darstellung mit Dots unter Tagen

## Technical Requirements
- Performance: Kalender-Daten werden monatsweise geladen (kein Full-Load)
- Library: Leichtgewichtige Kalender-Komponente (z.B. react-big-calendar oder custom) — kein FullCalendar (zu groß)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
