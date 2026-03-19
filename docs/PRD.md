# Product Requirements Document

## Vision
Train Smarter ist eine professionelle Trainingsmanagement-Plattform für Athletiktrainer und Athleten. Die App ermöglicht es Trainern, ihre Athleten zu verwalten, Trainingsprogramme auf allen Planungsebenen zu gestalten (Mehrjahresplan bis Tagesplanung), Fortschritt zu analysieren, Anthropometrische Parameter zu dokumentieren und das Monitoring von subjektiven Belastungsparametern und Ernährung — alles auf einer modernen, skalierbaren Plattform.

**Alleinstellungsmerkmal:** Die vollständige Periodisierungshierarchie — von Mehrjahresplänen bis zur einzelnen Trainingseinheit — in einem einzigen Tool. Kein Konkurrent (TrainingPeaks, Trainerize, TeamBuildr, CoachAccountable) bietet diese Planungstiefe kombiniert mit modernem UX.

## Target Users

### Primär: Trainer / Coaches
- Betreuen 1–100 Athleten gleichzeitig
- Brauchen Überblick über alle Athleten auf einen Blick
- Planen auf allen Ebenen: Mehrjahrespläne, Jahrespläne, Makrozyklen, Mesozyklen, Mikrozyklen, Trainingseinheiten
- Verfolgen Belastung und Wiederherstellung, Körperdaten und Ernährung ihrer Athleten

### Sekundär: Athleten
- Erhalten und führen Trainingspläne ihres Trainers durch
- Tracken täglich Körpermaße, Gewicht, Ernährung, subjektives Empfinden
- Sehen ihren Trainingsfortschritt im Kalender

### Tertiär: Team-Organisatoren
- Erstellen und verwalten Teams innerhalb ihrer Trainerverbindungen
- Weisen Athleten Teams zu und organisieren Trainingsgruppen

## Core Features (Roadmap)

| Priority | Feature | Status |
|----------|---------|--------|
| P0 (MVP) | PROJ-1: Design System Foundation | Deployed |
| P0 (MVP) | PROJ-2: UI Component Library | Deployed |
| P0 (MVP) | PROJ-3: App Shell & Navigation | Deployed |
| P0 (MVP) | PROJ-4: Authentication & Onboarding | Deployed |
| P0 (MVP) | PROJ-5: Athleten-Management (Organisation) | Deployed |
| P0 (MVP) | PROJ-6: Feedback & Monitoring | Planned |
| P1 | PROJ-7: Training Workspace & Periodisierung | Planned |
| P1 | PROJ-8: Trainingskalender (Sub-View im Workspace) | Planned |
| P2 | PROJ-9: Team-Verwaltung | Deployed |
| P2 | PROJ-10: Admin-Bereich | Planned |
| P0 (MVP) | PROJ-11: DSGVO-Compliance & Datenschutz | Deployed |
| P1 | PROJ-12: Übungsbibliothek | Planned |
| P0 (MVP) | PROJ-13: E-Mail & Transaktions-Benachrichtigungen | Deployed |
| P1 | PROJ-14: In-App Notifications & Einstellungen | Planned |
| P1 | PROJ-15: Globale Suche | Planned |
| P0 (MVP) | PROJ-16: Test-Strategie & Qualitätssicherung | Deployed |
| P0 (MVP) | PROJ-17: Landing Page | Planned |
| P1 | PROJ-18: Trainer Default-Kategorien & Pflichtfelder | Planned |

## Success Metrics
- Trainer kann innerhalb von 5 Minuten nach Registrierung seinen ersten Athleten einladen
- Trainer kann einen vollständigen Makrozyklus (4 Wochen) in unter 15 Minuten erstellen
- Athlet kann täglichen Body-Eintrag in unter 1 Minute abschließen
- Alle Kernseiten laden in unter 1 Sekunde (LCP)
- 0 kritische Accessibility-Fehler (WCAG AA)

## Constraints
- Solo-Entwickler (Lukas Kitzberger)
- Tech Stack: Next.js 16, TypeScript, Tailwind CSS v3 (pinned), shadcn/ui, Supabase, Vercel, Recharts
- Design: Teal #0D9488 (Primary) + Violet #7C3AED (Secondary), Inter Variable, 8px-Grid
- Tailwind v3 bewusst gepinnt — Migration auf v4 wird als eigenes Ticket (PROJ-11+) geplant sobald shadcn/ui v4-kompatibel ist

## Non-Goals
- Native Mobile App (iOS/Android) — nur Web (responsive)
- Zahlungsabwicklung / Abonnement-Management
- KI-basierte Trainingsempfehlungen
- Video-Upload für Übungsdemonstration
- Real-Time Live-Tracking während einer Trainingseinheit
- Figma Code Connect publish (erfordert Organization-Plan — Infrastruktur vorbereitet, aktivierbar per `npm run figma:publish`)

---

Use `/requirements` to create detailed feature specifications for each item in the roadmap above.
