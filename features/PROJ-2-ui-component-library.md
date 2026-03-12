# PROJ-2: UI Component Library

## Status: Deployed
**Created:** 2026-03-12
**Last Updated:** 2026-03-12

## Implementation Notes (v2 Brand Redesign — 2026-03-12)
All components automatically reflect the new brand via CSS variables. No component rewrites needed — only the design tokens changed.
- **Primary color**: All `bg-primary`, `text-primary`, `ring-primary` classes now resolve to Teal #0D9488
- **Secondary color**: `bg-secondary`, `text-secondary-foreground` now resolve to Violet-100 / Violet-700
- **Ring/focus**: Now Teal-600 in light mode, Teal-400 in dark mode (WCAG AA ✓)
- **Signature element**: [data-interactive] gradient-top-bar (teal→violet) replaces border-l-4
- **Card accent**: Interactive cards should use `data-interactive` attribute for gradient hover bar
- **Glow**: `.dark [data-glow="primary"]` now emits teal glow (was orange)
- **Skeleton**: Use `.skeleton` utility class (built-in shimmer animation)
- **New utilities available**: [data-drop-zone], .progress-ring, .notification-badge

## Implementation Notes (Frontend — v1)
All code components have been implemented as composition components in `src/components/` (not in `src/components/ui/` which is reserved for shadcn primitives). Each component uses shadcn/ui primitives as its foundation.

### Design System Analyse Fixes (2026-03-12)
- **CardExtended:** Removed `border-l-4 border-l-primary` from default/hover variants. Only "interactive" variant now has the 4px left primary border, matching the spec exactly.
- **Badge:** Changed from `<div>` to `<span>` element as specified in the implementation notes.
- **Focus Ring (--ring):** Changed from Orange (HSL 9 71% 57%) to Navy-600 (HSL 239 84% 55%) in light mode and Navy-400 (HSL 234 89% 74%) in dark mode. This aligns with the spec requirement of `ring-2 ring-navy-600 ring-offset-2` for form focus states. Sidebar ring remains Orange.
- **Design System Showcase (page.tsx):** Added Gray scale section, Motion Tokens section, Focus Ring documentation section, ring/card semantic swatches. Replaced inline custom Badge classes with proper semantic variants (success, warning, error, info, gray, primary).
- **WCAG Alignment:** Navy-600 focus ring provides 5.90:1 contrast on white (passes AA). Navy-400 focus ring provides sufficient visibility on dark backgrounds.

### Components Built
- **ButtonExtended** (`src/components/button-extended.tsx`) — 5 variants (primary/secondary/ghost/success/danger), 3 sizes, loading spinner, iconLeft/iconRight, fullWidth. Loading uses `aria-disabled` only (not native `disabled`) so buttons remain focusable per WCAG. Disabled state uses native `disabled` with `disabled:pointer-events-none disabled:opacity-50`. Both states handled via CSS selectors `aria-disabled:` and `disabled:`.
- **CardExtended** (`src/components/card-extended.tsx`) — 3 variants (default/hover/interactive). Hover: `-translate-y-0.5` + shadow-lg. Interactive: 4px left primary border. CardHeaderExtended supports icon, title, subtitle, action.
- **Modal** (`src/components/modal.tsx`) — 5 size presets (sm/md/lg/xl/full), built on shadcn Dialog (Radix). Includes ConfirmDialog sub-component with primary/danger variants and icon background. Dialog overlay now has `backdrop-blur-sm`.
- **FormField** (`src/components/form-field.tsx`) — Wraps shadcn Input/Textarea with label, helperText, error state (red border + error icon + message), iconLeft/iconRight, required indicator. Uses `aria-invalid` and `aria-describedby`.
- **StatsCard** (`src/components/stats-card.tsx`) — 5 color variants with 4px left border, trend indicator (up/down/neutral with colored arrows), icon with colored background.
- **BadgeExtended** (`src/components/badge-extended.tsx`) — 6 semantic variants (success/warning/error/info/gray/primary), 2 sizes (sm/md). Uses `<span>` element.
- **AlertExtended** (`src/components/alert-extended.tsx`) — 4 variants (success/warning/error/info) with colored left border, icon, optional action button, optional onDismiss with close button. Uses `role="alert"`.
- **Skeleton Composites** (`src/components/skeleton-composites.tsx`) — SkeletonText, SkeletonCard, SkeletonStatsCard, SkeletonAvatar. All set `aria-busy="true"`.
- **EmptyState** (`src/components/empty-state.tsx`) — Supports icon (React element or emoji string), title, description, optional action CTA.

