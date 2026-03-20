# PROJ-10: Admin-Bereich (Benutzerverwaltung)

## Status: Planned
**Created:** 2026-03-12
**Last Updated:** 2026-03-20

## Dependencies
- Requires: PROJ-4 (Authentication) — `app_metadata.is_platform_admin` Flag

## Übersicht
Plattform-Administratoren haben Zugang zu einer Benutzerverwaltung im Admin-Bereich. Alle registrierten User (Trainer + Athleten) können eingesehen, ihre Rollen geändert und Accounts gesperrt/entsperrt werden. Der Admin-Bereich ist ausschließlich für interne Nutzung.

**Abgrenzung — was NICHT in PROJ-10 gehört:**
- Globale Übungen/Kategorien → werden über die bestehende PROJ-12 UI verwaltet (Admin hat vollen Zugriff via `is_platform_admin` RLS)
- Platform Templates → werden im Training Workspace (PROJ-7) mit Admin/Trainer-Scope-Pattern erstellt
- Audit-Log, System-Statistiken → spätere Iterationen bei Bedarf

## User Stories
- Als Platform-Admin möchte ich alle registrierten Benutzer in einer Tabelle sehen, damit ich den Überblick über meine Plattform habe
- Als Platform-Admin möchte ich nach Name oder E-Mail suchen, damit ich schnell einen bestimmten User finde
- Als Platform-Admin möchte ich die Rolle eines Users ändern (TRAINER ↔ ATHLETE), falls bei der Registrierung die falsche Rolle gewählt wurde
- Als Platform-Admin möchte ich einen Account sperren, damit missbräuchliche Nutzung unterbunden wird
- Als Platform-Admin möchte ich einen gesperrten Account wieder entsperren
- Als Platform-Admin möchte ich eine Passwort-Reset-E-Mail an einen User senden, falls dieser sein Passwort vergessen hat und keinen Zugang zur Reset-Funktion hat

## Acceptance Criteria

### Figma Screens
- [ ] Figma Screen: Benutzerverwaltung (Tabelle mit Filter/Suche, Desktop + Mobile)
- [ ] Figma Screen: User-Detail Slide-Over (Profil, Aktionen)

### Benutzerverwaltung
- [ ] Route: `/admin/users`
- [ ] Nur für `is_platform_admin = true` zugänglich (Server-seitiger Guard + Middleware)
- [ ] Nicht-Admins werden stillschweigend auf `/dashboard` umgeleitet (kein Fehler-Screen)
- [ ] Tabelle: Name, E-Mail, Rolle (TRAINER/ATHLETE), Registrierungsdatum, Letzter Login, Status (Aktiv/Gesperrt)
- [ ] Filter: Rolle (Alle/Trainer/Athlete), Status (Alle/Aktiv/Gesperrt)
- [ ] Suche: Live-Suche nach Name oder E-Mail (debounced, server-seitig)
- [ ] Sortierung: Name A-Z/Z-A, Registrierungsdatum, Letzter Login
- [ ] Pagination: Server-seitig, 25 User pro Seite
- [ ] Klick auf User öffnet Slide-Over Panel mit Details + Aktionen

### User-Detail (Slide-Over Panel)
- [ ] Zeigt: Name, E-Mail, Avatar, Rolle, Registrierungsdatum, Letzter Login, Status
- [ ] Zeigt: Anzahl Athleten-Verbindungen (bei Trainern), Team-Mitgliedschaften
- [ ] Aktion: Rolle ändern (TRAINER ↔ ATHLETE) mit Bestätigungs-Dialog
- [ ] Aktion: Account sperren/entsperren mit Bestätigungs-Dialog
- [ ] Aktion: Passwort-Reset-E-Mail senden
- [ ] Admin kann sich NICHT selbst sperren oder die eigene Rolle ändern

### Account sperren/entsperren
- [ ] Sperre setzt `banned_until = 'none'` via Supabase Admin API (`auth.admin.updateUserById`)
- [ ] Gesperrter User kann sich nicht einloggen (Supabase Auth blockiert automatisch)
- [ ] Entsperren setzt `banned_until = null`
- [ ] Status-Badge in der Tabelle: Grün "Aktiv" / Rot "Gesperrt"
- [ ] Gesperrte User bleiben in der Liste sichtbar (werden nicht versteckt)

