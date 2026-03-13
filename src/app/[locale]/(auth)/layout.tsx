import { Dumbbell } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("auth");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
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
      <div className="w-full max-w-[420px]">{children}</div>
    </div>
  );
}