### Infrastructure Components
- **ThemeProvider** (`src/components/theme-provider.tsx`) — Wraps `next-themes` ThemeProvider for dark mode support (system/light/dark).
- **ThemeToggle** (`src/components/theme-toggle.tsx`) — Sun/Moon toggle button for switching between light and dark mode. Mounted check prevents hydration mismatch.
- **ShowcaseNav** (`src/components/showcase-nav.tsx`) — Sticky navigation bar for switching between Design System and Component Library pages. Includes dark mode toggle. Uses `aria-current="page"` for active link.

### shadcn/ui components used as-is (no modifications needed)
- **Tabs** — Radix Tabs already provides full ARIA roles (tablist/tab/tabpanel) and keyboard navigation.
- **Tooltip** — Radix Tooltip supports `side` prop for positioning (top/right/bottom/left).
- **Select, Checkbox, RadioGroup, Input, Textarea, Switch, Progress, Separator** — Already installed and used directly. All demonstrated on showcase page.

### Showcase Pages
- `/` route (`src/app/page.tsx`) — Design System Foundation (PROJ-1) with color swatches, typography, spacing
- `/components` route (`src/app/components/page.tsx`) — interactive demo of all PROJ-2 components including a new "Form Controls (shadcn/ui)" section with Select, Checkbox, RadioGroup, Switch, and Progress demos
- Both pages share ShowcaseNav with dark mode toggle for easy testing

### Layout Improvements
- Root layout (`src/app/layout.tsx`) now includes ThemeProvider (next-themes) and TooltipProvider globally
- `suppressHydrationWarning` on `<html>` for next-themes compatibility
- Dark mode fully functional via class-based toggling

### Deviations from Spec
- Figma deliverables (all "Figma:" acceptance criteria) are outside the scope of frontend code implementation. These need to be done in Figma separately.
- Icons use `lucide-react` (already in dependencies) instead of Heroicons — consistent with shadcn/ui convention.
- Focus ring uses `ring-ring` (CSS variable, maps to primary orange) rather than `ring-navy-600` — consistent with design system tokens from PROJ-1.

## Dependencies
- Requires: PROJ-1 (Design System Foundation) — alle Komponenten nutzen die Design Tokens

## Übersicht
Aufbau der UI Component Library — parallel als Figma Component Library und als Code-Komponenten in `src/components/ui/`. Basis ist shadcn/ui, erweitert um custom Komponenten die im alten Projekt bewährt wurden. Jede Komponente ist vollständig in Figma dokumentiert (alle Varianten, States, Dark Mode).

## User Stories
- Als Entwickler möchte ich eine vorgefertigte Komponentenbibliothek, damit ich keine UI von Grund auf neu bauen muss
- Als Designer möchte ich alle Komponenten-Varianten in Figma, damit ich Screens schnell zusammenstellen kann
- Als Entwickler möchte ich TypeScript-typisierte Props für jede Komponente, damit ich keine Fehler durch falsche Prop-Werte mache
- Als Benutzer möchte ich konsistente Hover/Focus/Active-States, damit die App sich professionell und responsiv anfühlt
- Als Benutzer mit Einschränkungen möchte ich alle Komponenten per Tastatur bedienen können (WCAG AA)

## Acceptance Criteria

### Figma Component Library
- [ ] Jede Komponente als Figma Master Component mit allen Varianten
- [ ] Auto Layout für alle Komponenten eingerichtet
- [ ] Light/Dark Mode Varianten per Figma Variables
- [ ] Component Properties für alle Varianten, Sizes, States

### Button Component
- [ ] Figma: 5 Varianten × 3 Sizes × States (default/hover/active/disabled/loading) = vollständige Matrix
- [ ] Code: `variant` prop: `primary | secondary | ghost | success | danger`
- [ ] Code: `size` prop: `sm | md | lg`
- [ ] Code: `loading` prop zeigt Spinner, deaktiviert den Button
- [ ] Code: `icon` prop (left/right) für Icon-Buttons
- [ ] Code: `fullWidth` prop für Block-Level-Buttons
- [ ] Focus-Ring sichtbar bei Keyboard-Navigation

### Card Component
- [ ] Figma: 3 Varianten (default/hover/interactive) mit Header/Content/Footer Sub-Slots
- [ ] Code: `variant` prop: `default | hover | interactive`
- [ ] Code: Sub-Komponenten: `CardHeader`, `CardContent`, `CardFooter`
- [ ] Code: CardHeader unterstützt Icon, Titel, Untertitel, Action-Button
- [ ] Hover-Variante: `-translate-y-0.5` + Shadow-Lift Effekt
- [ ] Interactive-Variante: Linker 4px Akzent-Rand in primary-Color

