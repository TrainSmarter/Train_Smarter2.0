import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShowcaseNav } from "@/components/showcase-nav";

/* -- Color Swatch Helper ----------------------------------------- */

function Swatch({
  name,
  className,
}: {
  name: string;
  className: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`h-10 w-10 rounded-md border border-border ${className}`}
        aria-label={name}
      />
      <span className="text-caption text-muted-foreground">{name}</span>
    </div>
  );
}

/* -- Section Wrapper ---------------------------------------------- */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-h2 text-foreground">{title}</h2>
      {children}
    </section>
  );
}

/* -- Page --------------------------------------------------------- */

export default async function DesignSystemPage() {
  const t = await getTranslations("showcase.ds");

  return (
    <>
      <ShowcaseNav />
      <main className="mx-auto max-w-5xl space-y-12 px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-h1 text-foreground">
            {t("title")}
          </h1>
          <p className="text-body-lg text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        {/* -- Typography ------------------------------------------ */}
        <Section title={t("sTypography")}>
          <Card>
            <CardContent className="space-y-4 pt-6">
              <p className="text-h1">H1 &mdash; 32px / Bold / -0.02em</p>
              <p className="text-h2">H2 &mdash; 24px / SemiBold / -0.015em</p>
              <p className="text-h3">H3 &mdash; 20px / SemiBold / -0.01em</p>
              <p className="text-h4">H4 &mdash; 16px / SemiBold</p>
              <p className="text-h5">H5 &mdash; 14px / SemiBold</p>
              <hr className="border-border" />
              <p className="text-body-lg">
                Body Large &mdash; 16px / Regular
              </p>
              <p className="text-body">Body &mdash; 14px / Regular (Default)</p>
              <p className="text-body-sm">Body Small &mdash; 12px / Regular</p>
              <hr className="border-border" />
              <p className="text-label">Label &mdash; 12px / SemiBold / UPPERCASE / +0.05em</p>
              <p className="text-button">Button &mdash; 14px / SemiBold</p>
              <p className="text-caption">Caption &mdash; 11px / Medium</p>
            </CardContent>
          </Card>
        </Section>

        {/* -- Primary (Teal) -------------------------------------- */}
        <Section title={t("sPrimaryColor")}>
          <div className="flex flex-wrap gap-3">
            <Swatch name="50" className="bg-primary-50" />
            <Swatch name="100" className="bg-primary-100" />
            <Swatch name="200" className="bg-primary-200" />
            <Swatch name="300" className="bg-primary-300" />
            <Swatch name="400" className="bg-primary-400" />
            <Swatch name="500" className="bg-primary-500" />
            <Swatch name="600" className="bg-primary-600" />
            <Swatch name="700" className="bg-primary-700" />
            <Swatch name="800" className="bg-primary-800" />
            <Swatch name="900" className="bg-primary-900" />
          </div>
        </Section>

        {/* -- Secondary (Violet) ---------------------------------- */}
        <Section title={t("sSecondaryColor")}>
          <div className="flex flex-wrap gap-3">
            <Swatch name="50" className="bg-violet-50" />
            <Swatch name="100" className="bg-violet-100" />
            <Swatch name="200" className="bg-violet-200" />
            <Swatch name="300" className="bg-violet-300" />
            <Swatch name="400" className="bg-violet-400" />
            <Swatch name="500" className="bg-violet-500" />
            <Swatch name="600" className="bg-violet-600" />
            <Swatch name="700" className="bg-violet-700" />
            <Swatch name="800" className="bg-violet-800" />
            <Swatch name="900" className="bg-violet-900" />
          </div>
        </Section>

        {/* -- Gray Scale ------------------------------------------ */}
        <Section title={t("sGrayColor")}>
          <div className="flex flex-wrap gap-3">
            <Swatch name="50" className="bg-gray-50" />
            <Swatch name="100" className="bg-gray-100" />
            <Swatch name="200" className="bg-gray-200" />
            <Swatch name="300" className="bg-gray-300" />
            <Swatch name="400" className="bg-gray-400" />
            <Swatch name="500" className="bg-gray-500" />
            <Swatch name="600" className="bg-gray-600" />
            <Swatch name="700" className="bg-gray-700" />
            <Swatch name="800" className="bg-gray-800" />
            <Swatch name="900" className="bg-gray-900" />
          </div>
        </Section>

        {/* -- Semantic Colors ------------------------------------- */}
        <Section title={t("sSemanticColors")}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-h5">{t("colorSuccess")}</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2">
                <div className="h-8 w-8 rounded-md bg-success-light" />
                <div className="h-8 w-8 rounded-md bg-success" />
                <div className="h-8 w-8 rounded-md bg-success-dark" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-h5">{t("colorWarning")}</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2">
                <div className="h-8 w-8 rounded-md bg-warning-light" />
                <div className="h-8 w-8 rounded-md bg-warning" />
                <div className="h-8 w-8 rounded-md bg-warning-dark" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-h5">{t("colorError")}</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2">
                <div className="h-8 w-8 rounded-md bg-error-light" />
                <div className="h-8 w-8 rounded-md bg-error" />
                <div className="h-8 w-8 rounded-md bg-error-dark" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-h5">{t("colorInfo")}</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2">
                <div className="h-8 w-8 rounded-md bg-info-light" />
                <div className="h-8 w-8 rounded-md bg-info" />
                <div className="h-8 w-8 rounded-md bg-info-dark" />
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* -- shadcn/ui Semantic Tokens --------------------------- */}
        <Section title={t("sShadcnTokens")}>
          <div className="flex flex-wrap gap-3">
            <Swatch name="background" className="bg-background" />
            <Swatch name="foreground" className="bg-foreground" />
            <Swatch name="primary" className="bg-primary" />
            <Swatch name="secondary" className="bg-secondary" />
            <Swatch name="muted" className="bg-muted" />
            <Swatch name="accent" className="bg-accent" />
            <Swatch name="destructive" className="bg-destructive" />
            <Swatch name="border" className="bg-border" />
            <Swatch name="ring" className="bg-ring" />
            <Swatch name="card" className="bg-card" />
          </div>
          <p className="text-caption text-muted-foreground mt-2">
            {t("darkModeTip")}
          </p>
        </Section>

        {/* -- Buttons --------------------------------------------- */}
        <Section title={t("sButtons")}>
          <Card>
            <CardContent className="flex flex-wrap items-center gap-3 pt-6">
              <Button>{t("btnPrimary")}</Button>
              <Button variant="secondary">{t("btnSecondary")}</Button>
              <Button variant="destructive">{t("btnDestructive")}</Button>
              <Button variant="outline">{t("btnOutline")}</Button>
              <Button variant="ghost">{t("btnGhost")}</Button>
              <Button variant="link">{t("btnLink")}</Button>
              <Button className="bg-violet-600 text-white hover:bg-violet-700">
                {t("btnVioletCustom")}
              </Button>
            </CardContent>
          </Card>
        </Section>

        {/* -- Badges ---------------------------------------------- */}
        <Section title={t("sBadges")}>
          <div className="flex flex-wrap gap-2">
            <Badge>{t("badgeDefault")}</Badge>
            <Badge variant="secondary">{t("badgeSecondary")}</Badge>
            <Badge variant="destructive">{t("badgeDestructive")}</Badge>
            <Badge variant="outline">{t("badgeOutline")}</Badge>
            <Badge variant="success">{t("badgeSuccess")}</Badge>
            <Badge variant="warning">{t("badgeWarning")}</Badge>
            <Badge variant="error">{t("badgeError")}</Badge>
            <Badge variant="info">{t("badgeInfo")}</Badge>
            <Badge variant="gray">{t("badgeInactive")}</Badge>
            <Badge variant="primary">{t("badgePremium")}</Badge>
          </div>
        </Section>

        {/* -- Form Elements --------------------------------------- */}
        <Section title={t("sFormElements")}>
          <Card>
            <CardContent className="max-w-sm space-y-4 pt-6">
              <div className="space-y-2">
                <label htmlFor="demo-input" className="text-label text-foreground">
                  {t("inputLabel")}
                </label>
                <Input
                  id="demo-input"
                  placeholder={t("inputPlaceholder")}
                />
              </div>
              <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1">
                <p className="text-label text-foreground">{t("focusRingTitle")}</p>
                <p className="text-body-sm text-muted-foreground">
                  <span className="inline-block h-3 w-3 rounded-sm bg-primary mr-1 align-middle" /> {t("focusRingTeal")}
                </p>
                <p className="text-body-sm text-muted-foreground">
                  <span className="inline-block h-3 w-3 rounded-sm bg-error mr-1 align-middle" /> {t("focusRingError")}
                </p>
                <p className="text-body-sm text-muted-foreground">
                  <span className="inline-block h-3 w-3 rounded-sm bg-violet-500 mr-1 align-middle" /> {t("focusRingViolet")}
                </p>
              </div>
            </CardContent>
          </Card>
        </Section>

        {/* -- Spacing Grid ---------------------------------------- */}
        <Section title={t("sSpacing")}>
          <div className="flex items-end gap-4">
            {[
              { label: "4px (xs)", size: "h-1 w-1" },
              { label: "8px (sm)", size: "h-2 w-2" },
              { label: "16px (md)", size: "h-4 w-4" },
              { label: "24px (lg)", size: "h-6 w-6" },
              { label: "32px (xl)", size: "h-8 w-8" },
              { label: "48px (2xl)", size: "h-12 w-12" },
              { label: "64px (3xl)", size: "h-16 w-16" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-1">
                <div
                  className={`${item.size} rounded-sm bg-primary`}
                  aria-hidden="true"
                />
                <span className="text-caption text-muted-foreground whitespace-nowrap">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* -- Border Radius --------------------------------------- */}
        <Section title={t("sBorderRadius")}>
          <div className="flex flex-wrap items-center gap-4">
            {[
              { label: "xs (4px)", radius: "rounded-xs" },
              { label: "sm (6px)", radius: "rounded-sm" },
              { label: "md (8px)", radius: "rounded-md" },
              { label: "lg (12px)", radius: "rounded-lg" },
              { label: "xl (16px)", radius: "rounded-xl" },
              { label: "2xl (24px)", radius: "rounded-2xl" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-1">
                <div
                  className={`h-12 w-12 bg-violet-500 ${item.radius}`}
                  aria-hidden="true"
                />
                <span className="text-caption text-muted-foreground">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* -- Shadows --------------------------------------------- */}
        <Section title={t("sShadows")}>
          <div className="flex flex-wrap items-center gap-6">
            {["shadow-xs", "shadow-sm", "shadow-md", "shadow-lg", "shadow-xl"].map(
              (shadow) => (
                <div key={shadow} className="flex flex-col items-center gap-1">
                  <div
                    className={`h-16 w-16 rounded-lg bg-card ${shadow}`}
                    aria-hidden="true"
                  />
                  <span className="text-caption text-muted-foreground">
                    {shadow.replace("shadow-", "")}
                  </span>
                </div>
              )
            )}
          </div>
        </Section>

        {/* -- Motion Tokens --------------------------------------- */}
        <Section title={t("sMotionTokens")}>
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-label text-muted-foreground">Duration</p>
                  <p className="text-body"><code className="rounded bg-muted px-1.5 py-0.5 text-body-sm font-mono">fast</code> 150ms</p>
                  <p className="text-body"><code className="rounded bg-muted px-1.5 py-0.5 text-body-sm font-mono">base</code> 250ms</p>
                  <p className="text-body"><code className="rounded bg-muted px-1.5 py-0.5 text-body-sm font-mono">slow</code> 400ms</p>
                </div>
                <div className="space-y-1">
                  <p className="text-label text-muted-foreground">Easing</p>
                  <p className="text-body"><code className="rounded bg-muted px-1.5 py-0.5 text-body-sm font-mono">default</code> ease-in-out</p>
                  <p className="text-body"><code className="rounded bg-muted px-1.5 py-0.5 text-body-sm font-mono">spring</code> overshoot</p>
                </div>
                <div className="space-y-1">
                  <p className="text-label text-muted-foreground">Usage</p>
                  <p className="text-body-sm text-muted-foreground">
                    Hover/Focus: fast (150ms). Layout-Transitions: base (250ms). Page-Transitions: slow (400ms).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Section>

        {/* -- Cards Demo ------------------------------------------ */}
        <Section title={t("sCardComposition")}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>{t("cardAthletes")}</CardTitle>
                <CardDescription>{t("cardAthletesDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-h1 text-primary">24</p>
                <p className="text-body-sm text-muted-foreground">
                  {t("cardAthletesChange")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("cardPrograms")}</CardTitle>
                <CardDescription>{t("cardProgramsDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-h1 text-violet-600 dark:text-violet-400">8</p>
                <p className="text-body-sm text-muted-foreground">
                  {t("cardProgramsChange")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("cardCompliance")}</CardTitle>
                <CardDescription>{t("cardComplianceDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-h1 text-success">87%</p>
                <p className="text-body-sm text-muted-foreground">
                  {t("cardComplianceChange")}
                </p>
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* Footer */}
        <footer className="border-t border-border pt-8 text-center">
          <p className="text-body-sm text-muted-foreground">
            {t("footer")}
          </p>
        </footer>
      </main>
    </>
  );
}
