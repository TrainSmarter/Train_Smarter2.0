# PROJ-6: Body & Ernährung Tracking

## Status: Planned
**Created:** 2026-03-12
**Last Updated:** 2026-03-12

## Dependencies
- Requires: PROJ-1 (Design System Foundation)
- Requires: PROJ-2 (UI Component Library) — Card, StatsCard, Modal, Input, Tabs
- Requires: PROJ-3 (App Shell & Navigation) — Layout
- Requires: PROJ-4 (Authentication) — User-Session
- Requires: PROJ-5 (Athleten-Management) — Trainer kann Athleten-Daten einsehen

## Übersicht
Athleten und Trainer tracken tägliche Körperwerte (Gewicht, Körperfett, Umfänge), Fortschrittsfotos und Ernährungsphasen. Trainer können die Daten ihrer Athleten einsehen. Die Daten werden als Zeitreihe visualisiert, um Fortschritt sichtbar zu machen.

## User Stories
- Als Athlet möchte ich täglich meinen Körperwert eintragen (Gewicht, Körperfett), damit ich meinen Fortschritt tracke
- Als Athlet möchte ich optional Fotos hochladen, damit ich visuelle Vergleiche habe
- Als Athlet möchte ich sehen wie sich meine Werte über die Zeit entwickeln (Chart/Tabelle), damit ich motiviert bleibe
- Als Trainer möchte ich die Body-Daten meiner Athleten einsehen, damit ich Empfehlungen geben kann
- Als Trainer möchte ich Ernährungsphasen (Aufbau/Diät/Erhaltung) für Athleten definieren, damit der Athlet weiß in welcher Phase er sich befindet
- Als Athlet möchte ich meine aktive Ernährungsphase im Dashboard sehen, damit ich jederzeit weiß was das Ziel ist

## Acceptance Criteria

### Figma Screens
- [ ] Figma Screen: Body & Ernährung Übersicht / Dashboard (mit StatsCards + Trend-Chart)
- [ ] Figma Screen: Tageseintrag erstellen (Modal/Formular mit allen Feldern)
- [ ] Figma Screen: Verlauf / History-Tabelle
- [ ] Figma Screen: Fotos-Galerie
- [ ] Figma Screen: Ernährungsphasen-Verwaltung (Trainer-Ansicht)

### Tageseintrag (Athlet)
- [ ] Route: `/body-nutrition`
- [ ] "Heutigen Eintrag hinzufügen" Button (deaktiviert wenn bereits Eintrag für heute vorhanden)
- [ ] Formular-Felder:
  - Datum (heute als Default, Athlet kann ältere Einträge nachtragen bis 7 Tage zurück)
  - Gewicht (kg, Dezimalzahl, z.B. 82.5)
  - Körperfett (%, optional)
  - Brust-Umfang (cm, optional)
  - Bauch-Umfang (cm, optional)
  - Hüft-Umfang (cm, optional)
  - Oberschenkel-Umfang (cm, optional)
  - Notiz (Freitext, max 500 Zeichen, optional)
- [ ] Alle Pflichtfelder mit rotem Stern markiert (nur Gewicht ist Pflichtfeld)
- [ ] Zod-Validierung: Gewicht 20–300 kg, Körperfett 1–60%, Umfänge 20–200 cm
- [ ] Bestehenden Eintrag bearbeiten: "Bearbeiten" Button auf Heutiger-Eintrag-Card

### Fortschritts-Übersicht
- [ ] StatsCards: Aktuelles Gewicht, Gewichtsveränderung (7 Tage), Aktueller KF%, Trend-Pfeil
- [ ] Gewichtsverlauf: Linien-Chart (letzte 30 Tage, letzte 90 Tage, gesamt auswählbar)
- [ ] Verlaufstabelle: Datum, Gewicht, KF%, Umfänge — sortierbar, paginiert (20 pro Seite)
- [ ] "Exportieren" Button: CSV-Download aller Einträge

### Fotos (optional)
- [ ] Foto-Upload via Supabase Storage (max 10MB, JPG/PNG/WebP)
- [ ] Drei Foto-Typen: Frontal, Seitlich, Rücken
- [ ] Galerie zeigt alle Fotos chronologisch
- [ ] Foto-Vergleich: Zwei beliebige Fotos nebeneinander anzeigen
- [ ] Fotos sind privat (nur Athlet + zugeordneter Trainer kann sehen)

### Ernährungsphasen (Trainer)
- [ ] Route: `/body-nutrition/phases` (Trainer-Ansicht für Athleten)
- [ ] Phasen: Aufbau (Masse), Diät (Fettabbau), Erhaltung, Wettkampf-Peak
- [ ] Trainer erstellt Phase: Name, Startdatum, Enddatum, Zielgewicht, Kalorienziel, Notizen
- [ ] Athlet sieht aktive Phase im Dashboard (Card mit Phase-Name + Ziel + Tagen bis Ende)
- [ ] Phasen-Verlauf: Tabelle aller vergangenen und aktuellen Phasen

### Trainer-Ansicht (Athleten-Daten)
- [ ] Trainer kann über `/athletes/[id]/body-nutrition` die Daten seines Athleten einsehen
- [ ] Gleiche Ansicht wie Athlet — aber ohne Bearbeitungsmöglichkeit der Einträge
- [ ] Trainer kann Ernährungsphasen für diesen Athleten verwalten

## Edge Cases
- Eintrag für vergangenes Datum: Erlaubt bis 7 Tage rückwirkend, danach gesperrt (Datenintegrität)
- Duplikater Eintrag für dasselbe Datum → Fehlermeldung "Für dieses Datum existiert bereits ein Eintrag" mit "Bearbeiten" Link
- Foto-Upload Fehler: Netzwerkfehler → Retry-Button, Fortschritt wird nicht verloren
- Chart mit nur 1 Datenpunkt: Zeigt Punkt ohne Linie, Hinweistext "Füge mehr Einträge hinzu um den Verlauf zu sehen"
- Trainer sieht Athleten-Daten wenn Verbindung getrennt wird → Zugriff sofort gesperrt (RLS)

## Technical Requirements
- Security: RLS — Athlet sieht nur eigene Daten; Trainer sieht nur Daten seiner verknüpften Athleten
- Performance: Chart-Daten-Aggregation serverseitig (nicht alle Rohdaten an Client schicken)
- Storage: Fotos werden in Supabase Storage in Bucket `body-photos` (private) gespeichert
- Validation: Alle Messwerte serverseitig validiert (Supabase RLS + API Route Handler)
- Chart: Lightweight Chart-Library (z.B. Recharts oder Chart.js) — nur für dieses Feature laden

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
