import { Dumbbell } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AuthErrorBoundary } from "@/components/auth-error-boundary";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Link } from "@/i18n/navigation";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("auth");
  const tFooter = await getTranslations("footer");

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-4">
      {/* Locale switcher */}
      <div className="absolute right-4 top-4">
        <LocaleSwitcher />
      </div>

      {/* Brand header */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-700 text-primary-foreground">
          <Dumbbell className="h-6 w-6" />
        </div>
        <div className="text-center">
          <h1 className="text-h3 text-foreground">{t("brandName")}</h1>
          <p className="text-body-sm text-muted-foreground">
            {t("brandTagline")}
          </p>
        </div>
      </div>

      {/* Content card */}
      <div className="w-full max-w-[420px]">
        <AuthErrorBoundary>{children}</AuthErrorBoundary>
      </div>

      {/* Footer with legal links */}
      <nav
        className="mt-8 flex flex-wrap items-center justify-center gap-3 text-body-sm text-muted-foreground"
        aria-label="Legal links"
      >
        <Link href="/datenschutz" className="hover:text-foreground transition-colors">
          {tFooter("privacy")}
        </Link>
        <span aria-hidden="true">&middot;</span>
        <Link href="/impressum" className="hover:text-foreground transition-colors">
          {tFooter("imprint")}
        </Link>
        <span aria-hidden="true">&middot;</span>
        <Link href="/agb" className="hover:text-foreground transition-colors">
          {tFooter("terms")}
        </Link>
      </nav>
    </div>
  );
}
