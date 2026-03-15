"use client"

import { Link, usePathname } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"

/**
 * ShowcaseNav -- navigation bar for the design system and component library showcase pages.
 * Includes a dark mode toggle.
 */
export function ShowcaseNav() {
  const pathname = usePathname()
  const t = useTranslations("showcase")

  const navItems = [
    { href: "/", label: t("designSystem") },
    { href: "/components", label: t("componentLibrary") },
  ]

  return (
    <nav
      className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      aria-label={t("navAriaLabel")}
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href as "/"}
              className={cn(
                "rounded-md px-3 py-1.5 text-button transition-colors",
                pathname === item.href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              aria-current={pathname === item.href ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <ThemeToggle />
      </div>
    </nav>
  )
}
