import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { ArrowLeft, FileText } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return {
    title: `${t("termsTitle")} | Train Smarter`,
    description: t("termsScopeText"),
  };
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-h3 font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

export default async function TermsPage() {
  const t = await getTranslations("legal");

  return (
    <article className="space-y-8">
      <div className="space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-body-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToHome")}
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-h1 font-bold text-foreground">
              {t("termsTitle")}
            </h1>
            <p className="text-body-sm text-muted-foreground">
              {t("lastUpdated", { date: "15.03.2026" })}
            </p>
          </div>
        </div>
      </div>

      <Alert>
        <AlertDescription className="text-body-sm">
          {t("legalNotice")}
        </AlertDescription>
      </Alert>

      <Section title={`1. ${t("termsScope")}`}>
        <p className="text-body text-muted-foreground">
          {t("termsScopeText")}
        </p>
      </Section>

      <Section title={`2. ${t("termsService")}`}>
        <p className="text-body text-muted-foreground">
          {t("termsServiceText")}
        </p>
      </Section>

      <Section title={`3. ${t("termsAccount")}`}>
        <p className="text-body text-muted-foreground">
          {t("termsAccountText")}
        </p>
      </Section>

      <Section title={`4. ${t("termsData")}`}>
        <p className="text-body text-muted-foreground">
          {t("termsDataText")}
        </p>
      </Section>

      <Section title={`5. ${t("termsTermination")}`}>
        <p className="text-body text-muted-foreground">
          {t("termsTerminationText")}
        </p>
      </Section>

      <Section title={`6. ${t("termsLiability")}`}>
        <p className="text-body text-muted-foreground">
          {t("termsLiabilityText")}
        </p>
      </Section>

      <Section title={`7. ${t("termsChanges")}`}>
        <p className="text-body text-muted-foreground">
          {t("termsChangesText")}
        </p>
      </Section>

      <Section title={`8. ${t("termsLaw")}`}>
        <p className="text-body text-muted-foreground">
          {t("termsLawText")}
        </p>
      </Section>
    </article>
  );
}
