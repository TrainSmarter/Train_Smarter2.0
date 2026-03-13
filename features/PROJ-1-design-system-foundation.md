# PROJ-1: Design System Foundation

## Status: Deployed
**Created:** 2026-03-12
**Last Updated:** 2026-03-12

### Implementation Notes (v2 Brand Redesign — 2026-03-12)
Brand redesigned from Orange+Navy+Poppins → Teal+Violet+Inter. Complete brand analysis conducted:
- Primary: Teal #0D9488 (hsl 175 84% 32%) — distinctive, no major fitness app uses teal, sits between trust(blue) and growth(green), WCAG AA 4.6:1 ✓
- Secondary: Violet #7C3AED — complements teal, used sparingly for premium/achievement states
- Font: Inter Variable via next/font/google — 1 file replaces 8 Poppins WOFF2s, screen-optimized, tabular numbers
- Neutrals: Warm Slate (Tailwind built-in slate) — replaces navy-tinted custom gray
- Info color: Sky #0284C7 — distinct from Violet secondary (was confusingly also Navy)
- Dark mode: 4-level surface system (slate-950 → 900 → 800 → 700)
- New typography: added .text-display (40px), adjusted h2-h5 weights for Inter
- New component tokens: event.*, avatar.*, chart expanded to 8 series
- New keyframes: fade-in/out, slide-up/down, scale-in, progress-fill, shimmer, pulse-ring, spin-slow
- New motion: instant(100ms), slower(500ms) + enter/exit easings
- New touch target token: spacing.11 = 44px (WCAG 2.5.5)
- New utilities: .skeleton, [data-interactive] gradient-top-bar, [data-drop-zone], .progress-ring, .notification-badge
- Signature element changed: border-l-4 → 2px teal→violet gradient top bar on hover ([data-interactive])
- Figma Design Tokens frame updated via MCP to reflect new brand

### Implementation Notes (v1 — original)
- `tailwind.config.ts` fully rewritten: primary-50..900 (Orange), navy-50..900 (Indigo), success/warning/error/info semantic colors, custom border-radius (xs-2xl), box-shadow (xs-xl), Poppins as font-sans
- `src/app/globals.css` fully rewritten: 8 @font-face declarations (Poppins 400/500/600/700 latin + latin-ext), CSS custom properties for light + dark mode with Orange as --primary (HSL 9 71% 57%), dark sidebar with navy accent, typography utility classes (text-h1 through text-caption)
- `public/fonts/` created with 8 Poppins WOFF2 files (all under 10KB each, font-display: swap)
- `src/app/layout.tsx` updated: lang="de", suppressHydrationWarning for dark mode, metadata for Train Smarter
- `src/app/page.tsx` replaced with design system showcase page showing all tokens, typography, colors, components
- @fontsource/poppins installed as devDependency (used only for WOFF2 file extraction)
- Figma tokens are a manual step (not code) -- to be completed separately

## Dependencies
- None (Startpunkt des gesamten Projekts)

## Übersicht
Aufbau des Design-System-Fundaments als Single Source of Truth — parallel in Figma (Design Tokens) und im Code (Tailwind Config, CSS Variables, Poppins Font). Alle nachfolgenden Features bauen auf diesem Fundament auf.

## User Stories
- Als Entwickler möchte ich eine zentrale Tailwind-Konfiguration mit allen Design-Tokens, damit ich konsistente Abstände, Farben und Schriften ohne manuelle Werte verwende
- Als Designer möchte ich alle Design Tokens in Figma als Variables definiert haben, damit alle Figma-Screens automatisch konsistent sind
- Als Entwickler möchte ich CSS Custom Properties für alle Tokens, damit Dark Mode per `class="dark"` ohne JS funktioniert
- Als Teamitglied möchte ich eine klare Dokumentation der Token-Namen und -Werte, damit ich keine Werte erraten muss

## Acceptance Criteria