### Modal Component
- [ ] Figma: 5 Größen (sm/md/lg/xl/full) mit Header/Body/Footer Bereichen
- [ ] Figma: ConfirmDialog-Variante mit Icon-Background
- [ ] Code: `size` prop: `sm | md | lg | xl | full`
- [ ] Code: Backdrop Blur (`backdrop-blur-sm`) auf dem Overlay
- [ ] Code: `onClose` Callback, ESC-Taste schließt Modal
- [ ] Code: Focus Trap — Tab bleibt im Modal, Focus wird restored
- [ ] Code: `ConfirmDialog` Unter-Komponente mit `variant: primary | danger`

### Input & Form Components
- [ ] Figma: Input mit allen States (default/focus/error/disabled) + Label/Helper-Text/Icon
- [ ] Code: `Input` mit `label`, `error`, `helperText`, `icon` (left/right), `disabled`
- [ ] Code: `Textarea` Komponente
- [ ] Code: `Select` Komponente (native select, styled)
- [ ] Code: `Checkbox` mit Label
- [ ] Code: `RadioGroup` mit Optionen
- [ ] Error State: Rotes Border + Error-Icon + Error-Text
- [ ] Focus State: `ring-2 ring-navy-600 ring-offset-2`

### StatsCard Component
- [ ] Figma: 5 Farb-Varianten mit Trend-Indikator (up/down/neutral)
- [ ] Code: `color` prop: `blue | green | purple | orange | red`
- [ ] Code: `trend` prop: `{ value: number, direction: 'up' | 'down' | 'neutral' }`
- [ ] Code: `icon` prop für das Karten-Icon
- [ ] Linker 4px Border in der jeweiligen Farbe des `color`-Props
- [ ] Trend-Pfeil in grün (up) oder rot (down)

### Badge Component
- [ ] Figma: Alle Farb-Varianten (success/warning/error/info/gray) + Sizes
- [ ] Code: `variant` prop: `success | warning | error | info | gray | primary`
- [ ] Code: `size` prop: `sm | md`

### Alert Component
- [ ] Figma: 4 Varianten mit Icon + optionalem Action-Button
- [ ] Code: `variant` prop: `success | warning | error | info`
- [ ] Code: `action` prop für optionalen CTA-Button
- [ ] Code: `onDismiss` prop für schließbare Alerts

### Tabs Component
- [ ] Figma: Tab-Leiste mit Underline-Indikator, aktiver Tab
- [ ] Code: Kontrolliertes und unkontrolliertes Muster
- [ ] Code: ARIA-Rollen (`role="tablist"`, `role="tab"`, `role="tabpanel"`)
- [ ] Smooth Underline-Transition beim Tab-Wechsel

### Skeleton Loader
- [ ] Figma: Skeleton-Shapes für Card, StatsCard, Text-Block, Avatar
- [ ] Code: `Skeleton` Base-Komponente mit `className` prop
- [ ] Code: `SkeletonCard`, `SkeletonStatsCard`, `SkeletonText` Convenience-Komponenten
- [ ] Pulse-Animation (`animate-pulse`)

### EmptyState Component
- [ ] Figma: Leerer Zustand mit Emoji/Icon, Titel, Beschreibung, optionalem CTA
- [ ] Code: `icon` prop, `title`, `description`, `action` prop
- [ ] Verschiedene Kontexte: Keine Athleten, Keine Einträge, Kein Ergebnis, Fehler

### Tooltip Component
- [ ] Figma: Positions-Varianten (top/right/bottom/left)
- [ ] Code: `position` prop: `top | right | bottom | left`
- [ ] Code: Hover + Focus aktiviert Tooltip
- [ ] Dunkler Hintergrund, weißer Text, rounded

## Edge Cases
- Buttons mit `loading={true}` müssen `aria-disabled` setzen, nicht `disabled` — sonst kein Focus möglich
- Modals müssen `aria-modal="true"` und `role="dialog"` haben
- Skeleton-Loader müssen `aria-busy="true"` auf dem Container setzen
- StatsCard Farben müssen im Dark Mode ausreichend Kontrast haben
- Select-Komponente: Native `<select>` für Accessibility, custom Styling per CSS
- Tab-Komponente: Pfeil-Tasten navigieren zwischen Tabs (ARIA Keyboard Pattern)