### Rolle ändern
- [ ] Ändert `app_metadata.roles` via Supabase Admin API
- [ ] Bestätigungs-Dialog: "Rolle von [Name] von [Alt] zu [Neu] ändern?"
- [ ] Warnung wenn Trainer Athleten hat: "Dieser Trainer hat X aktive Athleten. Die Verbindungen bleiben bestehen."

### Passwort-Reset
- [ ] Sendet Passwort-Reset-E-Mail via Supabase Admin API
- [ ] Bestätigungs-Dialog: "Passwort-Reset-E-Mail an [Email] senden?"
- [ ] Erfolgs-Toast: "E-Mail wurde gesendet"

### i18n
- [ ] Neuer Namespace `admin` in de.json + en.json
- [ ] Alle Strings über `useTranslations("admin")`
- [ ] Deutsche Umlaute korrekt

## Edge Cases
1. **Admin sperrt sich selbst** → Button deaktiviert + Tooltip "Du kannst deinen eigenen Account nicht sperren"
2. **Admin ändert eigene Rolle** → Button deaktiviert + Tooltip "Du kannst deine eigene Rolle nicht ändern"
3. **Letzter Admin sperrt/ändert sich** → Kein spezieller Check nötig (Punkt 1 + 2 decken das ab)
4. **User gerade eingeloggt und wird gesperrt** → Nächster API-Call schlägt fehl, Session läuft aus
5. **Suche findet nichts** → EmptyState "Kein Benutzer gefunden"
6. **Mehr als 1000 User** → Server-seitige Pagination, kein Client-seitiges Laden aller User

## Technical Requirements
- Security: Server Actions verwenden `supabase.auth.admin.*` Methoden (erfordern Service-Role-Key)
- Security: Jeder Server Action prüft `is_platform_admin` bevor sie ausgeführt wird
- Security: **KEIN** `"ADMIN"` UserRole — Zugriff ausschließlich über `is_platform_admin` Flag
- Performance: User-Tabelle ist server-seitig paginiert (nicht alle User auf einmal laden)
- Data: User-Daten kommen aus `auth.users` (Supabase Auth) + `profiles` Tabelle (falls vorhanden)

## Zugriffs-Architektur

```
Server Component (/admin/users/page.tsx)
  → getUser() → prüfe app_metadata.is_platform_admin
  → false → redirect("/dashboard")
  → true  → lade User-Liste via Admin API

NavMain (Client)
  → NavEntry "admin" hat requiresPlatformAdmin: true
  → Nur sichtbar wenn isPlatformAdmin = true

Server Actions
  → Alle nutzen createAdminClient() mit Service-Role-Key
  → Jede Action prüft is_platform_admin bevor Mutation
```

### Warum kein UserRole "ADMIN"?
- Platform-Admins sind reguläre Nutzer (Trainer/Athlete) mit zusätzlichem Zugriffs-Flag
- Ermöglicht: Ein Trainer kann gleichzeitig Platform-Admin sein
- Verhindert: Rollenverwechslung zwischen Club-Admin (PROJ-9) und Platform-Admin
- Sicherheit: Flag nur via Service-Role-Key setzbar — kein Self-Escalation möglich

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Component Structure

```
/admin/users (Benutzerverwaltung)
│
├── AdminUsersPage (Server Component — data fetch + admin guard)
│   │
│   ├── Page Header
│   │   └── Title + User Count
│   │
│   ├── Toolbar Row
│   │   ├── Search Input (debounced, server-seitig via URL-Params)
│   │   ├── Role Filter (Alle / Trainer / Athlete)
│   │   ├── Status Filter (Alle / Aktiv / Gesperrt)
│   │   └── Sort Select (Name A-Z / Z-A / Neueste / Letzter Login)
│   │
│   ├── UsersTable (Client Component)
│   │   ├── Table Header (sortable columns)
│   │   ├── UserRow (per user)
│   │   │   ├── Avatar + Name
│   │   │   ├── E-Mail
│   │   │   ├── Rolle Badge (TRAINER teal / ATHLETE violet)
│   │   │   ├── Registrierungsdatum
│   │   │   ├── Letzter Login (relative, z.B. "vor 3 Tagen")
│   │   │   └── Status Badge (Aktiv grün / Gesperrt rot)
│   │   ├── Pagination (Prev / Page Numbers / Next)
│   │   └── EmptyState (keine Ergebnisse)
│   │
│   └── UserDetailSlideOver (Sheet from right)
│       ├── User Info Section
│       │   ├── Avatar + Name + E-Mail
│       │   ├── Rolle Badge + Registrierungsdatum
│       │   ├── Letzter Login + Status
│       │   └── Stats: Athleten-Verbindungen, Teams
│       │
│       └── Actions Section
│           ├── Rolle ändern (Select + Confirm Dialog)
│           ├── Account sperren/entsperren (Toggle + Confirm Dialog)
│           └── Passwort-Reset senden (Button + Confirm Dialog)
```

