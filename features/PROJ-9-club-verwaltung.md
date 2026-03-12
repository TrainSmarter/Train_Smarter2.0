# PROJ-9: Club-Verwaltung

## Status: Planned
**Created:** 2026-03-12
**Last Updated:** 2026-03-12

## Dependencies
- Requires: PROJ-1–PROJ-5 (Fundament + Athleten-Management)
- Requires: PROJ-4 (Authentication) — Club-Admin Rolle

## Übersicht
Organisationen (Vereine/Clubs) können mehrere Trainer und deren Athleten unter einem Dach verwalten. Club-Admins verwalten Mitgliedschaften, Trainer laden Athleten ein wie bisher — aber innerhalb des Club-Kontexts.

## User Stories
- Als Club-Admin möchte ich einen Verein anlegen und Trainer einladen, damit alle unter einem Dach arbeiten
- Als Trainer (Club-Mitglied) möchte ich sehen welche anderen Trainer im Club sind
- Als Club-Admin möchte ich Statistiken über alle Athleten im Club sehen

## Acceptance Criteria

### Figma Screens
- [ ] Figma Screen: Club-Übersicht (Trainer-Liste, Athleten-Übersicht)
- [ ] Figma Screen: Club erstellen/bearbeiten
- [ ] Figma Screen: Mitglied einladen

### Club-Erstellung
- [ ] Route: `/clubs/new`
- [ ] Felder: Club-Name, Beschreibung, Logo (optional)
- [ ] Ersteller wird automatisch Club-Admin
- [ ] Maximal 1 Club pro Trainer (in v2.0)

### Mitglieder-Verwaltung
- [ ] Club-Admin kann Trainer per E-Mail einladen
- [ ] Club-Admin kann Mitglieder entfernen
- [ ] Rollen im Club: Admin, Trainer, Athlet
- [ ] Club-Übersicht zeigt alle Trainer + deren Athleten-Anzahl

### Club-Statistiken
- [ ] Gesamtanzahl Athleten, Trainer, aktive Programme
- [ ] Keine Einsicht in individuelle Körperdaten (Datenschutz)

## Edge Cases
- Trainer verlässt Club → Athleten-Trainer-Verbindungen bleiben bestehen (nur Club-Zugehörigkeit endet)
- Club-Admin Account gelöscht → Club wird an anderen Admin übergeben, sonst archiviert
- Club-Name bereits vergeben → Warnung aber nicht blockierend (kein Unique-Constraint)

## Technical Requirements
- Security: RLS — Club-Admin sieht nur eigenen Club; Trainer sieht nur seinen Club
- Multi-tenancy: Alle clubbezogenen Daten haben `club_id` Foreign Key

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
