# PROJ-3: App Shell & Navigation

## Status: Planned
**Created:** 2026-03-12
**Last Updated:** 2026-03-12

## Dependencies
- Requires: PROJ-1 (Design System Foundation) — Farben, Spacing, Typografie
- Requires: PROJ-2 (UI Component Library) — Button, Tooltip, Badge
- Requires: PROJ-4 (Authentication) — User-Session für Header, Role-basierte Nav-Items

## Übersicht
Die App Shell definiert das übergeordnete Layout der Anwendung: Sidebar (kollabierbar), Header (fest), und der scrollbare Hauptinhalt. Parallel wird das Layout in Figma als Template dokumentiert. Die Navigation zeigt rollenabhängige Menüpunkte für Trainer, Athleten und Admins.

## User Stories
- Als Benutzer möchte ich eine persistente Sidebar die ich einklappen kann, damit ich mehr Platz für den Inhalt habe
- Als Trainer möchte ich in der Navigation nur Punkte sehen die für mich relevant sind (keine Admin-Links)
- Als Benutzer auf dem Handy möchte ich die Sidebar als Slide-Out Overlay, damit die Navigation nicht dauerhaft Platz wegnimmt
- Als Benutzer möchte ich jederzeit wissen auf welcher Seite ich bin (aktiver Nav-Eintrag, Breadcrumb)
- Als Benutzer möchte ich Benachrichtigungen im Header sehen, ohne die aktuelle Seite verlassen zu müssen

## Acceptance Criteria

### Figma Layout Templates
- [ ] Figma Frame: Desktop App Shell (1440px) — Sidebar expanded (256px) + Header (64px) + Content-Bereich
- [ ] Figma Frame: Desktop App Shell collapsed (1440px) — Sidebar collapsed (88px) + Header + Content
- [ ] Figma Frame: Mobile App Shell (375px) — kein Sidebar (hidden), Header mit Hamburger, Vollbild-Content
- [ ] Figma Frame: Mobile Sidebar Overlay (375px) — Sidebar als fixed overlay über Content
- [ ] Figma: Dashboard Grid Layout Template (4-spaltig Desktop, 2-spaltig Tablet, 1-spaltig Mobile)

### Sidebar
- [ ] Desktop: 256px expanded, 88px collapsed (nur Icons sichtbar)
- [ ] Kollaps-Animation: `transition-all duration-300 ease-in-out`
- [ ] Collapsed State: Tooltips auf jedem Nav-Item (zeigt Namen bei Hover)
- [ ] Logo: Train Smarter Logo + Gradient-Hintergrund in primary-Teal (#0D9488)
- [ ] Navigation-Struktur:
  - Dashboard
  - Training (kollabierbare Sektion mit Untermenü)
  - Body & Ernährung (kollabierbare Sektion)
  - Organisation (nur für TRAINER + ADMIN)
  - Account
- [ ] Aktiver Route: `bg-primary text-primary-foreground rounded-md`
- [ ] Hover State: `bg-gray-100 dark:bg-gray-800`
- [ ] Kollabierbare Sektionen: Pfeil-Icon rotiert bei expand/collapse
- [ ] Mobile: Hidden by default, wird zu fixed overlay (`z-50`) bei Hamburger-Klick
- [ ] Mobile: Tap außerhalb schließt die Sidebar

### Header
- [ ] Feste Höhe: 64px (`h-16`)
- [ ] Desktop: Logo nur in Sidebar, Header zeigt nur Content-Bereich-Titel (optional Breadcrumb)
- [ ] Mobile: Logo im Header sichtbar
- [ ] Rechts: Benachrichtigungs-Glocke mit unread-Badge (roter Punkt)
- [ ] Rechts: User-Avatar mit Dropdown (Name, Email, Avatar-Initial, Chevron)
- [ ] Avatar-Dropdown: Enthält "Mein Profil", "Einstellungen", "Abmelden"
- [ ] Mobile: Avatar ohne Name (Platz sparen)
- [ ] Hamburger-Button (Mobile): Öffnet Sidebar-Overlay

### Rollenbasierte Navigation
- [ ] Rolle `ATHLETE`: Sieht Dashboard, Training (nur Kalender), Body & Ernährung, Account
- [ ] Rolle `TRAINER`: Sieht alles + Organisation → Meine Athleten
- [ ] Rolle `ADMIN`: Sieht alles + Admin-Bereich
- [ ] Navigation-Items die nicht zur Rolle passen sind NICHT gerendert (nicht nur ausgeblendet)

### Layout-Wrapper
- [ ] `(protected)/layout.tsx`: E-Mail-Verifikation Check (Redirect wenn unverifiziert)
- [ ] Loading-State während Session-Check
- [ ] `main` Content-Bereich: `flex-1 overflow-y-auto`, padding `p-6 lg:p-8`

## Edge Cases
- Session abgelaufen während der User navigiert → Redirect zu `/login` mit `returnUrl`
- Sidebar-State (expanded/collapsed) wird in `localStorage` gespeichert (bleibt nach Reload)
- Wenn Benutzer keine Rolle hat (neu registriert, noch kein Onboarding) → Redirect zu Onboarding
- Sehr langer Name im Dropdown: Text truncaten mit `truncate max-w-[120px]`
- Sidebar auf iPad (768px): Verhält sich wie Mobile (Overlay)

## Technical Requirements
- Performance: Sidebar-Collapse darf kein Layout-Reflow verursachen (nur `width` animieren, nicht `display`)
- Accessibility: Navigation hat `<nav aria-label="Hauptnavigation">`, aktiver Link hat `aria-current="page"`
- Accessibility: Mobile Sidebar-Overlay hat `role="dialog"` und `aria-modal="true"`
- Responsive: Breakpoint für Mobile-Sidebar bei `lg` (1024px)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
