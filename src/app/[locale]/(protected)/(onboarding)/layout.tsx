import { Dumbbell } from "lucide-react";
import { getTranslations } from "next-intl/server";

/**
 * Onboarding layout — full-width, no AppSidebar.
 * The wizard is centered on screen with the brand logo above.
 */
export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("sidebar");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Brand header */}
      <header className="flex items-center gap-2 border-b p-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-700 text-primary-foreground">
          <Dumbbell className="h-4 w-4" />
        </div>
        <span className="text-h4 text-foreground">{t("brand")}</span>
      </header>

      {/* Wizard content */}
      <main className="flex flex-1 items-start justify-center p-4 pt-8 md:pt-16">
        <div className="w-full max-w-[640px]">{children}</div>
      </main>
    </div>
  );
}
