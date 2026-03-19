# PROJ-17: Landing Page

## Status: Planned
**Created:** 2026-03-19
**Last Updated:** 2026-03-19
**Priority:** P0 (MVP)

## Dependencies
- Requires: PROJ-1 (Design System Foundation) — Farben, Typografie, Spacing
- Requires: PROJ-2 (UI Component Library) — Button, Card, Badge Komponenten
- Requires: PROJ-4 (Authentication & Onboarding) — Login/Register Flows für CTAs

## Overview

Professionelle, conversion-optimierte Landing Page für https://www.train-smarter.at. Die Seite ersetzt die bisherige Design-System-Showcase-Seite auf `/` und dient als erster Kontaktpunkt für neue Besucher. Eingeloggte User werden automatisch zum Dashboard redirected.

## User Stories

### US-1: Erster Eindruck
Als **potenzieller Trainer/Athlet**, der www.train-smarter.at zum ersten Mal besucht, möchte ich **sofort verstehen, was Train Smarter ist und welchen Mehrwert es bietet**, damit ich entscheiden kann, ob ich mich registrieren möchte.

### US-2: Schnelle Registrierung
Als **interessierter Besucher** möchte ich **mit maximal einem Klick zur Registrierung gelangen**, damit ich möglichst schnell starten kann.

### US-3: Feature-Überblick
Als **Trainer, der ein neues Tool evaluiert**, möchte ich **die Kernfunktionen auf einen Blick sehen** (Periodisierung, Monitoring, Teams), damit ich verstehe, ob das Tool meinen Anforderungen entspricht.

### US-4: Preisvergleich
Als **potenzieller Nutzer** möchte ich **das Pricing-Modell sofort sehen** (Free vs. Pro), damit ich weiß, ob das Tool in mein Budget passt.

### US-5: Vertrauen aufbauen
Als **skeptischer Besucher** möchte ich **Social Proof sehen** (Testimonials, Nutzerzahlen), damit ich Vertrauen in die Plattform aufbaue.

### US-6: Redirect für bestehende User
Als **eingeloggter Nutzer** möchte ich **direkt zum Dashboard weitergeleitet werden**, wenn ich die Startseite besuche, damit ich nicht unnötig die Marketing-Seite sehe.

### US-7: Zweisprachigkeit
Als **englischsprachiger Besucher** möchte ich **die Landing Page auf Englisch lesen**, damit ich die Inhalte verstehe.

## Sektionen (Top → Bottom)

### 1. Landing Header (sticky)
- Logo (links)
- Anchor-Navigation: Features, Pricing (scrollt zu Sektion)
- Sprach-Switcher (DE/EN)
- Buttons: „Anmelden" (ghost/outline) + „Kostenlos starten" (primary, filled)
- Transparent auf Hero, wird solid beim Scrollen (scroll-aware)

### 2. Hero Section
- **Headline:** Klare Value Proposition (1 Satz)
- **Subline:** USP-Beschreibung (Periodisierungshierarchie als Alleinstellungsmerkmal)
- **CTA-Buttons:** „Kostenlos starten" (primary) + „Mehr erfahren" (secondary/outline, scrollt zu Features)
- **Visual:** App-Screenshot Mockup (Dashboard in Browser-Frame)
- **Hintergrund:** Subtiler Gradient (Teal → Violet, leicht)

### 3. Feature-Übersicht
- **Headline:** „Alles was du für professionelles Training brauchst" o.ä.
- **6 Feature-Cards** im Grid (3×2 Desktop, 2×3 Tablet, 1×6 Mobile):
  1. **Athleten-Management** — Athleten verwalten, Teams organisieren
  2. **Periodisierung** — Mehrjahresplan bis Trainingseinheit in einem Tool
  3. **Monitoring & Feedback** — Subjektive Belastungsparameter, Check-ins
  4. **Trainingskalender** — Visuelle Übersicht aller geplanten Einheiten
  5. **Team-Verwaltung** — Teams erstellen, Athleten zuweisen
  6. **DSGVO-konform** — Datenschutz made in Austria
- Jede Card: Icon + Titel + 1-2 Sätze Beschreibung

