# PROJ-5: Athleten-Management

## Status: Planned
**Created:** 2026-03-12
**Last Updated:** 2026-03-12

## Dependencies
- Requires: PROJ-1 (Design System Foundation)
- Requires: PROJ-2 (UI Component Library) — Card, Modal, Button, Input, Badge, EmptyState
- Requires: PROJ-3 (App Shell & Navigation) — Layout
- Requires: PROJ-4 (Authentication) — User-Session, Rollen

## Übersicht
Trainer können Athleten einladen, verwalten und deren Profile einsehen. Athleten sehen ihr eigenes Profil und das ihres Trainers. Die Funktion umfasst: Einladungssystem per E-Mail, Athleten-Übersicht, Profil-Detailansicht und Verbindung trennen.

## User Stories
- Als Trainer möchte ich Athleten per E-Mail einladen, damit sie meinem Team beitreten können
- Als Trainer möchte ich eine Übersicht aller meiner Athleten auf einen Blick sehen, damit ich schnell navigieren kann
- Als Trainer möchte ich das Profil eines Athleten öffnen und seine Basisdaten sehen, damit ich ihn kenne
- Als eingeladener Athlet möchte ich die Einladung annehmen oder ablehnen, damit ich die Kontrolle habe
- Als Trainer möchte ich einen Athleten aus meinem Team entfernen, falls die Zusammenarbeit endet
- Als Athlet möchte ich sehen wer mein Trainer ist und kann die Verbindung trennen

## Acceptance Criteria

### Figma Screens
- [ ] Figma Screen: Athleten-Übersicht (Grid-Layout, Desktop + Mobile)
- [ ] Figma Screen: Athlet einladen (Modal mit E-Mail-Formular)
- [ ] Figma Screen: Einladung ausstehend (Badge "Einladung gesendet" auf Athlete-Card)
- [ ] Figma Screen: Athlet-Profil Detailseite
- [ ] Figma Screen: Einladung empfangen (Banner im Dashboard des Athleten)

### Athleten-Übersicht (Trainer)
- [ ] Route: `/athletes`
- [ ] Grid: 3 Spalten Desktop, 2 Spalten Tablet, 1 Spalte Mobile
- [ ] Athleten-Card zeigt: Avatar (Initial), Vollständiger Name, E-Mail, Status-Badge (Aktiv/Einladung ausstehend)
- [ ] "Athlet einladen" Button (primary, oben rechts)
- [ ] Suche/Filter: Live-Suche nach Name oder E-Mail
- [ ] Sortierung: Alphabetisch (A-Z / Z-A), Zuletzt aktiv
- [ ] Leerer Zustand: EmptyState-Komponente mit "Noch keine Athleten — Lade deinen ersten Athleten ein"
- [ ] Einladungen ausstehend: Werden als eigene Section angezeigt (oder visuell abgegrenzte Cards)

### Athlet einladen
- [ ] Modal mit E-Mail-Eingabefeld
- [ ] Optional: Persönliche Nachricht (Textarea, max 500 Zeichen)
- [ ] Supabase sendet Einladungs-E-Mail via Supabase Auth Invite
- [ ] Einladung gültig für 7 Tage
- [ ] Einladung bereits aktiver Athlet: Fehlermeldung "Dieser Athlet ist bereits in deinem Team"
- [ ] Einladung erneut senden: Button auf ausstehender Card (Rate-Limit: 1x pro 24h)

### Athlet-Profil Detailseite (Trainer)
- [ ] Route: `/athletes/[id]`
- [ ] Header: Avatar, Name, E-Mail, Verbindungsdatum, Status
- [ ] Profilbild falls vorhanden (Supabase Storage)
- [ ] Basisdaten: Geburtsdatum, Alter
- [ ] "Verbindung trennen" Button (danger, mit ConfirmDialog)
- [ ] Zurück-Link zur Athleten-Übersicht

### Einladungs-Flow (Athlet)
- [ ] Banner im Dashboard: "Du hast eine Einladung von [Trainer-Name]" mit "Annehmen" und "Ablehnen" Buttons
- [ ] Annehmen: Trainer-Athlet-Beziehung wird gespeichert, Banner verschwindet
- [ ] Ablehnen: ConfirmDialog "Einladung ablehnen?" — nach Bestätigung entfernt
- [ ] Einladung abgelaufen (>7 Tage): Banner zeigt "Diese Einladung ist abgelaufen" ohne Action-Buttons

### Eigenes Profil (Athlet)
- [ ] Route: `/profile`
- [ ] Zeigt: Avatar, Name, E-Mail, Rolle
- [ ] Mein Trainer-Sektion: Trainer-Name, Foto, E-Mail, Verbindungsdatum
- [ ] "Trainer trennen" Button (danger, ConfirmDialog)
- [ ] Profilbild ändern: Upload Button (Supabase Storage)

## Edge Cases
- Trainer lädt sich selbst ein → Fehlermeldung "Du kannst dich nicht selbst einladen"
- Athlet ist bereits mit einem anderen Trainer verbunden → Hinweis "Dieser Athlet ist bereits einem Trainer zugeordnet" (keine Blockierung, parallele Trainer möglich per Business-Entscheidung: NEIN in v2.0 → nur 1 Trainer pro Athlet)
- Trainer-Account gelöscht während Einladung ausstehend → Einladungs-Link zeigt Fehlermeldung
- Athlet entfernt sich aus Team während Trainer offline → Trainer sieht Athlet beim nächsten Laden nicht mehr
- Profilbild Upload: Nur JPG/PNG/WebP, max 5MB, wird auf 400×400px skaliert (serverseitig)

## Technical Requirements
- Security: RLS (Row Level Security) in Supabase — Trainer kann nur seine eigenen Athleten sehen
- Security: Einladungs-Token sind kryptographisch sicher und single-use
- Performance: Athleten-Liste lädt in < 500ms (Pagination bei > 50 Athleten)
- Realtime: Einladungs-Annahme reflektiert sich ohne Page-Reload beim Trainer (Supabase Realtime)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
