# PROJ-5: Athleten-Management

## Status: In Progress
**Created:** 2026-03-12
**Last Updated:** 2026-03-13

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
- [ ] Route: `/organisation/athletes`
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
- [ ] Route: `/organisation/athletes/[id]`
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
- Athlet ist bereits mit einem anderen Trainer verbunden → Hinweis "Dieser Athlet ist bereits einem Trainer zugeordnet" (keine Blockierung, parallele Trainer möglich per Business-Entscheidung: NEIN aktuell → nur 1 Trainer pro Athlet)
- Trainer-Account gelöscht während Einladung ausstehend → Einladungs-Link zeigt Fehlermeldung
- Athlet entfernt sich aus Team während Trainer offline → Trainer sieht Athlet beim nächsten Laden nicht mehr
- Profilbild Upload: Nur JPG/PNG/WebP, max 5MB, wird auf 400×400px skaliert (serverseitig)

## Technical Requirements
- Security: RLS (Row Level Security) in Supabase — Trainer kann nur seine eigenen Athleten sehen
- Security: Einladungs-Token sind kryptographisch sicher und single-use
- Security: Persönliche Nachricht im Einladungs-Modal (Freitext, max. 500 Zeichen) wird vor dem Einfügen in das E-Mail-Template (PROJ-13) HTML-escaped — verhindert HTML-Injection in E-Mails
- Security: Alle User-Input-Felder (Name, E-Mail-Suche) validiert via Zod — kein roher SQL-String; Supabase parametrisierte Queries verhindern SQL-Injection
- Performance: Athleten-Liste lädt in < 500ms (Pagination bei > 50 Athleten)
- Realtime: Einladungs-Annahme reflektiert sich ohne Page-Reload beim Trainer (Supabase Realtime)

## Datenbankschema: trainer_athlete_connections (Phase 2)

Die Trainer-Athlet-Verbindung wird in einer eigenen Tabelle mit granularen Datensichtbarkeits-Berechtigungen gespeichert. Jeder Athlet entscheidet, welche Daten sein Trainer sehen darf.

```
trainer_athlete_connections
├── id: uuid (PK)
├── trainer_id: uuid (FK → auth.users)
├── athlete_id: uuid (FK → auth.users)
├── status: "pending" | "active" | "rejected" | "disconnected"
├── invited_at: timestamp
├── connected_at: timestamp | null
│
│  — Granulare Datensichtbarkeit (Athlet kontrolliert diese) —
├── can_see_body_data: boolean (default: true)   → Körpermaße, Gewicht
├── can_see_nutrition: boolean (default: false)  → Ernährungstagebuch
├── can_see_calendar: boolean (default: true)    → Trainingskalender
│
│  — Granulare Sichtbarkeit (Trainer kontrolliert diese) —
├── can_see_analysis: boolean (default: false)   → Athlet sieht eigene Auswertungs-Charts in Feedback (PROJ-6)
│
└── UNIQUE (trainer_id, athlete_id)
```

### Sichtbarkeits-Regeln
- Trainer sieht Athleten-Daten **nur** wenn die entsprechende `can_see_*` Flag `true` ist
- Athlet kann jederzeit `can_see_body_data`, `can_see_nutrition`, `can_see_calendar` deaktivieren (Einstellungen → Datenschutz)
- `can_see_analysis` wird vom **Trainer** gesetzt: aktiviert/deaktiviert die Auswertungs-Charts des Athleten in PROJ-6
- RLS-Policies prüfen alle Flags server-seitig — kein Client-seitiger Bypass möglich
- Standard: Körperdaten ja, Ernährung nein, Kalender ja, Analyse-Charts nein

### Rollen-Wechsel (Athlet → Trainer)
- Ein Nutzer kann sowohl Athlet als auch Trainer sein (future: role switch)
- Aktuell: `app_metadata.role` ist entweder ATHLETE oder TRAINER (kein dual-role)
- Migration zu dual-role in PROJ-11+ geplant

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Neue Routen
- `src/app/[locale]/(protected)/organisation/athletes/page.tsx` — Athleten-Übersicht (Trainer)
- `src/app/[locale]/(protected)/organisation/athletes/[id]/page.tsx` — Athlet-Profil Detail
- `src/app/[locale]/(protected)/profile/page.tsx` — Eigenes Profil (Athlet + Trainer)

### Komponenten-Baum

```
/organisation/athletes
├── PageHeader (Titel + InviteButton)
├── SearchBar (clientseitig)
├── SortDropdown
├── PendingSection
│   └── AthleteCard (pending) — Badge + ResendButton
├── ActiveSection (Grid 3/2/1)
│   └── AthleteCard (active) — Link → /[id]
├── EmptyState
└── InviteModal
    ├── E-Mail-Feld (Zod-validiert)
    └── Persönliche Nachricht (Textarea, max. 500 Z.)

/organisation/athletes/[id]
├── Breadcrumb
├── ProfileHeader (Avatar, Name, E-Mail, Datum, Status)
├── BasisdatenCard (Geburtsdatum, Alter)
└── DisconnectButton → AlertDialog

/profile
├── ProfileHeader + AvatarUpload (PROJ-4-Komponente)
├── MeinTrainerCard (nur Athleten)
│   └── TrennenButton → AlertDialog
└── MeineAthleten-Kurzliste (nur Trainer, Link → /organisation/athletes)

InvitationBanner (eingebettet im Dashboard)
├── AcceptButton
└── RejectButton → AlertDialog
    + Abgelaufen-Variante (read-only, kein Action)
```

### Datenbankmodell
Neue Tabelle `trainer_athlete_connections`:
- `trainer_id / athlete_id` — wer verbunden ist
- `status`: `pending → active | rejected | disconnected`
- `invited_at` — für 7-Tage-TTL-Prüfung
- `connected_at` — Datum der Annahme
- Sichtbarkeits-Flags: `can_see_body_data` (true), `can_see_nutrition` (false), `can_see_calendar` (true), `can_see_analysis` (false)
- UNIQUE(trainer_id, athlete_id) — verhindert Doppel-Einladungen

### Datenfluss
- **Initiales Laden:** Server Components (SSR) — kein Ladebalken
- **Mutationen:** Server Actions (Invite, Accept, Reject, Disconnect, Resend)
- **Live-Updates:** Supabase Realtime — Trainer sieht Annahme ohne Reload
- **Suche/Sort:** Clientseitig auf geladenen Daten

### API Route
`POST /api/athletes/invite` — benötigt Service-Role-Key für Supabase Auth Admin Invite; wird nach Bestätigung des Consents und Rolle aufgerufen.

### RLS-Strategie
- Trainer liest/schreibt nur eigene Verbindungen (`trainer_id = auth.uid()`)
- Athlet liest/aktualisiert nur eigene Verbindungen (`athlete_id = auth.uid()`)
- `can_see_*`-Flags: Athlet ändert body/nutrition/calendar; Trainer ändert analysis

### Pakete
Keine neuen — `@supabase/ssr`, `zod`, `sonner` bereits installiert.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