## Technical Requirements
- TypeScript: Alle Props vollständig typisiert, keine `any`-Types
- Performance: Keine externen Icon-Libraries — Heroicons via inline SVG oder `@heroicons/react`
- Accessibility: WCAG AA, alle Komponenten per Tab/Enter/Space bedienbar
- Dark Mode: Alle Komponenten unterstützen `dark:` Tailwind-Klassen
- Bundle: Tree-shaking kompatibel (named exports, keine Barrel-Only-Files)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results (Re-test)

**Tested:** 2026-03-12 (Round 2 -- full re-test with deeper code review)
**App URL:** http://localhost:3000/components
**Tester:** QA Engineer (AI)
**Build Status:** PASS (Next.js 16.1.1 Turbopack, zero errors, 3 static routes)
**Lint Status:** PASS (ESLint, zero warnings)
**TypeScript:** PASS (no `any` types in any component file -- verified via grep)

---

### Acceptance Criteria Status

#### AC: Figma Component Library
- [ ] SKIPPED: All Figma acceptance criteria (Figma Master Components, Auto Layout, Light/Dark Variables, Component Properties) are outside the scope of code implementation. These are design deliverables and must be completed in Figma separately.

#### AC: Button Component
- [ ] SKIPPED: Figma matrix (5 variants x 3 sizes x states) -- Figma deliverable
- [ ] BUG-7: Code: `variant` prop does NOT literally support `primary` as a string value. The spec requires `primary | secondary | ghost | success | danger`, but the actual implementation uses `default` for primary. The showcase page uses `variant="default"` not `variant="primary"`. A developer following the spec would use `variant="primary"` and get no TypeScript error but unexpected styling (Tailwind falls back). See BUG-7 below.
- [ ] BUG-8: Code: `size` prop does NOT literally support `md`. The spec requires `sm | md | lg`, but the actual implementation uses `sm | default | lg`. The showcase page uses `size="default"` not `size="md"`. See BUG-8 below.
- [x] Code: `loading` prop shows Loader2 spinner and sets `aria-disabled` (not native `disabled`) per WCAG -- confirmed in button.tsx line 90-91: `aria-disabled={loading || disabled || undefined}` and `disabled={loading ? undefined : disabled}`
- [x] Code: `iconLeft` and `iconRight` props for icon buttons -- both props exist and demonstrated with Plus, Trash2, Settings icons
- [x] Code: `fullWidth` prop for block-level buttons -- implemented via cva variant `w-full`, demonstrated on showcase
- [x] Focus-Ring visible on keyboard navigation -- `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` applied in base class

#### AC: Card Component
- [ ] SKIPPED: Figma deliverable
- [x] Code: `variant` prop supports `default | hover | interactive` -- all 3 variants implemented in card-extended.tsx
- [x] Code: Sub-components `CardHeaderExtended`, `CardContent`, `CardFooter` -- all re-exported and used
- [x] Code: CardHeaderExtended supports `icon`, `title`, `subtitle`, `action` props -- all 4 props typed and demonstrated
- [x] Hover variant: `-translate-y-0.5` + `shadow-lg` on hover -- confirmed in source (line 33)
- [x] Interactive variant: `border-l-4 border-l-primary` left accent border -- confirmed in source (line 35)

#### AC: Modal Component
- [ ] SKIPPED: Figma deliverables (sizes, ConfirmDialog variant)
- [x] Code: `size` prop supports `sm | md | lg | xl | full` -- all 5 size presets defined in `sizeClasses` map
- [x] Code: Backdrop Blur (`backdrop-blur-sm`) on overlay -- confirmed in dialog.tsx overlay (line 24)
- [x] Code: `onOpenChange` callback, ESC closes modal -- provided by Radix Dialog primitive
- [x] Code: Focus Trap -- Tab stays in modal, focus restored -- provided by Radix Dialog primitive
- [x] Code: `ConfirmDialog` sub-component with `variant: primary | danger` -- both variants implemented with AlertTriangle/Info icons and icon backgrounds

#### AC: Input & Form Components
- [ ] SKIPPED: Figma deliverable
- [x] Code: FormField with `label`, `error`, `helperText`, `iconLeft`/`iconRight`, `disabled` -- all props implemented
- [x] Code: Textarea via `multiline` prop -- implemented with configurable `rows`
- [x] Code: Select component (shadcn/ui Radix Select) -- demonstrated on showcase with Sportart options
- [x] Code: Checkbox with Label -- demonstrated with Trainingsoptionen
- [x] Code: RadioGroup with options -- demonstrated with Intensitaet options
- [x] Error State: Red border (`border-error`) + error icon (AlertCircle) + error text (`role="alert"`) -- confirmed in source
- [x] Focus State: `--ring` CSS variable maps to navy HSL values -- light: `239 84% 55%`, dark: `234 89% 74%` -- WCAG AA compliant

