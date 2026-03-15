import { Dumbbell } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Link } from "@/i18n/navigation";

export default async function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("auth");
  const tFooter = await getTranslations("footer");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-700 text-primary-foreground">
              <Dumbbell className="h-4 w-4" />
            </div>
            <span className="text-body font-semibold text-foreground">
              {t("brandName")}
            </span>
          </Link>
          <LocaleSwitcher />
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-4 px-4 py-6 text-body-sm text-muted-foreground sm:justify-between sm:px-6">
          <span>&copy; {new Date().getFullYear()} Train Smarter</span>
          <nav className="flex gap-4" aria-label="Legal links">
            <Link href="/datenschutz" className="hover:text-foreground transition-colors">
              {tFooter("privacy")}
            </Link>
            <Link href="/impressum" className="hover:text-foreground transition-colors">
              {tFooter("imprint")}
            </Link>
            <Link href="/agb" className="hover:text-foreground transition-colors">
              {tFooter("terms")}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