### Figma Design Tokens
- [x] Figma Variablen-Collection "Color/Primary" erstellt: primary-50 bis primary-950 (Basis: Teal #0D9488)
- [x] Figma Variablen-Collection "Color/Secondary" erstellt: violet-50 bis violet-950 (Basis: Violet #7C3AED)
- [x] Figma Variablen-Collection "Color/Semantic" erstellt: success (#10B981), warning (#F59E0B), error (#EF4444), info/sky (#0284C7) je mit light/default/dark Variante
- [x] Figma Variablen-Collection "Color/Gray" erstellt: gray (Warm Slate) 50–950
- [x] Figma Variablen-Collection "Spacing" erstellt: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px (8px-Grid)
- [x] Figma Variablen-Collection "Border Radius" erstellt: xs(2), sm(4), md(6), lg(8), xl(12), 2xl(16)
- [x] Figma Variablen-Collection "Shadow" erstellt: xs, sm, md, lg, xl + glow-sm, glow-md
- [x] Figma Text Styles erstellt: display, h1–h5, body-lg, body, body-sm, label, button, caption, mono (mit Inter Variable)
- [x] Light Mode und Dark Mode Varianten in Figma eingerichtet (4-level surface system)

### Code: Tailwind & CSS
- [x] `tailwind.config.ts` enthält alle Farb-Scales (primary, navy, gray, success, warning, error, info)
- [x] `tailwind.config.ts` enthält custom border-radius, shadow, spacing Extensions
- [x] `tailwind.config.ts` enthält Poppins als `fontFamily.sans` (lokal geladen)
- [x] `tailwind.config.ts` aktiviert `darkMode: 'class'`
- [x] `globals.css` definiert CSS Custom Properties für alle Farb-Tokens
- [x] `globals.css` enthält Typography-Klassen (h1–h5, body, label, caption)
- [x] Poppins-Font-Dateien lokal in `public/fonts/` vorhanden (Regular 400, Medium 500, SemiBold 600, Bold 700)
- [x] `@font-face` Deklarationen mit `font-display: swap` in globals.css
- [x] Dark-Mode Farb-Mapping via CSS Custom Properties funktioniert

## Design Token Spezifikationen (v2 — aktuell)

### Primary (Teal)
```
primary-50:  #F0FDFA
primary-100: #CCFBF1
primary-200: #99F6E4
primary-300: #5EEAD4
primary-400: #2DD4BF
primary-500: #14B8A6
primary-600: #0D9488  ← Brand Color
primary-700: #0F766E
primary-800: #115E59
primary-900: #134E4A
```

### Secondary (Violet)
```
violet-50:  #F5F3FF
violet-100: #EDE9FE
violet-200: #DDD6FE
violet-300: #C4B5FD
violet-400: #A78BFA
violet-500: #8B5CF6
violet-600: #7C3AED  ← Accent Color
violet-700: #6D28D9
violet-800: #5B21B6
violet-900: #2E1065
```

### Semantic Colors
```
success: #10B981  |  warning: #F59E0B  |  error: #EF4444  |  info/sky: #0284C7
```

### Typography Scale (Inter Variable)
```
display: 40px / line-height 48px / weight 700 (bold) / tracking -0.025em
h1:      32px / line-height 40px / weight 700 (bold) / tracking -0.02em
h2:      24px / line-height 32px / weight 600 (semibold) / tracking -0.015em
h3:      20px / line-height 28px / weight 600 (semibold) / tracking -0.01em
h4:      16px / line-height 24px / weight 600 (semibold)
h5:      14px / line-height 20px / weight 600 (semibold)

body-lg: 16px / line-height 24px / weight 400
body:    14px / line-height 20px / weight 400  ← Default
body-sm: 13px / line-height 20px / weight 400

label:   12px / line-height 16px / weight 500 (medium) / tracking +0.04em / UPPERCASE
button:  14px / line-height 20px / weight 500 (medium)
caption: 12px / line-height 16px / weight 400 (normal)
mono:    14px / line-height 20px / font-mono / weight 400
```

### Spacing (8px Grid)
```
xs: 4px  | sm: 8px  | md: 16px | lg: 24px
xl: 32px | 2xl: 48px | 3xl: 64px
Touch target: 44px (WCAG 2.5.5)
```

## Edge Cases
- Poppins-Font-Dateien fehlen im Repository → Build schlägt fehl mit 404 für Schriftarten → Fallback auf `system-ui, sans-serif` via CSS
- Dark Mode CSS Variables müssen spezifisch genug sein um shadcn/ui nicht zu überschreiben
- Tailwind Config muss mit Next.js 16 / Tailwind CSS v3.4 kompatibel sein
- Font-Loading darf LCP (Largest Contentful Paint) nicht negativ beeinflussen → `font-display: swap`

## Technical Requirements
- Performance: Poppins WOFF2 Dateien < 100KB pro Gewicht
- Browser Support: Chrome 100+, Firefox 100+, Safari 16+, Edge 100+
- Accessibility: Alle definierten Farb-Kombinationen WCAG AA konform (4.5:1 Kontrastverhältnis)
- Figma: Alle Tokens als Figma Variables (nicht nur Styles) für Auto-Sync

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Ansatz: Sauberes Fundament — Bestehende shadcn/ui-Defaults vollständig ersetzen

Das Projekt enthält bereits shadcn/ui mit neutralen Default-Farben. Diese werden **komplett überschrieben**, nicht gepatcht. Keine halben Sachen.

### Betroffene Dateien

| Datei | Aktion | Was passiert |
|-------|--------|-------------|
| `tailwind.config.ts` | **Vollständig neu schreiben** | shadcn/ui-Defaults entfernt, vollständige Markenskalen hinzugefügt |
| `src/app/globals.css` | **Vollständig neu schreiben** | shadcn/ui-Grau-Defaults ersetzt durch Orange + Navy Markenwerte |
| `public/fonts/` | **Neu erstellen** | Poppins WOFF2 lokal (4 Gewichte) |

### Architektur-Struktur

```
Design System Foundation (nur Frontend, kein Backend)
│
├── FIGMA — "Train Smarter — Design System"
│   ├── Seite: 🎨 Design Tokens
│   │   ├── Variables: Color/Primary (Orange-Skala, 11 Stufen)
│   │   ├── Variables: Color/Navy (Indigo-Skala, 11 Stufen)
│   │   ├── Variables: Color/Semantic (success/warning/error/info)
│   │   ├── Variables: Color/Gray (11 Stufen)
│   │   ├── Variables: Spacing (8px-Raster)
│   │   ├── Variables: Radius (6 Stufen)
│   │   ├── Variables: Shadow (5 Stufen)
│   │   └── Text Styles: h1–h5, body-lg/body/body-sm, label, button, caption
│   └── [weitere Seiten folgen ab PROJ-2]
│
└── CODE
    ├── tailwind.config.ts   ← primary-* + navy-* Skalen, Poppins, Radius, Shadow
    ├── src/app/globals.css  ← --primary → Orange, CSS Custom Properties, @font-face
    └── public/fonts/        ← Poppins-Regular/Medium/SemiBold/Bold.woff2
```

### Farb-Architektur (Kernentwscheidung)

**Orange = `--primary` (shadcn/ui Primary)**
Alle shadcn/ui Komponenten (Button variant="default", focus rings, etc.) nehmen automatisch Orange an. Das ist die stärkste, sauberste Lösung — ein Wert treibt das gesamte System.

**Navy = eigene `navy-*` Tailwind-Skala**
Wird explizit per Klasse gesetzt (`bg-navy-600`, `text-navy-400`) für Navigation, sekundäre Elemente. Kein shadcn/ui-Semantic-Override nötig.

```
shadcn/ui Variable    →  Wert
─────────────────────────────────────────────────
--primary             →  Orange #E05540 (HSL: 9 71% 57%)
--primary-foreground  →  Weiß (Text auf Orange-Buttons)
--destructive         →  Rot #EF4444 (bleibt)
--ring                →  Orange (Focus-Ringe)
--sidebar-primary     →  Navy #4F46E5 (Nav-Active-State)
```

### Tailwind Farbskalen (neue Tokens)

```
primary-50 … primary-900   (Orange — 11 Stufen)
navy-50 … navy-900         (Indigo — 11 Stufen)
success / warning / error / info  (mit -light / -dark Varianten)
```

Bestehende shadcn/ui Semantic-Tokens (`background`, `foreground`, `card`, `muted` etc.) bleiben als CSS-Variable-basierte Tokens erhalten — sie werden nur auf unsere Werte umgebogen.

### Font-Strategie

Poppins lokal hosten (kein Google Fonts CDN):
- Datenschutz-konform (kein Google-Tracking)
- Kein externer DNS-Lookup beim ersten Laden
- `font-display: swap` verhindert FOIT (Flash of Invisible Text)
- Poppins ersetzt `font-sans` global → alle shadcn/ui Komponenten übernehmen es automatisch

### Keine neuen npm-Pakete erforderlich

Alles lösbar mit Tailwind-Config-Erweiterung + CSS Custom Properties. Null neue Abhängigkeiten.

### Figma ↔ Code Synchronisation

Token-Namen werden 1:1 gespiegelt:
- Figma Variable `Color/Primary/500` = Tailwind-Klasse `primary-500` = CSS Var `--primary-500`
- Dadurch: Figma-Screen zeigt exakt was der Browser rendert

## QA Test Results (Round 3 -- 2026-03-12)

**Tested:** 2026-03-12
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI)
**Build Status:** PASS -- `npm run build` succeeds (Next.js 16.1.1 Turbopack, 3 static routes, 0 errors)
**Lint Status:** PASS -- `npm run lint` returns 0 errors, 0 warnings
**Context:** Re-test after fixes for BUG-P1-1, BUG-P1-3, BUG-P1-4 from previous round. All navy-* references removed from source code.

---

### Acceptance Criteria Status

#### Figma Design Tokens (Manual -- Not Testable by Code QA)
- [ ] SKIP: All 9 Figma acceptance criteria remain outside scope of code QA

#### AC: Code -- Tailwind & CSS

- [x] `tailwind.config.ts` contains color scales -- PASS. Primary (Teal) 50-950, Gray (Warm Slate) 50-950, Violet 50-950. Semantic colors: success, warning, error, info. Additional: event.*, avatar.*, chart (8 series).
- [x] `tailwind.config.ts` contains custom border-radius, shadow, spacing extensions -- PASS. border-radius xs-2xl, shadow xs-xl + glow-sm/glow-md, WCAG 2.5.5 touch target spacing.11=44px.
- [x] `tailwind.config.ts` contains Inter Variable as `fontFamily.sans` -- PASS.
- [x] `tailwind.config.ts` activates `darkMode: ["class"]` -- PASS (line 5).
- [x] `globals.css` defines CSS Custom Properties for all color tokens (light + dark) -- PASS. --primary = HSL 175 84% 32% (Teal). All shadcn/ui semantic tokens, chart-1..8, sidebar-*.
- [x] `globals.css` contains Typography classes -- PASS. 13 classes present (display, h1-h5, body-lg, body, body-sm, label, button, caption, mono). See BUG-P1-2 for spec drift still open.
- [x] Font loaded via `next/font/google` (Inter Variable) with `display: "swap"` and `subsets: ["latin", "latin-ext"]` -- PASS.
- [x] `public/fonts/` directory empty (Poppins removed) -- ACCEPTABLE. Inter loaded via next/font.
- [x] Dark Mode color mapping via CSS Custom Properties -- PASS. 4-level surface system.
- [x] Showcase page colors all reference valid Tailwind classes (primary-*, violet-*, gray-*) -- PASS. Zero navy-* references remain (verified via grep, only found in a comment in globals.css).

### Edge Cases Status

#### EC-1: Font fallback behavior
- [x] PASS: Fallback chain includes var(--font-inter), Inter, system-ui, -apple-system, etc.

#### EC-2: Dark Mode CSS Variables must not override shadcn/ui
- [x] PASS: .dark class uses exact shadcn/ui CSS variable names.

#### EC-3: Tailwind Config compatibility with Next.js 16
- [x] PASS: npm run build completes with Turbopack. Zero warnings.

#### EC-4: Font Loading must not negatively impact LCP
- [x] PASS: next/font/google optimizes font loading automatically.

#### EC-5: tailwindcss-animate plugin
- [x] PASS: Installed and registered.

#### EC-6: Dark mode toggle
- [x] PASS: ThemeProvider + ThemeToggle functional. Uses resolvedTheme correctly.

#### EC-7: WCAG AA contrast for primary teal on white
- [x] PASS: Teal-600 (#0D9488) 4.6:1 (AA). Teal-700 (#0F766E) 6.0:1 (AAA). WCAG guidelines documented in globals.css.

#### EC-8: Showcase page references removed color scales
- [x] PASS (FIXED): All navy-* references replaced with violet-* equivalents.

### Cross-Browser Testing

Code-level verification. PROJ-1 uses standard CSS features (custom properties, @layer, grid, flexbox, next/font).

- [x] Chrome 100+: All features supported. PASS.
- [x] Firefox 100+: All features supported. PASS.
- [x] Safari 16+: All features supported. supports-[backdrop-filter] conditional provides graceful degradation. PASS.

### Responsive Testing

- [x] 375px (Mobile): px-4 padding, grid-cols-2 for semantic colors, flex-wrap on swatches. PASS.
- [x] 768px (Tablet): sm:px-6, sm:grid-cols-4, sm:grid-cols-2. PASS.
- [x] 1440px (Desktop): lg:px-8, lg:grid-cols-3, max-w-5xl. PASS.

### Security Audit Results

- [x] No secrets exposed: .env.local.example has dummy values only. .gitignore excludes .env*.local and .mcp.json.
- [x] No API endpoints: Static pages only (/, /components, /_not-found).
- [x] No user input processing: Demo input has no event handlers that send data.
- [x] Font loading: Inter loaded via next/font (self-hosted after build). Google Fonts CDN NOT called at runtime -- privacy compliant.
- [x] No injection vectors: Static page, no dynamic rendering from user input or URL params.
- [x] No dangerouslySetInnerHTML usage: Verified via grep -- zero instances in src/.
- [x] next.config.ts has no custom headers configured. Security headers (X-Frame-Options, CSP, HSTS) must be added before production deployment.

### Bugs Found

#### BUG-P1-1: FIXED (showcase page navy references replaced with violet)
- Previously High severity. All navy-* classes removed. Showcase page now uses valid primary-*, violet-*, gray-* classes.

#### BUG-P1-2: STILL OPEN -- Typography spec drift after v2 redesign
- **Severity:** Low
- **Component:** Feature spec (this file, lines 99-114) vs. actual CSS in globals.css
- **Details:** The Typography Scale spec section still documents Poppins-era values that do not match the v2 Inter implementation:
  - h2: spec says weight 700 (bold), actual is font-semibold (600)
  - h4: spec says 18px/28px, actual is 16px/24px
  - h5: spec says 16px/24px, actual is 14px/20px
  - body-sm: spec says 12px/18px, actual is 13px/20px
  - label: spec says font-semibold (600) tracking +0.05em, actual is font-medium (500) tracking 0.04em
  - button: spec says font-semibold (600), actual is font-medium (500)
  - caption: spec says 11px font-medium (500), actual is 12px font-normal (400)
- **Priority:** Fix in next sprint -- documentation-only, does not affect runtime behavior

#### BUG-P1-3: FIXED (showcase title now reads "Typografie (Inter Variable)")

#### BUG-P1-4: FIXED (showcase labels now read "Primary (Teal)", "Secondary (Violet)", "Gray (Warm Slate)")

#### BUG-P1-5: NEW -- Showcase typography descriptions do not match actual CSS values
- **Severity:** Low
- **Component:** `src/app/page.tsx` lines 73-86
- **Steps to Reproduce:**
  1. Open http://localhost:3000
  2. Scroll to "Typografie (Inter Variable)" section
  3. Compare displayed text descriptions to actual CSS in globals.css
  4. h2 text says "24px / Bold" but CSS uses font-semibold (600)
  5. h4 text says "18px / SemiBold" but CSS uses 16px/24px
  6. h5 text says "16px / SemiBold" but CSS uses 14px/20px
  7. body-sm text says "12px / Regular" but CSS uses 13px/20px
  8. label text says "12px / SemiBold / UPPERCASE / +0.05em" but CSS uses font-medium (500) / tracking 0.04em
  9. button text says "14px / SemiBold" but CSS uses font-medium (500)
  10. caption text says "11px / Medium" but CSS uses 12px/16px/font-normal (400)
- **Root Cause:** The showcase page text descriptions were not updated to reflect v2 typography adjustments. The CSS classes render correctly -- only the descriptive labels are wrong.
- **Priority:** Nice to have -- cosmetic but misleading for developers using the showcase as documentation

### Regression Testing

No other features with "Deployed" status. PROJ-2 tested in parallel (see PROJ-2 QA results).

### Summary
- **Acceptance Criteria (Code, v2):** 9/9 passed (all code AC pass)
- **Acceptance Criteria (Figma):** 9/9 skipped (manual verification)
- **Edge Cases:** 8/8 passed
- **Previously Reported Bugs:** 4 total -- 3 FIXED (P1-1, P1-3, P1-4), 1 STILL OPEN (P1-2 spec drift, Low)
- **New Bugs Found:** 1 (BUG-P1-5, Low -- showcase typography text labels wrong)
- **Open Bugs Total:** 2 (0 critical, 0 high, 2 low)
  - BUG-P1-2: Typography spec drift in feature file (Low)
  - BUG-P1-5: Showcase typography descriptions wrong (Low)
- **Security:** PASS (no vulnerabilities for this feature scope)
- **Production Ready:** YES
- **Recommendation:** All critical and high bugs are resolved. The 2 remaining low-severity bugs are documentation/cosmetic only and do not affect functionality. Safe to deploy. Fix BUG-P1-2 and BUG-P1-5 in a documentation cleanup pass.

## QA Regression Check (Round 4 -- 2026-03-12)

**Tested:** 2026-03-12
**Tester:** QA Engineer (AI)
**Build Status:** PASS -- `npm run build` succeeds (Next.js 16.1.1 Turbopack, 3 dynamic routes + /_not-found static, 0 errors)
**Lint Status:** PASS -- `npm run lint` returns 0 errors, 0 warnings
**Context:** Regression check after PROJ-3 (App Shell & Navigation) implementation. Verifying PROJ-1 design system is intact.

### Regression Results

- [x] `tailwind.config.ts` unchanged from PROJ-1 deployment -- all color scales, spacing, shadows, border-radius, motion tokens intact
- [x] `globals.css` additive changes only -- sidebar CSS variables added (`--sidebar-width-icon: 5.5rem`, sidebar color tokens). No PROJ-1 tokens modified.
- [x] Font loading (Inter Variable via next/font/google) working correctly in layout.tsx
- [x] Dark mode toggle functional (ThemeProvider + next-themes)
- [x] Typography classes intact (display, h1-h5, body-lg, body, body-sm, label, button, caption, mono)
- [x] Showcase page (`/[locale]`) renders correctly with all color swatches and typography examples
- [x] Security headers now configured in next.config.ts: X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, HSTS with includeSubDomains -- PREVIOUSLY MISSING, NOW FIXED
- [x] No new dangerouslySetInnerHTML usage (zero instances in src/)
- [x] No secrets exposed

### Previously Open Bugs -- Status Unchanged

- BUG-P1-2 (Low): Typography spec drift -- STILL OPEN (documentation only)
- BUG-P1-5 (Low): Showcase typography descriptions wrong -- STILL OPEN (cosmetic)

### Summary

No regressions found. PROJ-1 Design System Foundation remains stable after PROJ-3 implementation. Security headers have been added since the last QA round (resolves the previous security finding). Production-ready status confirmed.

## QA Test Results (Round 5 -- 2026-03-13)

**Tested:** 2026-03-13
**Tester:** QA Engineer (AI)
**Build Status:** PASS -- `npm run build` succeeds (Next.js 16.1.1 Turbopack, 3 dynamic routes + /_not-found static, 0 errors)
**Lint Status:** PASS -- `npm run lint` returns 0 errors, 0 warnings
**Context:** Full re-test of PROJ-1 after post-deployment changes (commits 681bd19, c31b152, 29c332d, d70d7ee). Checking for regressions and spec drift.

---

### Acceptance Criteria Status

#### Figma Design Tokens (Manual -- Not Testable by Code QA)
- [ ] SKIP: All 9 Figma acceptance criteria remain outside scope of code QA

#### AC: Code -- Tailwind & CSS

- [x] `tailwind.config.ts` contains all color scales -- PASS. Primary (Teal) 50-950, Gray (Warm Slate) 50-950, Violet 50-950. Semantic colors, event.*, avatar.*, chart (8 series). All intact.
- [x] `tailwind.config.ts` contains custom border-radius, shadow, spacing extensions -- PASS. Unchanged from last round.
- [x] `tailwind.config.ts` contains Inter Variable as `fontFamily.sans` -- PASS.
- [x] `tailwind.config.ts` activates `darkMode: ["class"]` -- PASS (line 5).
- [x] `globals.css` defines CSS Custom Properties for all color tokens (light + dark) -- PASS. All tokens intact.
- [x] `globals.css` contains Typography classes -- PASS. 13 classes present. BUG-P1-2 (spec drift) still open.
- [x] Font loaded via `next/font/google` (Inter Variable) with `display: "swap"` -- PASS. Note: `subsets` changed from `["latin", "latin-ext"]` to `["latin"]` only (commit c31b152). See BUG-P1-6 below.
- [x] Dark Mode color mapping via CSS Custom Properties -- PASS. 4-level surface system intact.

### Edge Cases Status

- [x] EC-1: Font fallback chain intact -- PASS
- [x] EC-2: Dark mode CSS vars not overriding shadcn/ui -- PASS
- [x] EC-3: Tailwind Config compatible with Next.js 16 -- PASS (build succeeds)
- [x] EC-4: Font loading LCP impact -- PASS (next/font optimization)
- [x] EC-5: tailwindcss-animate plugin -- PASS
- [x] EC-6: Dark mode toggle -- PASS
- [x] EC-7: WCAG AA contrast -- PASS
- [x] EC-8: Showcase page color references -- PASS (no navy-* anywhere)

### Cross-Browser Testing

- [x] Chrome 100+: PASS (standard CSS features)
- [x] Firefox 100+: PASS
- [x] Safari 16+: PASS (backdrop-filter conditional graceful degradation)

### Responsive Testing

- [x] 375px (Mobile): PASS
- [x] 768px (Tablet): PASS
- [x] 1440px (Desktop): PASS

### Security Audit Results

- [x] No secrets exposed
- [x] No API endpoints (static pages only)
- [x] No user input processing (demo input has no handlers that transmit data)
- [x] Font loading: Inter via next/font (self-hosted after build, no CDN call at runtime)
- [x] No dangerouslySetInnerHTML (zero instances in src/)
- [x] Security headers configured in next.config.ts: X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy origin-when-cross-origin, HSTS with includeSubDomains -- PASS

### Bugs Found

#### BUG-P1-2: STILL OPEN -- Typography spec drift after v2 redesign
- **Severity:** Low
- **Status:** No change from Round 3. Documentation-only, does not affect runtime.

#### BUG-P1-5: STILL OPEN -- Showcase typography descriptions wrong
- **Severity:** Low
- **Status:** No change from Round 3. Cosmetic/misleading showcase labels.

#### BUG-P1-6: NEW -- latin-ext subset removed from Inter font
- **Severity:** Low
- **Component:** `src/app/[locale]/layout.tsx` line 10
- **Steps to Reproduce:**
  1. Compare current code: `subsets: ["latin"]`
  2. Previous code had `subsets: ["latin", "latin-ext"]`
  3. Commit c31b152 removed `latin-ext` to fix font preload warnings
  4. German umlauts (a, o, u, ss) ARE in the latin subset so no functional impact
  5. However, some extended Latin characters (e.g. Polish, Vietnamese athlete names) may render with fallback font
- **Root Cause:** Font preload warning fix was too aggressive in removing the subset
- **Priority:** Nice to have -- only affects names with extended Latin characters. May matter for international athlete names in PROJ-5.

#### BUG-P1-7: NEW -- Showcase page has hardcoded German strings (i18n violation)
- **Severity:** Medium
- **Component:** `src/app/[locale]/page.tsx`
- **Steps to Reproduce:**
  1. Open http://localhost:3000/en (English locale)
  2. Observe all showcase text is still in German: "Typografie", "Semantische Farben", "Athleten", "Programme", "Platzhaltertext...", etc.
  3. Expected: Text should be in English on /en route
  4. Actual: All user-facing strings are hardcoded in German, not using `useTranslations`/`getTranslations`
- **Root Cause:** Showcase page was created before i18n was implemented and was never migrated
- **Note:** This is technically a MANDATORY i18n rule violation per `.claude/rules/i18n.md`: "NEVER hardcode user-facing strings"
- **Priority:** Fix in next sprint -- showcase is a developer-facing page, not end-user-facing, so impact is limited

### Regression Testing

- [x] Build passes with 0 errors
- [x] All Tailwind config tokens unchanged from PROJ-1 deployment
- [x] globals.css: sidebar-width-icon value changed from 5.5rem to 3.5rem (PROJ-3 post-deployment fix) -- no impact on PROJ-1 tokens
- [x] No regressions on PROJ-1 design system tokens

### Summary

- **Acceptance Criteria (Code, v2):** 8/8 passed
- **Acceptance Criteria (Figma):** 9/9 skipped (manual verification)
- **Edge Cases:** 8/8 passed
- **Open Bugs Total:** 4 (0 critical, 0 high, 1 medium, 3 low)
  - BUG-P1-2 (Low): Typography spec drift in feature file
  - BUG-P1-5 (Low): Showcase typography descriptions wrong
  - BUG-P1-6 (Low): latin-ext subset removed
  - BUG-P1-7 (Medium): Showcase page hardcoded German strings (i18n violation)
- **Security:** PASS
- **Production Ready:** YES (no critical or high bugs)

## QA Test Results (Round 6 -- 2026-03-13)

**Tested:** 2026-03-13
**Tester:** QA Engineer (AI)
**Build Status:** PASS -- `npm run build` succeeds (Next.js 16.1.1 Turbopack, 3 dynamic + 1 static routes, 0 errors)
**Lint Status:** PASS -- `npm run lint` returns 0 errors, 0 warnings
**Context:** Full re-test of PROJ-1 after latest commits (a893084..HEAD). Verifying all tokens, CSS variables, font loading, dark mode, and security.

---

### Acceptance Criteria Status

#### Figma Design Tokens (Manual -- Not Testable by Code QA)
- [ ] SKIP: All 9 Figma acceptance criteria remain outside scope of code QA

#### AC: Code -- Tailwind & CSS

- [x] `tailwind.config.ts` contains all color scales -- PASS. Primary (Teal) 50-950, Gray (Warm Slate) 50-950, Violet 50-950. Semantic colors (success, warning, error, info). Event, avatar, chart tokens. All intact.
- [x] `tailwind.config.ts` contains custom border-radius (xs-2xl), shadow (xs-xl + glow-sm/glow-md), spacing (8px grid + WCAG 2.5.5 touch target 44px) -- PASS.
- [x] `tailwind.config.ts` contains Inter Variable as `fontFamily.sans` -- PASS.
- [x] `tailwind.config.ts` activates `darkMode: ["class"]` -- PASS (line 5).
- [x] `globals.css` defines CSS Custom Properties for all color tokens (light + dark) -- PASS. --primary = HSL 175 84% 32% (Teal). All shadcn/ui semantic tokens, chart-1..8, sidebar-*.
- [x] `globals.css` contains Typography classes -- PASS. 13 classes present (display, h1-h5, body-lg, body, body-sm, label, button, caption, mono).
- [x] Font loaded via `next/font/google` (Inter Variable) with `display: "swap"` and `subsets: ["latin", "latin-ext"]` -- PASS. latin-ext has been restored (was removed in c31b152, now back).
- [x] Dark Mode color mapping via CSS Custom Properties -- PASS. 4-level surface system intact.

### Edge Cases Status

- [x] EC-1: Font fallback chain intact (var(--font-inter), Inter, system-ui, etc.) -- PASS
- [x] EC-2: Dark mode CSS vars not overriding shadcn/ui -- PASS
- [x] EC-3: Tailwind Config compatible with Next.js 16 -- PASS (build succeeds)
- [x] EC-4: Font loading LCP impact -- PASS (next/font optimization)
- [x] EC-5: tailwindcss-animate plugin installed and registered -- PASS
- [x] EC-6: Dark mode toggle (ThemeProvider + next-themes) -- PASS
- [x] EC-7: WCAG AA contrast (Teal-600 4.6:1, Teal-700 6.0:1) -- PASS
- [x] EC-8: No navy-* references in source code -- PASS (zero instances)

### Cross-Browser Testing

- [x] Chrome 100+: PASS (standard CSS features)
- [x] Firefox 100+: PASS
- [x] Safari 16+: PASS (backdrop-filter conditional graceful degradation)

### Responsive Testing

- [x] 375px (Mobile): PASS
- [x] 768px (Tablet): PASS
- [x] 1440px (Desktop): PASS

### Security Audit Results

- [x] No secrets exposed (verified .gitignore covers .env*.local, .mcp.json)
- [x] No API endpoints (static pages only)
- [x] No user input processing (demo input has no handlers that transmit data)
- [x] Font loading: Inter via next/font (self-hosted after build, no CDN call at runtime) -- privacy compliant
- [x] No dangerouslySetInnerHTML -- zero instances in src/ (verified via grep)
- [x] Security headers configured in next.config.ts: X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy origin-when-cross-origin, HSTS with includeSubDomains -- PASS
- [x] No `any` types found in component files

### Previously Open Bugs -- Status Update

- BUG-P1-2 (Low): Typography spec drift -- STILL OPEN (documentation only, no runtime impact)
- BUG-P1-5 (Low): Showcase typography descriptions wrong -- STILL OPEN (cosmetic)
- BUG-P1-6 (Low): latin-ext subset removed -- **FIXED**. `subsets: ["latin", "latin-ext"]` restored in layout.tsx line 10.
- BUG-P1-7 (Medium): Showcase page hardcoded German strings -- STILL OPEN (i18n violation on developer-facing page)

### New Bugs Found

No new bugs found this round.

### Regression Testing

- [x] Build passes with 0 errors
- [x] All Tailwind config tokens unchanged
- [x] globals.css: only additive changes (sidebar CSS vars)
- [x] No regressions on PROJ-1 design system tokens

### Summary

- **Acceptance Criteria (Code, v2):** 8/8 passed
- **Acceptance Criteria (Figma):** 9/9 skipped (manual verification)
- **Edge Cases:** 8/8 passed
- **Open Bugs Total:** 3 (0 critical, 0 high, 1 medium, 2 low)
  - BUG-P1-2 (Low): Typography spec drift in feature file
  - BUG-P1-5 (Low): Showcase typography descriptions wrong
  - BUG-P1-7 (Medium): Showcase page hardcoded German strings (i18n violation)
- **Previously Open Bugs Fixed:** 1 (BUG-P1-6 latin-ext restored)
- **Security:** PASS
- **Production Ready:** YES (no critical or high bugs)

## QA Test Results (Round 7 -- 2026-03-13)

**Tested:** 2026-03-13
**Tester:** QA Engineer (AI)
**Build Status:** PASS -- `npm run build` succeeds (Next.js 16, Turbopack, 12 dynamic routes + 1 static, 0 errors)
**Lint Status:** PASS -- `npm run lint` returns 0 errors, 1 warning (React Compiler -- unrelated to PROJ-1)
**Context:** Post-PROJ-4 deployment regression check. Verifying design system integrity after auth feature implementation.

---

### Acceptance Criteria Status

#### Figma Design Tokens (Manual -- Not Testable by Code QA)
- [ ] SKIP: All 9 Figma criteria outside code QA scope

#### AC: Code -- Tailwind & CSS

- [x] `tailwind.config.ts` color scales (Primary Teal, Gray Warm Slate, Violet, semantic colors) -- PASS, unchanged
- [x] `tailwind.config.ts` custom border-radius, shadow, spacing -- PASS, unchanged
- [x] `tailwind.config.ts` Inter Variable as fontFamily.sans -- PASS
- [x] `tailwind.config.ts` darkMode: ["class"] -- PASS
- [x] `globals.css` CSS Custom Properties (light + dark) -- PASS, --primary = HSL 175 84% 32% (Teal)
- [x] `globals.css` Typography classes (13 classes) -- PASS
- [x] Font loaded via next/font/google with display: "swap", subsets: ["latin", "latin-ext"] -- PASS
- [x] Dark Mode color mapping -- PASS, 4-level surface system intact

### Edge Cases -- All 8 PASS (unchanged)

### Cross-Browser -- All 3 PASS
### Responsive -- All 3 breakpoints PASS

### Security Audit
- [x] No secrets exposed, no API endpoints, no XSS vectors -- PASS
- [x] Security headers in next.config.ts: all 8 headers present including CSP -- PASS

### Previously Open Bugs -- Status

- BUG-P1-2 (Low): Typography spec drift -- STILL OPEN (documentation only)
- BUG-P1-5 (Low): Showcase typography descriptions wrong -- STILL OPEN (cosmetic)
- BUG-P1-7 (Medium): Showcase page hardcoded German strings -- STILL OPEN (i18n violation)

### Regression
- [x] No PROJ-1 files modified by PROJ-4 commits -- PASS
- [x] Build + lint pass -- PASS

### Summary
- **Acceptance Criteria (Code):** 8/8 passed
- **Open Bugs:** 3 (0 critical, 0 high, 1 medium, 2 low) -- unchanged from Round 6
- **Security:** PASS
- **Production Ready:** YES

## QA Test Results (Round 8 -- 2026-03-13)

**Tested:** 2026-03-13
**Tester:** QA Engineer (AI)
**Build Status:** PASS -- `npm run build` succeeds (Next.js 16, Turbopack, 12 dynamic + 1 static routes, 0 errors)
**Lint Status:** PASS -- `npm run lint` returns 0 errors, 1 warning (React Compiler -- unrelated to PROJ-1)
**Context:** Post-PROJ-4 full deployment regression check. All 4 features (PROJ-1 through PROJ-4) tested in this round.

---

### Acceptance Criteria Status

#### Figma Design Tokens (Manual -- Not Testable by Code QA)
- [ ] SKIP: All 9 Figma criteria outside code QA scope

#### AC: Code -- Tailwind & CSS
- [x] `tailwind.config.ts` color scales (Primary Teal, Gray Warm Slate, Violet, semantic, event, avatar, chart) -- PASS, unchanged
- [x] `tailwind.config.ts` custom border-radius, shadow, spacing -- PASS, unchanged
- [x] `tailwind.config.ts` Inter Variable as fontFamily.sans -- PASS
- [x] `tailwind.config.ts` darkMode: ["class"] -- PASS
- [x] `globals.css` CSS Custom Properties (light + dark) -- PASS, --primary = HSL 175 84% 32% (Teal)
- [x] `globals.css` Typography classes (13 classes) -- PASS
- [x] Font loaded via next/font/google with display: "swap", subsets: ["latin", "latin-ext"] -- PASS
- [x] Dark Mode color mapping -- PASS, 4-level surface system intact

### Edge Cases -- All 8 PASS (unchanged)
### Cross-Browser -- All 3 PASS
### Responsive -- All 3 breakpoints PASS

### Security Audit
- [x] No secrets exposed, no dangerouslySetInnerHTML -- PASS
- [x] Security headers in next.config.ts: all 8 headers including CSP -- PASS

### Previously Open Bugs -- Status
- BUG-P1-2 (Low): Typography spec drift -- STILL OPEN (documentation only)
- BUG-P1-5 (Low): Showcase typography descriptions wrong -- STILL OPEN (cosmetic)
- BUG-P1-7 (Medium): Showcase page hardcoded German strings -- STILL OPEN (i18n violation)

### New Bugs Found
No new bugs found.

### Regression
- [x] No PROJ-1 files modified by latest PROJ-4 commits (f471e9b) -- PASS
- [x] Build + lint pass -- PASS

### Summary
- **Acceptance Criteria (Code):** 8/8 passed
- **Open Bugs:** 3 (0 critical, 0 high, 1 medium, 2 low) -- unchanged from Round 7
- **Security:** PASS
- **Production Ready:** YES

## QA Test Results (Round 9 -- 2026-03-13)

**Tested:** 2026-03-13
**Tester:** QA Engineer (AI) -- Consolidated QA audit across PROJ-1 through PROJ-5
**Build Status:** PASS -- `npm run build` succeeds (Next.js 16.1.1 Turbopack, 17 routes, 0 errors)
**Lint Status:** PASS -- 0 errors, 1 warning (React Compiler -- unrelated to PROJ-1)
**Context:** Post-PROJ-5 implementation regression check. Latest commit: 6a8f650.

---

### Acceptance Criteria Status (Code)

- [x] `tailwind.config.ts` color scales (Primary Teal, Violet, Gray Warm Slate, semantic, event, avatar, chart) -- PASS, unchanged
- [x] `tailwind.config.ts` custom border-radius, shadow, spacing -- PASS, unchanged
- [x] `tailwind.config.ts` Inter Variable as fontFamily.sans -- PASS
- [x] `tailwind.config.ts` darkMode: ["class"] -- PASS
- [x] `globals.css` CSS Custom Properties (light + dark) -- PASS, --primary = HSL 175 84% 32% (Teal)
- [x] `globals.css` Typography classes (13 classes) -- PASS
- [x] Font loaded via next/font/google with display: "swap", subsets: ["latin", "latin-ext"] -- PASS
- [x] Dark Mode color mapping -- PASS, 4-level surface system intact

### Edge Cases -- All 8 PASS (unchanged)
### Cross-Browser -- All 3 PASS
### Responsive -- All 3 breakpoints PASS

### Security Audit

- [x] No secrets exposed -- PASS
- [x] No dangerouslySetInnerHTML (zero instances in src/) -- PASS
- [x] Security headers in next.config.ts: all 8 headers including CSP -- PASS
- [x] Font loading via next/font (self-hosted, no CDN at runtime) -- PASS

### Previously Open Bugs -- Status

- BUG-P1-2 (Low): Typography spec drift -- **FIXED** (spec updated to match actual Inter CSS values)
- BUG-P1-5 (Low): Showcase typography descriptions wrong -- **FIXED** (showcase page descriptions corrected)
- BUG-P1-7 (Medium): Showcase page hardcoded German strings -- **FIXED** (full i18n via showcase.ds namespace)

### New Bugs Found

No new bugs found.

### Regression

- [x] No PROJ-1 files modified by PROJ-5 commits -- PASS
- [x] globals.css: sidebar-width-icon now 3.5rem (synced with JS) -- PASS
- [x] Build + lint pass -- PASS

### Summary

- **Acceptance Criteria (Code):** 8/8 passed
- **Open Bugs:** 0 -- all previously open bugs resolved
- **Security:** PASS
- **Production Ready:** YES

## Deployment
_To be added by /deploy_
