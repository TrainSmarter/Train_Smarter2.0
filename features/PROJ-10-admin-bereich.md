# PROJ-10: Admin-Bereich

## Status: Planned
**Created:** 2026-03-12
**Last Updated:** 2026-03-12

## Dependencies
- Requires: PROJ-1–PROJ-6 (alle Kern-Features)
- Requires: PROJ-4 (Authentication) — `app_metadata.is_platform_admin` Flag
- Requires: PROJ-7 (Training Workspace) — Platform Template Editor nutzt dieselbe Plan-Struktur

## Übersicht
Plattform-Administratoren haben Zugang zu einem Admin-Bereich für Benutzerverwaltung, Übungs-Datenbank-Pflege, Audit-Log und System-Statistiken. Der Admin-Bereich ist ausschließlich für interne Nutzung (nicht für Endkunden).

## User Stories
- Als Platform-Admin möchte ich alle registrierten Benutzer sehen und verwalten (Rolle ändern, Account sperren)
- Als Platform-Admin möchte ich die globale Übungs-Datenbank pflegen (Übungen hinzufügen, bearbeiten, löschen)
- Als Platform-Admin möchte ich Platform Templates auf allen Planungsebenen erstellen und veröffentlichen, damit alle Trainer einen professionellen Einstiegspunkt haben
- Als Platform-Admin möchte ich ein Audit-Log aller kritischen Aktionen einsehen
- Als Platform-Admin möchte ich System-Statistiken sehen (Registrierungen, aktive User, Nutzung)

## Acceptance Criteria

### Figma Screens
- [ ] Figma Screen: Admin Dashboard (Statistik-Übersicht)
- [ ] Figma Screen: Benutzerverwaltung (Tabelle mit Filter/Suche)
- [ ] Figma Screen: Übungs-Datenbank-Editor
- [ ] Figma Screen: Platform Templates — Übersicht + Editor
- [ ] Figma Screen: Audit-Log

### Benutzerverwaltung
- [ ] Route: `/admin/users`
- [ ] Tabelle: Name, E-Mail, Rolle, Registrierungsdatum, Letzter Login, Status
- [ ] Filter: Rolle, Status (aktiv/gesperrt), Registrierungsdatum
- [ ] Suche: Nach Name oder E-Mail
- [ ] Aktionen: Rolle ändern, Account sperren/entsperren, Passwort-Reset-E-Mail senden
- [ ] Gesperrter Account kann sich nicht einloggen (Supabase Auth disabled)

### Platform Templates
- [ ] Route: `/admin/templates`
- [ ] Übersicht aller Platform Templates (nach Level gruppiert: Mehrjahres / Jahres / Makro / Meso / Mikro)
- [ ] Template erstellen: Titel, Level, Sport-Typ, Schwierigkeitsgrad, Beschreibung, Planinhalt (via Training Workspace Editor)
- [ ] Template als Entwurf speichern (`is_published: false`) oder veröffentlichen (`is_published: true`)
- [ ] Veröffentlichte Templates erscheinen sofort im Universal-Selector aller Trainer (PROJ-7)
- [ ] Template bearbeiten: Original aktualisierbar (geklonte Trainer-Kopien bleiben unverändert — isolierte Snapshots)
- [ ] Template löschen: Soft-Delete — bereits geklonte Trainer-Templates bleiben erhalten
- [ ] Filter: Level, Sport-Typ, Schwierigkeit, Status (Entwurf/Veröffentlicht)

### Übungs-Datenbank
- [ ] Route: `/admin/exercises`
- [ ] CRUD für globale Übungen: Name, Beschreibung, Muskelgruppe(n), Video-URL (optional)
- [ ] Muskelgruppen als Tags (Multi-Select)
- [ ] Soft-Delete (Übungen nicht hart löschen, da Referenzen in Programmen)

### Audit-Log
- [ ] Route: `/admin/audit-log`
- [ ] Logt: User registriert, Login fehlgeschlagen (>3x), Athlet-Verbindung getrennt, Programm zugewiesen, Admin-Aktionen
- [ ] Filter: Zeitraum, Benutzer, Aktion-Typ
- [ ] Nicht editierbar (append-only)

### System-Statistiken
- [ ] Registrierungen pro Woche/Monat (Chart)
- [ ] Aktive User (letzte 7/30 Tage)
- [ ] Meistgenutzte Übungen
- [ ] Anzahl aktiver Programme

## Edge Cases
- Admin löscht eigenen Account → Verhindert mit Fehlermeldung "Du kannst deinen eigenen Account nicht löschen"
- Übung in Programm löschen → Soft-Delete, Programm zeigt "[Übung gelöscht]" Placeholder
- Audit-Log wird sehr groß → Archivierung nach 1 Jahr in Cold Storage (geplant für später)

## Technical Requirements
- Security: Admin-Routen prüfen serverseitig auf `app_metadata.is_platform_admin = true` (Middleware + RLS)
- Security: **KEIN** `"ADMIN"` UserRole — Zugriff ausschließlich über `is_platform_admin` Flag in `app_metadata`
- Security: Alle Admin-Aktionen werden im Audit-Log gespeichert (inklusive Admin-User-ID)
- Access: Admin-Bereich ist nur über direkten URL-Aufruf erreichbar (kein Nav-Item wenn `is_platform_admin = false`)

## Zugriffs-Architektur

```
Middleware (/admin/* Routen)
  → Lese app_metadata.is_platform_admin via Supabase getUser() (server-side)
  → false → Redirect zu /dashboard (kein Fehler-Screen, kein Hinweis)
  → true  → Zugriff erlaubt

NavMain (Client)
  → NavSection "admin" hat requiresPlatformAdmin: true
  → Nur sichtbar wenn isPlatformAdmin = true (aus app_metadata)

Supabase RLS
  → /admin/users → nur lesbar/schreibbar wenn is_platform_admin = true (service-role check)
```

### Warum kein UserRole "ADMIN"?
- Platform-Admins sind reguläre Nutzer (Trainer/Athlete) mit zusätzlichem Zugriffs-Flag
- Ermöglicht: Ein Trainer kann gleichzeitig Platform-Admin sein
- Verhindert: Rollenverwechslung zwischen Club-Admin (PROJ-9) und Platform-Admin
- Sicherheit: Flag nur via service-role key setzbar — kein Self-Escalation möglich

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
