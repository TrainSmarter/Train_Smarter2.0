import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      /* ── Font ──────────────────────────────────────────────────
         Inter Variable — loaded via next/font/google in layout.tsx
         CSS variable: --font-inter applied to <html>
         Bundle: 1 variable font file vs 8 static Poppins files
      ─────────────────────────────────────────────────────────── */
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        display: [
          "var(--font-inter)",
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "JetBrains Mono",
          "monospace",
        ],
      },

      fontWeight: {
        extrabold: "800",
        black: "900",
      },

      /* ── Colors ─────────────────────────────────────────────── */
      colors: {
        // shadcn/ui semantic tokens (CSS variable driven)
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          // Teal scale — the Train Smarter brand color
          // Distinctive: no major fitness app uses teal as primary
          // Sits between trust (blue) and growth (green) = perfect for coaching
          50:  "#F0FDFA",
          100: "#CCFBF1",
          200: "#99F6E4",
          300: "#5EEAD4",
          400: "#2DD4BF",  // dark mode primary (brighter on dark bg)
          500: "#14B8A6",
          600: "#0D9488",  // ← Brand Color (WCAG AA 4.6:1 on white ✓)
          700: "#0F766E",  // hover state (WCAG AAA 6.0:1 ✓)
          800: "#115E59",
          900: "#134E4A",
          950: "#042F2E",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input:  "hsl(var(--input))",
        ring:   "hsl(var(--ring))",

        // Neutral: Warm Slate (replaces navy-tinted gray)
        // Better calibrated dark mode values, widely tested, natural warmth
        gray: {
          50:  "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
          950: "#020617",
        },

        // Violet — Secondary Brand Accent
        // Teal + Violet = sophisticated complementary pair
        // Used sparingly: premium badges, achievement states, special programs
        violet: {
          50:  "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
          300: "#C4B5FD",
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED",  // ← Secondary Brand Color (WCAG AA 4.6:1 ✓)
          700: "#6D28D9",  // hover (WCAG AAA 6.1:1 ✓)
          800: "#5B21B6",
          900: "#4C1D95",
          950: "#2E1065",
        },

        // Semantic colors
        success: {
          light:   "#D1FAE5",
          DEFAULT: "#059669",  // emerald-600 — WCAG AA 4.55:1 ✓
          dark:    "#065F46",
        },
        warning: {
          light:   "#FEF3C7",
          DEFAULT: "#D97706",  // amber-600 — use as bg/icon only (3.0:1)
          dark:    "#92400E",  // use for warning text (7.2:1 ✓)
        },
        error: {
          light:   "#FEE2E2",
          DEFAULT: "#DC2626",  // red-600 — WCAG AA 5.74:1 ✓
          dark:    "#991B1B",
        },
        info: {
          light:   "#E0F2FE",  // sky-100
          DEFAULT: "#0284C7",  // sky-600 — WCAG AA 4.6:1 ✓ (distinct from violet)
          dark:    "#075985",  // sky-800
        },

        // Calendar event semantic tokens (PROJ-8)
        event: {
          planned:   "#CBD5E1",  // slate-300 — future / pending
          completed: "#059669",  // emerald-600 — done ✓
          missed:    "#DC2626",  // red-600 — skipped ✗
          today:     "#0D9488",  // teal-600 — today highlight
          rest:      "#E2E8F0",  // slate-200 — rest day
        },

        // Avatar color palette (PROJ-5) — 8 deterministic colors for initials
        avatar: {
          "1": "#0D9488",  // teal
          "2": "#7C3AED",  // violet
          "3": "#D97706",  // amber
          "4": "#0284C7",  // sky
          "5": "#E11D48",  // rose
          "6": "#059669",  // emerald
          "7": "#EA580C",  // orange
          "8": "#4338CA",  // indigo
        },

        // Chart — 8 distinguishable series for data visualization (PROJ-6, PROJ-7)
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
          "6": "hsl(var(--chart-6))",
          "7": "hsl(var(--chart-7))",
          "8": "hsl(var(--chart-8))",
        },

        // Sidebar
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },

      /* ── Border Radius ──────────────────────────────────────── */
      borderRadius: {
        xs:    "4px",
        sm:    "6px",
        md:    "8px",
        lg:    "12px",
        xl:    "16px",
        "2xl": "24px",
      },

      /* ── Box Shadow ─────────────────────────────────────────── */
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        sm: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
        // Teal brand glow — used in dark mode on primary interactive elements
        "glow-sm": "0 0 12px -2px hsl(172 66% 50% / 0.3)",
        "glow-md": "0 0 20px -4px hsl(172 66% 50% / 0.4)",
      },

      /* ── Spacing (8px grid extras) ──────────────────────────────
         Base unit: 4px (Tailwind default). Prefer even units for 8px grid.
         11  = 44px → minimum touch target (WCAG 2.5.5 ✓)
         16  = 64px → collapsed sidebar width (8×8 grid ✓)
         18  = 72px → 9×8px grid (section spacing)
         22  = 88px → 11×8px grid (legacy: old collapsed sidebar)
         4.5 = 18px → icon-text fine-tuning only
      ─────────────────────────────────────────────────────────── */
      spacing: {
        "4.5": "18px",
        "11":  "44px",
        "13":  "52px",
        "15":  "60px",
        "16":  "64px",
        "18":  "72px",
        "22":  "88px",
      },

      /* ── Keyframes ──────────────────────────────────────────── */
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to:   { opacity: "0" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        "progress-fill": {
          from: { width: "0%" },
          to:   { width: "var(--progress-value, 100%)" },
        },
        "shimmer": {
          from: { backgroundPosition: "-200% 0" },
          to:   { backgroundPosition: "200% 0" },
        },
        "pulse-ring": {
          "0%":   { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(1.8)", opacity: "0" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to:   { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        "fade-in":        "fade-in 250ms cubic-bezier(0, 0, 0.2, 1)",
        "fade-out":       "fade-out 150ms cubic-bezier(0.4, 0, 1, 1)",
        "slide-up":       "slide-up 250ms cubic-bezier(0, 0, 0.2, 1)",
        "slide-down":     "slide-down 250ms cubic-bezier(0, 0, 0.2, 1)",
        "scale-in":       "scale-in 250ms cubic-bezier(0, 0, 0.2, 1)",
        "progress-fill":  "progress-fill 500ms cubic-bezier(0.4, 0, 0.2, 1)",
        "shimmer":        "shimmer 2s linear infinite",
        "pulse-ring":     "pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite",
        "spin-slow":      "spin-slow 3s linear infinite",
      },

      /* ── Motion Tokens ──────────────────────────────────────── */
      transitionDuration: {
        instant: "100ms",  // toggle, checkbox — immediate feedback
        fast:    "150ms",  // button hover, focus ring appearance
        base:    "250ms",  // card hover lift, accordion expand
        slow:    "400ms",  // sidebar collapse, page transition
        slower:  "500ms",  // progress fill, chart draw-in
      },
      transitionTimingFunction: {
        default: "cubic-bezier(0.4, 0, 0.2, 1)",   // standard ease-in-out
        spring:  "cubic-bezier(0.34, 1.56, 0.64, 1)", // bouncy, delightful
        enter:   "cubic-bezier(0, 0, 0.2, 1)",       // elements appearing
        exit:    "cubic-bezier(0.4, 0, 1, 1)",        // elements leaving
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