### 4. Social Proof / Testimonials
- **3 Testimonial-Cards** (Platzhalter, später durch echte Daten ersetzbar)
  - Foto-Platzhalter (Avatar), Name, Rolle (z.B. „Athletiktrainer"), Zitat
- **Statistik-Counter-Row:** z.B. „500+ Athleten", „1.000+ Check-ins", „50+ Trainer"
  - Platzhalter-Zahlen, später durch echte Daten ersetzbar
  - Animierter Count-Up bei Scroll-In-View (optional, nice-to-have)

### 5. Pricing Section
- **Headline:** „Einfaches, transparentes Pricing"
- **2 Pricing-Cards** nebeneinander (Free + Pro):

| | Free | Pro |
|---|---|---|
| Preis | €0 / Monat | Kommt bald |
| Athleten | Bis zu 5 | Unbegrenzt |
| Trainingsplanung | Basis | Alle Planungsebenen |
| Monitoring | ✓ | ✓ |
| Team-Verwaltung | 1 Team | Unbegrenzt |
| Support | Community | Priorität |
| CTA | „Kostenlos starten" | „Auf Warteliste" |

- Pro-Card mit „Beliebt"-Badge und leichtem visuellen Hervorheben
- Konkrete Preise und Limits sind Platzhalter — müssen später angepasst werden

### 6. CTA-Footer Section
- **Headline:** „Bereit, smarter zu trainieren?"
- **Subline:** Kurzer Motivationstext
- **CTA-Button:** „Jetzt kostenlos starten" (primary, groß)
- Hintergrund: Gradient oder leicht eingefärbter Bereich (Teal-Ton)

### 7. Footer
- Logo + Tagline
- Links: Datenschutz, Impressum, AGB
- Sprach-Switcher
- Copyright

## Acceptance Criteria

### Struktur & Inhalt
- [ ] Landing Page wird auf `/` (Root) angezeigt für nicht-eingeloggte Besucher
- [ ] Eingeloggte User werden von `/` automatisch zu `/dashboard` redirected
- [ ] Alle 7 Sektionen sind vorhanden und visuell klar getrennt
- [ ] Alle Texte sind über next-intl lokalisiert (DE + EN)
- [ ] Keine hardcodierten Strings — alles in `de.json` / `en.json`
- [ ] Deutsche Umlaute korrekt (ä, ö, ü, ß)

### Navigation
- [ ] Landing Header ist sticky und wird beim Scrollen solid (transparent → opaque)
- [ ] Anchor-Links (Features, Pricing) scrollen smooth zur jeweiligen Sektion
- [ ] „Anmelden" → `/login`, „Kostenlos starten" → `/register`
- [ ] Sprach-Switcher wechselt zwischen DE und EN
- [ ] Logo verlinkt auf `/` (Scroll to top)

### Hero
- [ ] Headline und Subline sind klar lesbar auf allen Bildschirmgrößen
- [ ] App-Screenshot wird als statisches Bild in einem Device/Browser-Mockup dargestellt
- [ ] App-Screenshot zeigt ausschließlich fiktive Daten — keine echten Nutzerdaten, keine realen Namen/Avatare
- [ ] CTA-Buttons sind visuell prominent und haben Hover-States

### Features
- [ ] 6 Feature-Cards im responsiven Grid (3×2 → 2×3 → 1×6)
- [ ] Jede Card hat Icon, Titel und Beschreibung
- [ ] Icons nutzen Lucide Icons (bereits im Projekt)

### Social Proof
- [ ] 3 Testimonial-Cards mit Platzhalter-Daten
- [ ] Testimonials verwenden keine realen Fotos und keine existierenden Vereins-/Firmennamen — Initialen-Avatare + generische Rollen (z.B. „Athletiktrainer")
- [ ] Wenn echte Testimonials eingesetzt werden: schriftliche Einwilligung der zitierten Person erforderlich (DSGVO Art. 6 Abs. 1 lit. a)
- [ ] Statistik-Counter-Row mit Platzhalter-Zahlen
- [ ] Sobald echte Zahlen verwendet werden: nur aggregierte, nicht-personenbezogene Daten — kein Rückschluss auf einzelne Personen
- [ ] Platzhalter sind klar markiert (Kommentar im Code), damit sie später leicht ersetzt werden können

### Pricing
- [ ] 2 Pricing-Cards (Free + Pro) nebeneinander (Mobile: gestapelt)
- [ ] Pro-Card visuell hervorgehoben (Badge, Border, Schatten)
- [ ] Free-CTA → `/register`, Pro-CTA → disabled oder Wartelisten-Link
- [ ] Platzhalter-Limits sind im Code klar kommentiert

### Performance & SEO
- [ ] LCP < 2.5s (Hero-Bild optimiert via `next/image`)
- [ ] Metadaten (title, description) per Locale via `generateMetadata`
- [ ] Open Graph Tags für Social Sharing (Titel, Beschreibung, Bild)
- [ ] Semantisches HTML (header, main, section, footer, h1-h3 Hierarchie)

### Accessibility
- [ ] Alle Bilder haben Alt-Texte
- [ ] Keyboard-Navigation funktioniert für alle interaktiven Elemente
- [ ] Farbkontraste erfüllen WCAG AA
- [ ] Skip-to-content Link vorhanden
- [ ] Smooth-Scroll respektiert `prefers-reduced-motion`

### DSGVO & Datenschutz (öffentliche Seite)
- [ ] **Kein Cookie-Banner** — Seite setzt keine Cookies über technisch notwendige (Auth) hinaus; befreit nach § 165 TKG 2021
- [ ] **Keine externen Tracker/Analytics** — kein Google Analytics, Meta Pixel, Matomo oder ähnliches
- [ ] **Keine externen Ressourcen** — keine CDN-Fonts, keine externen Bilder, keine externen JS-Libraries; alles self-hosted (Fonts via `next/font/google` = lokal gebundelt)
- [ ] **Keine Social-Media-Embeds** — kein YouTube, Instagram, Twitter-Embed (würde IP an Dritte übertragen)
- [ ] **Footer enthält Pflicht-Links:** Datenschutzerklärung (`/datenschutz`), Impressum (`/impressum`), AGB (`/agb`) — Pflicht nach § 5 ECG / § 25 MedienG
- [ ] **Impressum** jederzeit ohne Login erreichbar (maximal 2 Klicks von jeder Seite)
- [ ] **CSP-Header** bleibt strikt (`default-src 'self'`) — keine Aufweichung für Landing Page
- [ ] **Registrierungs-CTAs** verlinken auf `/register` wo der bestehende PROJ-4/PROJ-11 Consent-Flow greift (AGB-Checkbox, granulare Einwilligungen)
- [ ] **Keine personenbezogenen Daten** auf der Landing Page selbst — alle Inhalte sind statisch/marketing-bezogen
- [ ] **Open Graph Bild** enthält keine personenbezogenen Daten (nur Brand/Marketing-Grafik)

### Responsive Design
- [ ] Mobile (< 640px): Single Column, kompakter Hero, gestapelte Cards
- [ ] Tablet (640px – 1024px): 2-Column Grids
- [ ] Desktop (> 1024px): Full Layout mit 3-Column Grids

## Edge Cases

### E1: Eingeloggter User besucht Landing Page
- Redirect zu `/dashboard` (serverseitig oder via Middleware)
- Kein Flash der Landing Page vor dem Redirect

### E2: User mit abgelaufenem/invalidem Token
- Landing Page normal anzeigen (kein Redirect)
- Login-Button im Header sichtbar

### E3: Slow Network / Bild lädt nicht
- App-Screenshot hat ein angemessenes Fallback (Hintergrundfarbe, Skeleton)
- Seite ist auch ohne Screenshot nutzbar

### E4: SEO Crawler
- Alle Inhalte server-side gerendert (SSR/SSG)
- Keine client-only Inhalte, die Crawler nicht sehen

### E5: Anchor-Link von externer URL
- `www.train-smarter.at/#pricing` scrollt direkt zur Pricing-Sektion
- Funktioniert auch bei Erstbesuch (kein JS-only Scrolling)

### E6: Design-System-Showcase-Seite
- Die bisherige Showcase-Seite auf `/` wird vollständig entfernt
- `/components` Showcase bleibt bestehen (separate Route)

### E7: Footer-Links
- Datenschutz, Impressum, AGB verlinken auf die bestehenden Legal-Seiten
- Links nutzen `Link` aus `@/i18n/navigation` für korrekte Locale-Prefixe

### E8: Später Analytics hinzufügen
- Falls in Zukunft Analytics gewünscht: nur datenschutzkonforme Tools (z.B. Plausible, self-hosted Matomo)
- Erfordert dann: Cookie-Banner-Implementierung, Datenschutzerklärung aktualisieren, CSP-Header anpassen
- Darf NICHT ohne diese Schritte aktiviert werden

### E9: Echte Testimonials ersetzen Platzhalter
- Vor Veröffentlichung echte Einwilligung der zitierten Person einholen (schriftlich, dokumentiert)
- Name, Rolle und Zitat mit der Person abstimmen
- Foto nur mit expliziter Bildrechte-Einwilligung

### E10: Screenshot zeigt versehentlich echte Daten
- Screenshot MUSS vor Deployment manuell geprüft werden
- Checkliste: keine echten Namen, E-Mails, Geburtsdaten, Gewichtsdaten sichtbar
- Im Zweifelsfall: komplett fiktive Demo-Daten in einer separaten Umgebung erstellen

## Technical Requirements

- **Rendering:** Server Component (SSR/SSG) — kein `"use client"` für die Hauptseite
- **Bilder:** `next/image` mit optimierten Formaten (WebP/AVIF)
- **Scroll-Behavior:** CSS `scroll-behavior: smooth` mit `prefers-reduced-motion` Fallback
- **Sticky Header:** `IntersectionObserver` oder `scroll` Event (minimale Client-Interaktivität)
- **Screenshot:** Statisches Bild unter `public/images/` (manuell erstellt oder Placeholder)
- **i18n Namespace:** `landing` (neuer Namespace in `de.json` / `en.json`)

## Out of Scope
- Animierte Scroll-Effekte (Parallax, Fade-in-on-scroll)
- Video-Embed im Hero
- Newsletter-Signup / E-Mail-Capture (würde Consent-Flow erfordern)
- A/B-Testing verschiedener Headlines
- Blog / Content-Marketing Sektion
- Live-Chat Widget (Drittanbieter-Embed → DSGVO-kritisch)
- Cookie-Consent-Banner (nicht erforderlich, da keine nicht-technischen Cookies)
- Analytics/Tracking jeglicher Art (bewusste Entscheidung — kein Nutzer-Tracking auf öffentlichen Seiten)
- Social-Media-Share-Buttons mit Drittanbieter-Scripts (IP-Transfer)

## Design-Referenz
- **Primary:** Teal `#0D9488`
- **Secondary:** Violet `#7C3AED`
- Brand-konformes Design gemäß Design Token System (PROJ-1)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