### B) Data Model

**Keine neuen Tabellen nötig.** Alle Daten kommen aus bestehenden Quellen:

- **User-Daten:** `auth.users` via Supabase Admin API (`auth.admin.listUsers()`)
  - id, email, created_at, last_sign_in_at, banned_until
  - app_metadata.roles, app_metadata.is_platform_admin, app_metadata.onboarding_completed
  - user_metadata.display_name, user_metadata.avatar_url

- **Zusätzliche Stats:** Abfragen auf bestehenden Tabellen
  - Athleten-Verbindungen: `SELECT count(*) FROM athlete_connections WHERE trainer_id = X`
  - Team-Mitgliedschaften: `SELECT count(*) FROM team_members WHERE user_id = X`

**Supabase Admin API statt RLS:** Die `auth.users` Tabelle ist nicht via RLS zugänglich. Alle User-Operationen laufen über `supabase.auth.admin.*` mit Service-Role-Key.

### C) Tech Decisions

| Decision | Why |
|----------|-----|
| Server-seitige Suche + Pagination | Auth Admin API unterstützt `page`, `perPage`, Filter. Client braucht nicht alle User laden. |
| URL-basierte Filter (searchParams) | Filter/Suche als URL Query Params (`?q=max&role=TRAINER&page=2`). Server Component liest diese und fetcht passend. Ermöglicht: Shareable URLs, Browser-Back, SSR. |
| Supabase Admin API (nicht direkte DB-Abfragen) | `auth.users` ist kein reguläres Schema — kein RLS möglich. Admin API ist der offizielle Weg. |
| Service-Role-Key nur in Server Actions | Nie im Client. Alle Mutationen über `"use server"` Actions in `src/lib/admin/actions.ts`. |
| Sheet für User-Detail (wie PROJ-12) | Konsistentes Pattern. User bleibt in der Tabelle, Details gleiten von rechts ein. |
| Kein eigener Admin-Client-Wrapper | Bestehenes Pattern aus `set-role/route.ts` wiederverwenden: `createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })`. |
| Keine neue Migration | Keine neuen Tabellen. Alles auf bestehender Infrastruktur. |

### D) Dependencies

**Keine neuen Packages.** Alles vorhanden:
- shadcn/ui (Table, Sheet, Badge, Select, Input, Dialog, Pagination, Button)
- @supabase/supabase-js (Admin API)
- next-intl (i18n)

### E) New Files

```
src/lib/admin/
├── types.ts          — AdminUser interface, Filter types
├── queries.ts        — Server-side: listUsers, getUserDetails (Admin API)
└── actions.ts        — Server Actions: banUser, unbanUser, changeRole, sendPasswordReset

src/components/admin/
├── admin-users-page.tsx    — Client Component (table, filters, pagination state)
├── users-table.tsx         — Table with sortable columns
├── user-detail-slide-over.tsx — Sheet with user info + action buttons

src/app/[locale]/(protected)/admin/
├── layout.tsx        — Admin layout with is_platform_admin guard
└── users/
    ├── page.tsx      — Server Component, reads searchParams, fetches users
    └── loading.tsx   — Skeleton loader
```

### F) Build Order

1. **Types:** AdminUser interface, filter/pagination types
2. **Queries:** `listUsers(params)` + `getUserStats(userId)` via Admin API
3. **Actions:** `banUser`, `unbanUser`, `changeUserRole`, `sendPasswordReset`
4. **Admin Layout:** `is_platform_admin` guard (shared across all future admin pages)
5. **Components:** users-page → table → slide-over
6. **Route:** Wire up `/admin/users` page with searchParams
7. **i18n:** `admin` namespace in de.json + en.json

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