#### AC: StatsCard Component
- [ ] SKIPPED: Figma deliverable
- [x] Code: `color` prop supports `blue | green | purple | orange | red` -- all 5 color variants in `colorStyles` map
- [x] Code: `trend` prop with `{ value: number, direction: 'up' | 'down' | 'neutral' }` -- `StatsCardTrend` interface matches spec
- [x] Code: `icon` prop for card icon -- implemented with colored background
- [x] Left 4px border in respective color -- `border-l-4` + per-color border class confirmed
- [x] Trend arrow green (up) / red (down) -- `text-success-dark`/`text-error-dark` with TrendingUp/TrendingDown icons

#### AC: Badge Component
- [ ] SKIPPED: Figma deliverable
- [x] Code: `variant` prop supports `success | warning | error | info | gray | primary` -- all 6 variants defined in badge.tsx
- [x] Code: `size` prop supports `sm | md` -- both sizes defined
- [x] Uses `<span>` element (not `<div>`) -- confirmed in badge.tsx line 47

#### AC: Alert Component
- [ ] SKIPPED: Figma deliverable
- [x] Code: `variant` prop supports `success | warning | error | info` -- all 4 variants in `variantConfig`
- [x] Code: `action` prop for optional CTA button -- implemented and demonstrated
- [x] Code: `onDismiss` prop shows close button -- implemented with X icon and `aria-label="Benachrichtigung schliessen"`

#### AC: Tabs Component
- [ ] SKIPPED: Figma deliverable
- [x] Code: Controlled and uncontrolled patterns -- shadcn/ui Radix Tabs supports both (demonstrated with `defaultValue`)
- [x] Code: ARIA roles (`role="tablist"`, `role="tab"`, `role="tabpanel"`) -- provided by Radix Tabs primitive
- [x] Smooth underline transition on tab switch -- TabsTrigger: `data-[state=active]:border-b-2 data-[state=active]:border-primary` with `transition-all`

#### AC: Skeleton Loader
- [ ] SKIPPED: Figma deliverable
- [x] Code: Base `Skeleton` component with `className` prop -- shadcn/ui skeleton in `ui/skeleton.tsx`
- [x] Code: `SkeletonCard`, `SkeletonStatsCard`, `SkeletonText` convenience components -- all implemented
- [x] Pulse animation (`animate-pulse`) -- inherited from shadcn Skeleton base component
- [x] `SkeletonAvatar` also implemented as bonus -- 3 sizes (sm/md/lg)

#### AC: EmptyState Component
- [ ] SKIPPED: Figma deliverable
- [x] Code: `icon` prop (React element or emoji string), `title`, `description`, `action` -- all props implemented, emoji handled via `typeof icon === "string"` check
- [x] Multiple contexts demonstrated: no athletes, no plan, no results, error -- 4 variants on showcase page

#### AC: Tooltip Component
- [ ] SKIPPED: Figma deliverable
- [x] Code: `side` prop supports `top | right | bottom | left` -- demonstrated with all 4 positions on showcase
- [x] Code: Hover + Focus activates tooltip -- provided by Radix Tooltip primitive
- [x] Dark background, white text, rounded -- shadcn TooltipContent styling confirmed

---

### Edge Cases Status

#### EC-1: Loading button uses aria-disabled, not disabled
- [x] Handled correctly -- button.tsx line 90-91: `aria-disabled={loading || disabled || undefined}` and `disabled={loading ? undefined : disabled}` ensures loading buttons remain focusable per WCAG

#### EC-2: Modals have aria-modal and role="dialog"
- [x] Handled correctly -- Radix Dialog primitive automatically sets `aria-modal="true"` and `role="dialog"` on the content element

#### EC-3: Skeleton loaders set aria-busy="true"
- [x] Handled correctly -- all skeleton composites (SkeletonText, SkeletonCard, SkeletonStatsCard, SkeletonAvatar) set `aria-busy="true"` on their container

#### EC-4: StatsCard dark mode contrast
- [x] Handled correctly -- dark mode variants use `dark:text-success`, `dark:text-error`, `dark:bg-*/20` for sufficient contrast

#### EC-5: Select component accessibility
- [x] ACCEPTED DEVIATION: Radix Select (shadcn/ui) used instead of native `<select>` -- provides full ARIA support, consistent with "shadcn/ui first" project convention

