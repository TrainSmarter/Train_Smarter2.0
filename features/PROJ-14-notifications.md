# PROJ-14: In-App Notifications & Benachrichtigungs-Einstellungen

## Status: Planned
**Created:** 2026-03-12
**Last Updated:** 2026-03-12

## Dependencies
- Requires: PROJ-1–PROJ-4 (Fundament)
- Requires: PROJ-13 (E-Mail) — E-Mail-Kanal für Benachrichtigungen
- Informs: PROJ-5 (Athleten-Management) — Einladungs-Events
- Informs: PROJ-6 (Feedback & Monitoring) — Check-in Events
- Informs: PROJ-7 (Training Workspace) — Workout-Completion Events
- Informs: PROJ-11 (DSGVO) — Export-fertig, Account-Löschung Events

## Übersicht
Einheitliches Benachrichtigungssystem mit zwei Kanälen (In-App + E-Mail) und granularen Einstellungen. Trainer können pro Benachrichtigungs-Typ konfigurieren ob und wie sie informiert werden. Athleten wählen nur den globalen Kanal. In-App: Bell-Icon im Header mit Unread-Badge, Notification-Panel mit allen Ereignissen. Technische Basis: Supabase Realtime für Live-Updates.

## Benachrichtigungs-Typen (alle Events im System)

| Typ | Empfänger | Auslöser |
|---|---|---|
| `invitation_received` | Athlet | Trainer lädt Athleten ein |
| `invitation_accepted` | Trainer | Athlet nimmt Einladung an |
| `invitation_rejected` | Trainer | Athlet lehnt Einladung ab |
| `connection_disconnected` | Trainer + Athlet | Verbindung getrennt (von wem auch immer) |
| `athlete_checkin_submitted` | Trainer | Athlet hat täglichen Check-in abgeschlossen |
| `athlete_missing_checkin` | Trainer | Athlet hat 3 Tage keinen Check-in (konfigurierbarer Schwellwert) |
| `workout_completed` | Trainer | Athlet hat Trainingseinheit als abgeschlossen markiert |
| `plan_expired` | Trainer | Zugewiesener Plan eines Athleten ist abgelaufen |
| `data_export_ready` | User | Daten-Export bereit zum Download |
| `account_deletion_confirmed` | User | Account-Löschung eingeleitet |

## User Stories
- Als Trainer möchte ich für jeden Benachrichtigungs-Typ einstellen können ob ich ihn per E-Mail, in der App oder gar nicht erhalten will, damit ich nicht von irrelevanten Meldungen überflutet werde
- Als Athlet möchte ich global wählen ob ich Benachrichtigungen per E-Mail, nur in der App oder überhaupt nicht erhalten will, damit ich die Kontrolle über meine Inbox habe
- Als Trainer möchte ich eine Bell-Icon im Header sehen die mir zeigt wie viele ungelesene Benachrichtigungen ich habe, damit ich nichts verpasse
- Als User möchte ich alle Benachrichtigungen in einem Panel einsehen, als gelesen markieren und direkt zur relevanten Seite springen
- Als Trainer möchte ich Benachrichtigungen für bestimmte Athleten stumm schalten können (Snooze), wenn ich gerade fokussiert arbeite

## Acceptance Criteria

### Figma Screens
- [ ] Figma Screen: Notification Bell + Panel (Desktop + Mobile)
- [ ] Figma Screen: Benachrichtigungs-Einstellungen (Trainer — Typ × Kanal Matrix)
- [ ] Figma Screen: Benachrichtigungs-Einstellungen (Athlet — globaler Kanal-Switch)
- [ ] Figma Screen: Leerer Zustand Notification Panel „Keine neuen Benachrichtigungen"

