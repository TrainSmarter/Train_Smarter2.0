"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useTypedLocale } from "@/hooks/use-typed-locale";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Globe, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { value: "de" as const, label: "Deutsch", flag: "DE" },
  { value: "en" as const, label: "English", flag: "EN" },
] as const;

export function LanguageSection() {
  const t = useTranslations("account");
  const locale = useTypedLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isSaving, setIsSaving] = React.useState(false);

  async function handleLocaleChange(newLocale: "de" | "en") {
    if (newLocale === locale) return;

    setIsSaving(true);
    try {
      // 1. Persist to DB
      const response = await fetch("/api/account/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: newLocale }),
      });

      if (!response.ok) {
        toast.error(t("languageError"));
        return;
      }

      // 2. Switch the URL locale (next-intl handles URL translation)
      router.replace(pathname as "/", { locale: newLocale });

      toast.success(t("languageSaved"));
    } catch {
      toast.error(t("languageError"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-h4">
          <Globe className="h-5 w-5" />
          {t("languageTitle")}
        </CardTitle>
        <CardDescription>{t("languageDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3">
          {LANGUAGES.map(({ value, label, flag }) => (
            <Button
              key={value}
              variant={locale === value ? "default" : "outline"}
              size="lg"
              className={cn(
                "flex-1 max-w-48 justify-start gap-3",
                locale === value && "ring-2 ring-primary/20"
              )}
              onClick={() => handleLocaleChange(value)}
              disabled={isSaving}
            >
              {isSaving && locale !== value ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : locale === value ? (
                <Check className="h-4 w-4" />
              ) : (
                <span className="text-xs font-bold text-muted-foreground">
                  {flag}
                </span>
              )}
              {label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