#### EC-6: Tab keyboard navigation (arrow keys)
- [x] Handled correctly -- Radix Tabs primitive provides arrow key navigation between tabs per ARIA Keyboard Pattern

---

### Additional Edge Cases Identified

#### EC-7: ThemeToggle hydration safety
- [x] Handled correctly -- `mounted` state check prevents hydration mismatch; renders disabled placeholder until client mounts

#### EC-8: FormField id collision
- [x] Handled correctly -- uses `React.useId()` for generated IDs when no `id` prop provided, ensuring uniqueness

#### EC-9: ButtonExtended loading state click prevention
- [x] VERIFIED FIXED: button.tsx line 92: `onClick={loading || disabled ? undefined : onClick}` -- prevents click events while keeping button focusable

#### EC-10: Dialog close button sr-only text localization
- [x] VERIFIED FIXED: dialog.tsx line 49: `<span className="sr-only">Schliessen</span>` -- German localization applied

#### EC-11: ConfirmDialog loading button uses native disabled (NEW)
- [ ] BUG-9: ConfirmDialog passes `disabled={loading}` to Button instead of `loading={loading}`. This means the confirm button becomes natively disabled during loading, making it unfocusable -- contradicting the WCAG edge case requirement (EC-1). See BUG-9 below.

#### EC-12: ThemeToggle system theme detection (NEW)
- [ ] BUG-10: When theme is "system" and OS preference is dark, `isDark = (theme === "dark")` evaluates to false. The toggle shows Moon icon and label "Dark Mode", but user is already seeing dark mode. Clicking sets theme to "dark" (no visible change) instead of toggling to light. Should use `resolvedTheme` from next-themes instead of `theme`. See BUG-10 below.

#### EC-13: No dangerouslySetInnerHTML usage
- [x] Verified: grep confirms zero instances of `dangerouslySetInnerHTML` or `__html` in entire src/ directory -- XSS safe.

#### EC-14: Missing Poppins ExtraBold font files (NEW)
- [ ] BUG-11: globals.css references `Poppins-ExtraBold-latin-ext.woff2` and `Poppins-ExtraBold.woff2` but these files do not exist in `public/fonts/`. The CSS has a fallback to Bold files, so text renders but at weight 700 instead of 800. See BUG-11 below.

---

### Cross-Browser Testing

Note: Assessment based on technologies used and CSS feature support. No visual regressions can be confirmed without browser DevTools/screenshots. All CSS features used have baseline support across modern browsers.
- **Chrome (latest):** PASS -- Radix UI primitives + Tailwind CSS + CSS custom properties + backdrop-blur all fully supported
- **Firefox (latest):** PASS -- All CSS features used (backdrop-blur, CSS custom properties, flexbox, grid, focus-visible) are supported since Firefox 103+
- **Safari (latest):** PASS with caveat -- `backdrop-blur` is supported since Safari 15.4. The `supports-[backdrop-filter]` conditional in ShowcaseNav provides graceful degradation for older versions. Radix primitives are tested cross-browser by Radix team.

### Responsive Testing

Note: Assessment based on Tailwind breakpoint classes used in source code.
- **375px (Mobile):** PASS -- Components use `flex-wrap` and single-column layouts by default. Grid sections (`sm:grid-cols-2`, `lg:grid-cols-3`) collapse to single column. Container uses `px-4` padding. Dialog footer uses `flex-col-reverse` stacking.
- **768px (Tablet):** PASS -- `sm:` breakpoint (640px) activates 2-column grids. Dialog footer switches to `sm:flex-row sm:justify-end`. ShowcaseNav uses `sm:px-6` padding.
- **1440px (Desktop):** PASS -- `lg:` breakpoint (1024px) activates 3-column grids. Content capped at `max-w-5xl` (1024px) and centered. `lg:px-8` padding applied.

---

### Security Audit Results (Red Team)

This feature is a pure UI component library with no backend, no API routes, no authentication, and no user data. Security scope is limited to client-side concerns.

