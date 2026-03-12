# PROJ-9: Club-Verwaltung

## Status: Planned
**Created:** 2026-03-12
**Last Updated:** 2026-03-12

## Dependencies
- Requires: PROJ-1–PROJ-5 (Fundament + Athleten-Management)
- Requires: PROJ-4 (Authentication) — Supabase Auth + app_metadata

## Navigation-Kontext
Club-Verwaltung ist Teil der **Organisation**-Kategorie im Training Workspace (Nav-Item: `Organisation`).

```
/organisation
  /athletes       ← PROJ-5 (individuelle Trainer-Athlet-Verbindungen)
  /clubs          ← PROJ-9 (Club-/Vereinsstrukturen)
  /clubs/[id]     ← Club-Detail + Mitglieder
```

Trainer ohne Club-Mitgliedschaft sehen unter Organisation nur ihre individuellen Athleten (PROJ-5). PROJ-9 erweitert Organisation um Club-Strukturen.

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
- [ ] Route: `/organisation/clubs/new`
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

## Datenbankschema: club_memberships (Phase 2)

> **WICHTIG:** "Club-Admin" ist **kein** globaler UserRole-Typ. Es gibt keine `"ADMIN"` in `UserRole`.
> Club-Adminrechte werden ausschließlich über die `club_memberships`-Tabelle geregelt.

```
clubs
├── id: uuid (PK)
├── name: text
├── description: text | null
├── logo_url: text | null
└── created_at: timestamp

club_memberships
├── id: uuid (PK)
├── club_id: uuid (FK → clubs)
├── user_id: uuid (FK → auth.users)
├── club_role: "OWNER" | "TRAINER" | "ATHLETE"
│     OWNER   → Kann Club-Mitglieder verwalten, Club-Einstellungen ändern
│     TRAINER → Sieht andere Trainer im Club, kann Athleten (im Club-Kontext) einladen
│     ATHLETE → Sieht nur eigene Daten, kein Zugriff auf Club-Verwaltung
├── joined_at: timestamp
└── UNIQUE (club_id, user_id)
```

### Abgrenzung Club-Rolle vs. globale Rolle
| | Globale Rolle (`app_metadata.role`) | Club-Rolle (`club_memberships.club_role`) |
|---|---|---|
| Scope | Plattform-weit | Nur innerhalb eines Clubs |
| Gesetzt von | Server-Side (Edge Function) | Club-Owner via Club-Verwaltung |
| Beispiel | TRAINER | OWNER eines bestimmten Clubs |
| Zugriff Admin-Bereich | Nein (nur `is_platform_admin`) | Nein |

### Rollen-Logik
- Ersteller eines Clubs wird automatisch `OWNER`
- `OWNER` kann weitere `TRAINER` einladen und deren `club_role` ändern
- Ein `TRAINER` im Club kann auch `ATHLETE` sein (global) — die `club_role` ist unabhängig
- `is_platform_admin` (globaler Flag) hat keinen Einfluss auf Club-Berechtigungen

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
