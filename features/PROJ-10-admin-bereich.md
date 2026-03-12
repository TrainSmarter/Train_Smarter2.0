# PROJ-10: Admin-Bereich

## Status: Planned
**Created:** 2026-03-12
**Last Updated:** 2026-03-12

## Dependencies
- Requires: PROJ-1–PROJ-6 (alle Kern-Features)
- Requires: PROJ-4 (Authentication) — ADMIN Rolle

## Übersicht
Plattform-Administratoren haben Zugang zu einem Admin-Bereich für Benutzerverwaltung, Übungs-Datenbank-Pflege, Audit-Log und System-Statistiken. Der Admin-Bereich ist ausschließlich für interne Nutzung (nicht für Endkunden).

## User Stories
- Als Platform-Admin möchte ich alle registrierten Benutzer sehen und verwalten (Rolle ändern, Account sperren)
- Als Platform-Admin möchte ich die globale Übungs-Datenbank pflegen (Übungen hinzufügen, bearbeiten, löschen)
- Als Platform-Admin möchte ich ein Audit-Log aller kritischen Aktionen einsehen
- Als Platform-Admin möchte ich System-Statistiken sehen (Registrierungen, aktive User, Nutzung)

## Acceptance Criteria

### Figma Screens
- [ ] Figma Screen: Admin Dashboard (Statistik-Übersicht)
- [ ] Figma Screen: Benutzerverwaltung (Tabelle mit Filter/Suche)
- [ ] Figma Screen: Übungs-Datenbank-Editor
- [ ] Figma Screen: Audit-Log

### Benutzerverwaltung
- [ ] Route: `/admin/users`
- [ ] Tabelle: Name, E-Mail, Rolle, Registrierungsdatum, Letzter Login, Status
- [ ] Filter: Rolle, Status (aktiv/gesperrt), Registrierungsdatum
- [ ] Suche: Nach Name oder E-Mail
- [ ] Aktionen: Rolle ändern, Account sperren/entsperren, Passwort-Reset-E-Mail senden
- [ ] Gesperrter Account kann sich nicht einloggen (Supabase Auth disabled)

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
- Security: Admin-Routen prüfen serverseitig auf ADMIN-Rolle (Middleware + RLS)
- Security: Alle Admin-Aktionen werden im Audit-Log gespeichert (inklusive Admin-User-ID)
- Access: Admin-Bereich ist nur über direkten URL-Aufruf erreichbar (kein Nav-Item für Non-Admins)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