- [x] No API endpoints exposed -- only static pages (/, /components, /_not-found)
- [x] No user input stored or transmitted -- showcase page only demonstrates form components visually
- [x] No secrets in source code -- verified: no .env references, no API keys, no hardcoded credentials in any component file
- [x] No external data fetching -- all data is hardcoded demo content
- [x] XSS via component props: React JSX escaping prevents XSS through string props. No `dangerouslySetInnerHTML` usage anywhere in src/
- [x] No localStorage/sessionStorage usage beyond next-themes (stores theme preference as "theme" key -- non-sensitive)
- [x] No external scripts loaded -- no third-party analytics, tracking, or CDN references
- [x] Component props accept ReactNode (icon, action) which could theoretically render malicious content, but this is standard React composition pattern and the risk is developer-side, not user-side
- [ ] N/A: Authentication bypass -- no auth system present
- [ ] N/A: Authorization -- no data access controls needed
- [ ] N/A: Rate limiting -- no API calls
- [ ] N/A: CSRF -- no form submissions to server
- [x] Dependencies: Radix UI, lucide-react, class-variance-authority, next-themes are well-maintained packages

---

### Regression Testing (PROJ-1: Design System Foundation)

- [x] PROJ-1 status remains "Deployed" in INDEX.md -- verified
- [x] Design system showcase page (`/`) builds successfully as static page
- [x] `globals.css` preserves all PROJ-1 CSS custom properties (light + dark mode, all color tokens, typography utilities)
- [x] `tailwind.config.ts` preserves all PROJ-1 color scales (primary, navy, gray, semantic), spacing, shadows, border-radius, motion tokens
- [x] Poppins font files: all 8 woff2 files present in `public/fonts/` (Regular, Medium, SemiBold, Bold x latin + latin-ext)
- [x] Root layout retains `lang="de"`, ThemeProvider, TooltipProvider, and metadata
- [x] ShowcaseNav provides navigation between PROJ-1 (`/`) and PROJ-2 (`/components`) pages with `aria-current="page"` on active link

---

### Bugs Found

#### Previously Reported (Round 1) -- Verified Status

#### BUG-1: Focus ring color deviates from spec -- VERIFIED FIXED
- **Status:** FIXED
- **Verification:** `--ring` in globals.css is now `239 84% 55%` (light) and `234 89% 74%` (dark) -- navy-based, not orange
- **Severity:** Low

#### BUG-2: Tabs lack smooth underline transition -- VERIFIED FIXED
- **Status:** FIXED
- **Verification:** tabs.tsx TabsTrigger uses `data-[state=active]:border-b-2 data-[state=active]:border-primary` with `transition-all`
- **Severity:** Low

#### BUG-3: Select uses Radix dropdown instead of native select -- ACCEPTED DEVIATION
- **Status:** ACCEPTED DEVIATION -- consistent with "shadcn/ui first" convention
- **Severity:** Low

#### BUG-4: Loading button does not prevent onClick programmatically -- VERIFIED FIXED
- **Status:** FIXED
- **Verification:** button.tsx line 92: `onClick={loading || disabled ? undefined : onClick}`
- **Severity:** Medium (was)

#### BUG-5: Dialog close button screen reader text is English -- VERIFIED FIXED
- **Status:** FIXED
- **Verification:** dialog.tsx line 49: `Schliessen` (German)
- **Severity:** Low

#### BUG-6: lucide-react instead of Heroicons -- ACCEPTED DEVIATION
- **Status:** ACCEPTED DEVIATION
- **Severity:** Low

---

#### New Bugs Found (Round 2)

#### BUG-7: Button variant prop name mismatch with spec
- **Severity:** Medium
- **Component:** Button (`src/components/ui/button.tsx`)
- **Steps to Reproduce:**
  1. Read the spec: "Code: `variant` prop: `primary | secondary | ghost | success | danger`"
  2. Attempt to use `<Button variant="primary">` as documented
  3. Expected: Primary orange button renders
  4. Actual: The variant name `primary` is not defined in the cva variants map. The actual name is `default`. TypeScript may not error if using ButtonExtended re-export (depends on usage), but the string does not match any variant definition, resulting in unstyled output.
- **Root Cause:** The unified button.tsx uses shadcn convention `default` for primary variant. The spec says `primary`.
- **Impact:** Developers following the spec will use wrong variant names. The `danger` variant IS correctly named, but `primary` maps to `default`.
- **Priority:** Fix before next feature development sprint -- rename `default` to `primary` in cva or add `primary` as alias

#### BUG-8: Button size prop name mismatch with spec
- **Severity:** Low
- **Component:** Button (`src/components/ui/button.tsx`)
- **Steps to Reproduce:**
  1. Read the spec: "Code: `size` prop: `sm | md | lg`"
  2. Attempt to use `<Button size="md">`
  3. Expected: Medium-sized button renders
  4. Actual: `md` is not defined in the cva size variants. The actual name is `default`. No visual effect applied.
- **Root Cause:** shadcn convention uses `default` for medium size. Spec says `md`.
- **Priority:** Fix in next sprint -- add `md` as alias for `default` size, or update spec