### Bell-Icon & Notification Panel (Header)
- [ ] Bell-Icon immer im App-Header sichtbar (neben Account-Avatar)
- [ ] Unread-Badge: Zahl der ungelesenen Notifications (verschwindet wenn alle gelesen, max. Anzeige „99+")
- [ ] Klick auf Bell: Notification-Panel öffnet als Dropdown/Slide-over (Desktop: Dropdown, Mobile: Bottom Sheet)
- [ ] Panel zeigt: Icon (Typ), Text (z.B. „Max Müller hat deinen Check-in abgeschlossen"), relative Zeit (vor 5min), ungelesen-Highlight
- [ ] Klick auf Notification: navigiert zur relevanten Seite (z.B. Athleten-Profil, Trainingseintrag) + markiert als gelesen
- [ ] „Alle als gelesen markieren" Button oben im Panel
- [ ] Panel zeigt max. 20 neueste Notifications, Link „Alle anzeigen" → `/notifications` (eigene Seite)
- [ ] Supabase Realtime: neue Notifications erscheinen sofort ohne Page-Reload + Bell-Badge aktualisiert sich live

### Notifications-Seite (/notifications)
- [ ] Route: `/notifications`
- [ ] Vollständige Liste aller Notifications (unendliches Scrollen / Pagination)
- [ ] Filter: Alle / Ungelesen / nach Typ
- [ ] Einzelne Notification löschen (Soft-Delete, 30 Tage Aufbewahrung)
- [ ] „Alle löschen" Button (mit Bestätigung)

### Benachrichtigungs-Einstellungen (Trainer)
- [ ] Route: `/account/einstellungen` → Sektion „Benachrichtigungen"
- [ ] Matrix: Zeilen = Benachrichtigungs-Typ, Spalten = Kanal (In-App / E-Mail / Keine)
- [ ] Pro Zeile: Radio-Button-Gruppe (nur eine Option wählbar)
- [ ] Standard-Einstellungen beim ersten Login (siehe Tabelle unten)
- [ ] Einstellungen werden sofort gespeichert (kein separater Speichern-Button)
- [ ] Gruppenbezeichnungen für Übersicht: „Athleten-Verbindungen", „Training & Monitoring", „System"

**Standard-Einstellungen Trainer:**
| Typ | Standard |
|---|---|
| invitation_accepted | In-App + E-Mail |
| invitation_rejected | In-App |
| connection_disconnected | In-App + E-Mail |
| athlete_checkin_submitted | In-App |
| athlete_missing_checkin | In-App + E-Mail |
| workout_completed | In-App |
| plan_expired | In-App + E-Mail |
| data_export_ready | E-Mail |
| account_deletion_confirmed | E-Mail |

### Benachrichtigungs-Einstellungen (Athlet)
- [ ] Route: `/account/einstellungen` → Sektion „Benachrichtigungen"
- [ ] Einfacher 3-Option Switch: „In-App & E-Mail" / „Nur In-App" / „Keine Benachrichtigungen"
- [ ] Gilt für alle Benachrichtigungs-Typen gleichzeitig (kein granulares Typ-Setting für Athleten)
- [ ] Standard: „In-App & E-Mail"
- [ ] Bei „Keine": Hinweis „Du wirst keine Benachrichtigungen erhalten. Wichtige System-Meldungen (z.B. Daten-Export) werden trotzdem als E-Mail gesendet."

### Snooze (Trainer)
- [ ] Rechtsklick / Swipe auf Notification im Panel: Snooze-Option für 1h, 4h, bis morgen
- [ ] Gesnoozete Notifications werden nach Ablauf wieder als ungelesen angezeigt

### Kanal-Logik (Entscheidungsbaum)
- [ ] Vor dem Senden jeder Notification: Prüfung `notification_preferences` Tabelle des Empfängers
- [ ] Kanal `in_app`: Eintrag in `notifications`-Tabelle → Supabase Realtime pusht an Client
- [ ] Kanal `email`: Trigger für PROJ-13 E-Mail-Template
- [ ] Kanal `none`: Kein Eintrag, keine E-Mail
- [ ] Trainer-Setting überschreibt Standard — Athlet-Setting (globaler Switch) überschreibt Trainer-Setting nie (jeder User kontrolliert nur eigene Preferences)

## Edge Cases
- User deaktiviert alle Notifications, bekommt aber `data_export_ready` als E-Mail → System-Mails werden immer gesendet unabhängig von Preferences (DSGVO-relevant)
- Supabase Realtime-Verbindung unterbrochen → Bell-Badge aktualisiert sich beim nächsten Page-Load (Fallback: Polling alle 60s)
- Notification für gelöschten User (PROJ-11) → Notification wird nicht erzeugt (Sender-Check vor Erzeugung)
- 100+ ungelesene Notifications → Panel zeigt die 20 neuesten, Rest via `/notifications` Seite
- Notification-Link führt zu gelöschter Ressource (z.B. Plan wurde gelöscht) → Fehlermeldung „Diese Ressource existiert nicht mehr" statt 404

## Technical Requirements
- Realtime: Supabase Realtime `postgres_changes` auf `notifications`-Tabelle (INSERT event) für Live-Updates
- Security: RLS — User sieht nur eigene Notifications (`user_id = auth.uid()`)
- Performance: Bell-Badge Count ist ein separater leichtgewichtiger Query (nicht die volle Notification-Liste)
- Retention: Notifications nach 30 Tagen automatisch gelöscht (Supabase Cron Job / Edge Function)
- Privacy: Notification-Inhalte dürfen keine sensiblen Daten enthalten (kein Körpergewicht, keine RPE-Werte in Notification-Text)

## Datenbankschema

```
notifications
├── id: uuid (PK)
├── user_id: uuid (FK → auth.users)
├── type: notification_type enum (alle Typen aus der Tabelle oben)
├── payload: jsonb        — z.B. { "athlete_name": "Max", "athlete_id": "uuid" }
├── read_at: timestamp | null
├── snoozed_until: timestamp | null
├── created_at: timestamp
└── is_deleted: boolean

notification_preferences
├── id: uuid (PK)
├── user_id: uuid (FK → auth.users)
├── notification_type: notification_type enum | "all"  — "all" = globale Einstellung (Athlet)
├── channel: "inapp_and_email" | "inapp_only" | "email_only" | "none"
└── UNIQUE (user_id, notification_type)
```

---
<!-- Sections below are added by subsequent skills -->

## Offene Punkte aus PROJ-11 (DSGVO)

- [ ] **Event `connection_disconnected` bei Account-Löschung:** Wenn ein Trainer seinen Account löscht, werden alle Verbindungen auf `disconnected` gesetzt (bereits implementiert in `/api/gdpr/delete-account`). Die In-App Notification „Dein Trainer hat die Plattform verlassen — die Verbindung wurde automatisch getrennt" muss hier ausgelöst werden. (PROJ-11 BUG-12)
- [ ] **Event `account_deletion_confirmed`:** In-App Bestätigung der Account-Löschung (bereits in Benachrichtigungs-Typen-Tabelle oben definiert)
- [ ] **Event `data_export_ready`:** In-App Benachrichtigung wenn Export fertig — aktuell nicht nötig (sync Download), aber bei Umstellung auf async relevant

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
