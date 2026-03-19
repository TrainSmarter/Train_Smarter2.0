import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { ArrowLeft, Shield } from "lucide-react";
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
    title: `${t("privacyTitle")} | Train Smarter`,
    description: t("privacyIntro"),
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

export default async function PrivacyPage() {
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
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-h1 font-bold text-foreground">
              {t("privacyTitle")}
            </h1>
            <p className="text-body-sm text-muted-foreground">
              {t("lastUpdated", { date: "15.03.2026" })}
            </p>
          </div>
        </div>

        <p className="text-body text-muted-foreground leading-relaxed">
          {t("privacyIntro")}
        </p>
      </div>

      <Alert>
        <AlertDescription className="text-body-sm">
          {t("legalNotice")}
        </AlertDescription>
      </Alert>

      <Section title={t("privacyResponsible")}>
        <p className="text-body text-muted-foreground whitespace-pre-line">
          {t("privacyResponsibleText")}
        </p>
      </Section>

      <Section title={t("privacyDataCategories")}>
        <p className="text-body text-muted-foreground">
          {t("privacyDataCategoriesText")}
        </p>
        <ul className="list-disc pl-6 space-y-1.5 text-body text-muted-foreground">
          <li>{t("privacyDataCat1")}</li>
          <li>{t("privacyDataCat2")}</li>
          <li>{t("privacyDataCat3")}</li>
          <li>{t("privacyDataCat4")}</li>
          <li>{t("privacyDataCat5")}</li>
          <li>{t("privacyDataCat6")}</li>
        </ul>
      </Section>

      <Section title={t("privacyLegalBasis")}>
        <p className="text-body text-muted-foreground">
          {t("privacyLegalBasisText")}
        </p>
        <ul className="list-disc pl-6 space-y-1.5 text-body text-muted-foreground">
          <li>{t("privacyLegal1")}</li>
          <li>{t("privacyLegal2")}</li>
          <li>{t("privacyLegal3")}</li>
        </ul>
      </Section>

      <Section title={t("privacyPurpose")}>
        <p className="text-body text-muted-foreground">
          {t("privacyPurposeText")}
        </p>
      </Section>

      <Section title={t("privacyStorage")}>
        <p className="text-body text-muted-foreground">
          {t("privacyStorageText")}
        </p>
      </Section>

      <Section title={t("privacyProcessors")}>
        <p className="text-body text-muted-foreground">
          {t("privacyProcessorsText")}
        </p>
        <ul className="list-disc pl-6 space-y-1.5 text-body text-muted-foreground">
          <li>{t("privacyProcessor1")}</li>
          <li>{t("privacyProcessor2")}</li>
        </ul>
      </Section>

      <Section title={t("privacyCookiesTitle")}>
        <p className="text-body text-muted-foreground">
          {t("privacyCookiesIntro")}
        </p>
        <h3 className="text-body font-semibold text-foreground">
          {t("privacyCookiesAuthTitle")}
        </h3>
        <p className="text-body text-muted-foreground">
          {t("privacyCookiesAuthText")}
        </p>
        <h3 className="text-body font-semibold text-foreground">
          {t("privacyCookiesSessionTitle")}
        </h3>
        <p className="text-body text-muted-foreground">
          {t("privacyCookiesSessionText")}
        </p>
        <ul className="list-disc pl-6 space-y-1.5 text-body text-muted-foreground">
          <li>{t("privacyCookiesSessionDefault")}</li>
          <li>{t("privacyCookiesSessionRemember")}</li>
        </ul>
        <h3 className="text-body font-semibold text-foreground">
          {t("privacyCookiesLocalStorageTitle")}
        </h3>
        <p className="text-body text-muted-foreground">
          {t("privacyCookiesLocalStorageText")}
        </p>
        <p className="text-body text-muted-foreground italic">
          {t("privacyCookiesLegalBasis")}
        </p>
      </Section>

      <Section title={t("privacyRights")}>
        <p className="text-body text-muted-foreground">
          {t("privacyRightsText")}
        </p>
        <ul className="list-disc pl-6 space-y-1.5 text-body text-muted-foreground">
          <li>{t("privacyRight1")}</li>
          <li>{t("privacyRight2")}</li>
          <li>{t("privacyRight3")}</li>
          <li>{t("privacyRight4")}</li>
          <li>{t("privacyRight5")}</li>
        </ul>
      </Section>

      <Section title={t("privacyContact")}>
        <p className="text-body text-muted-foreground">
          {t("privacyContactText")}
        </p>
      </Section>

      <Section title={t("privacyComplaint")}>
        <p className="text-body text-muted-foreground">
          {t("privacyComplaintText")}
        </p>
      </Section>
    </article>
  );
}