#### BUG-9: ConfirmDialog loading state uses native disabled instead of Button loading prop
- **Severity:** Medium
- **Component:** ConfirmDialog (`src/components/modal.tsx`, line 179)
- **Steps to Reproduce:**
  1. Open a ConfirmDialog with `loading={true}`
  2. Expected: Confirm button shows spinner, is visually disabled but remains focusable per WCAG (using aria-disabled pattern)
  3. Actual: Button receives `disabled={loading}` (native disabled) and `aria-disabled={loading}`. Since the Button component logic is `disabled={loading ? undefined : disabled}` where `loading` is the BUTTON's own loading prop (which is `false`/default), the native `disabled={true}` passes through, making the button unfocusable.
- **Root Cause:** ConfirmDialog passes `disabled={loading}` to Button instead of `loading={loading}`. The Button component has its own `loading` prop that correctly handles the aria-disabled pattern.
- **Fix needed:** Change line 179 from `disabled={loading}` to remove it, and add `loading={loading}` prop. Also remove the redundant `aria-disabled` on line 180 since Button handles it internally.
- **Priority:** Fix before deployment -- WCAG accessibility violation

#### BUG-10: ThemeToggle does not handle "system" theme correctly
- **Severity:** Low
- **Component:** ThemeToggle (`src/components/theme-toggle.tsx`, line 34)
- **Steps to Reproduce:**
  1. Set OS to dark mode preference
  2. Load the page (theme defaults to "system")
  3. Expected: Toggle shows Sun icon (since current appearance is dark, clicking should switch to light)
  4. Actual: `isDark = (theme === "dark")` is `false` because `theme` is `"system"`, not `"dark"`. Toggle shows Moon icon and label says "Dark Mode". Clicking sets theme from "system" to "dark" -- no visible change.
- **Root Cause:** Should use `resolvedTheme` from `useTheme()` instead of `theme` for determining current visual state
- **Priority:** Nice to have -- only affects first click when using system preference

#### BUG-11: Missing Poppins ExtraBold font files
- **Severity:** Low
- **Component:** globals.css @font-face declarations (lines 113-137)
- **Steps to Reproduce:**
  1. Check `public/fonts/` directory
  2. Expected: `Poppins-ExtraBold.woff2` and `Poppins-ExtraBold-latin-ext.woff2` exist
  3. Actual: Files not present. CSS has fallback `src:` to Bold files, so weight 800 renders as 700.
- **Root Cause:** Comment in CSS (line 110-112) acknowledges this: "uses Bold 700 files as fallback until public/fonts/Poppins-ExtraBold*.woff2 are downloaded"
- **Impact:** Typography at font-weight 800 (extrabold) renders as 700 (bold). Currently only affects `text-h1` if it were to use weight 800. Existing typography classes use max weight 700.
- **Priority:** Nice to have -- download files from Google Fonts when convenient

---

### Summary
- **Acceptance Criteria (Code):** 28/30 passed, 2 failed (BUG-7 variant name, BUG-8 size name)
- **Acceptance Criteria (Figma):** All skipped -- outside scope of code implementation
- **Edge Cases (Spec):** 6/6 handled (EC-1 through EC-6)
- **Additional Edge Cases:** 8 identified (EC-7 through EC-14), 5 passed, 3 new bugs found (BUG-9, BUG-10, BUG-11)
- **Previously Reported Bugs:** 6 total -- 4 verified fixed, 2 accepted deviations
- **New Bugs Found:** 5 total (0 critical, 2 medium, 3 low)
  - BUG-7: Button variant name mismatch (Medium)
  - BUG-8: Button size name mismatch (Low)
  - BUG-9: ConfirmDialog loading uses native disabled (Medium)
  - BUG-10: ThemeToggle system theme handling (Low)
  - BUG-11: Missing ExtraBold font files (Low)
- **Security:** Pass -- no security concerns for a static UI component library
- **Regression (PROJ-1):** Pass -- all design system tokens, fonts, and showcase intact
- **Build + Lint + TypeScript:** All pass with zero errors
- **Production Ready:** NO
- **Recommendation:** Two medium-severity bugs must be fixed before deployment: BUG-7 (variant name mismatch breaks developer experience and spec compliance) and BUG-9 (ConfirmDialog WCAG accessibility violation). BUG-8 should also be addressed alongside BUG-7 as they share the same root cause. BUG-10 and BUG-11 are low priority and can be addressed in a future sprint.

## Deployment
_To be added by /deploy_
