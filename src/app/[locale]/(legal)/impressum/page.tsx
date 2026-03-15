import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { ArrowLeft, Building2 } from "lucide-react";
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
    title: `${t("imprintTitle")} | Train Smarter`,
    description: t("imprintInfo"),
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

export default async function ImprintPage() {
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
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-h1 font-bold text-foreground">
              {t("imprintTitle")}
            </h1>
            <p className="text-body-sm text-muted-foreground">
              {t("imprintInfo")}
            </p>
          </div>
        </div>
      </div>

      <Alert>
        <AlertDescription className="text-body-sm">
          {t("legalNotice")}
        </AlertDescription>
      </Alert>

      <Section title={t("imprintOperator")}>
        <p className="text-body text-muted-foreground whitespace-pre-line">
          {t("imprintOperatorText")}
        </p>
      </Section>

      <Section title={t("imprintContact")}>
        <p className="text-body text-muted-foreground whitespace-pre-line">
          {t("imprintContactText")}
        </p>
      </Section>

      <Section title={t("imprintDispute")}>
        <p className="text-body text-muted-foreground">
          {t("imprintDisputeText")}
        </p>
      </Section>

      <Section title={t("imprintLiability")}>
        <p className="text-body text-muted-foreground">
          {t("imprintLiabilityText")}
        </p>
      </Section>
    </article>
  );
}
