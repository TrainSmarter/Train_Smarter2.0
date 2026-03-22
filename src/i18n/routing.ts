import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["de", "en"],
  defaultLocale: "de",
  pathnames: {
    // Identical paths (same in both locales)
    "/": "/",
    "/login": "/login",
    "/register": "/register",
    "/forgot-password": "/forgot-password",
    "/reset-password": "/reset-password",
    "/verify-email": "/verify-email",
    "/dashboard": "/dashboard",
    "/training/exercises": "/training/exercises",
    "/training/exercises/new": "/training/exercises/new",
    "/training/exercises/[id]": "/training/exercises/[id]",
    "/feedback": "/feedback",
    "/feedback/[athleteId]": "/feedback/[athleteId]",
    "/account": { de: "/konto", en: "/account" },
    "/onboarding": "/onboarding",
    "/organisation": "/organisation",
    "/organisation/athletes": "/organisation/athletes",
    "/organisation/athletes/[id]": "/organisation/athletes/[id]",
    "/organisation/teams/[id]": "/organisation/teams/[id]",
    "/admin/users": "/admin/users",
    "/admin/settings": "/admin/settings",
    "/admin/taxonomy": "/admin/taxonomy",
    "/components": "/components",
    // Localized paths (German → English)
    "/datenschutz": { de: "/datenschutz", en: "/privacy" },
    "/impressum": { de: "/impressum", en: "/imprint" },
    "/agb": { de: "/agb", en: "/terms" },
  },
});
