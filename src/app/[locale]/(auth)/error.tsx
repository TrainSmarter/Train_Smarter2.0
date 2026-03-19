"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error("Auth route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error-light text-error dark:bg-error/20">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h2 className="text-h3 text-foreground">{t("authPageError")}</h2>
      <div className="flex gap-2">
        <Button onClick={reset} variant="outline">
          {t("tryAgain")}
        </Button>
        <Link href="/">
          <Button variant="ghost">{t("backToHome")}</Button>
        </Link>
      </div>
    </div>
  );
}
