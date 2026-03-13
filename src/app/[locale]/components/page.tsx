"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import {
  Users,
  Activity,
  TrendingUp,
  BarChart3,
  Heart,
  Search,
  Mail,
  Plus,
  Trash2,
  Settings,
  UserPlus,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"

import { ShowcaseNav } from "@/components/showcase-nav"
import { ButtonExtended } from "@/components/button-extended"
import {
  CardExtended,
  CardHeaderExtended,
  CardContent as ExtCardContent,
  CardFooter,
} from "@/components/card-extended"
import { Modal, ConfirmDialog } from "@/components/modal"
import { FormField } from "@/components/form-field"
import { StatsCard } from "@/components/stats-card"
import { BadgeExtended } from "@/components/badge-extended"
import { AlertExtended } from "@/components/alert-extended"
import {
  SkeletonText,
  SkeletonCard,
  SkeletonStatsCard,
  SkeletonAvatar,
} from "@/components/skeleton-composites"
import { EmptyState } from "@/components/empty-state"

/* -- Section Wrapper ---------------------------------------------- */

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-h2 text-foreground">{title}</h2>
      {children}
    </section>
  )
}

/* -- Page --------------------------------------------------------- */

export default function ComponentLibraryPage() {
  const t = useTranslations("showcase.comp")
  const [modalOpen, setModalOpen] = React.useState(false)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [confirmDangerOpen, setConfirmDangerOpen] = React.useState(false)
  const [alertVisible, setAlertVisible] = React.useState(true)
  const [progressValue, setProgressValue] = React.useState(45)

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

        {/* -- Design System Principles -------------------------------- */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border-l-4 border-l-primary bg-primary-50 p-4 dark:bg-primary/10">
            <p className="text-label text-primary-700 dark:text-primary-300">{t("tealAction")}</p>
            <p className="text-body-sm text-muted-foreground mt-1">
              {t("tealActionDesc")}
            </p>
          </div>
          <div className="rounded-lg border-l-4 border-l-violet-500 bg-violet-50 p-4 dark:bg-violet-500/10">
            <p className="text-label text-violet-700 dark:text-violet-300">{t("violetAccent")}</p>
            <p className="text-body-sm text-muted-foreground mt-1">
              {t("violetAccentDesc")}
            </p>
          </div>
          <div className="rounded-lg border-l-4 border-l-gray-400 bg-gray-50 p-4 dark:bg-gray-800">
            <p className="text-label text-gray-700 dark:text-gray-300">{t("leftBorderIdentity")}</p>
            <p className="text-body-sm text-muted-foreground mt-1">
              {t("leftBorderIdentityDesc")}
            </p>
          </div>
        </div>

        {/* -- ButtonExtended -------------------------------------- */}
        <Section title="ButtonExtended">
          <Card>
            <CardContent className="space-y-6 pt-6">
              {/* Variants */}
              <div>
                <p className="text-label text-muted-foreground mb-3">
                  {t("variants")}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <ButtonExtended variant="default">{t("btnPrimary")}</ButtonExtended>
                  <ButtonExtended variant="secondary">
                    {t("btnSecondary")}
                  </ButtonExtended>
                  <ButtonExtended variant="ghost">{t("btnGhost")}</ButtonExtended>
                  <ButtonExtended variant="success">{t("btnSuccess")}</ButtonExtended>
                  <ButtonExtended variant="danger">{t("btnDanger")}</ButtonExtended>
                </div>
              </div>

              {/* Sizes */}
              <div>
                <p className="text-label text-muted-foreground mb-3">
                  {t("sizes")}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <ButtonExtended size="sm">{t("btnSmall")}</ButtonExtended>
                  <ButtonExtended size="default">{t("btnMedium")}</ButtonExtended>
                  <ButtonExtended size="lg">{t("btnLarge")}</ButtonExtended>
                </div>
              </div>

              {/* Loading */}
              <div>
                <p className="text-label text-muted-foreground mb-3">
                  {t("loadingState")}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <ButtonExtended loading>{t("btnSaving")}</ButtonExtended>
                  <ButtonExtended variant="danger" loading>
                    {t("btnDeleting")}
                  </ButtonExtended>
                </div>
                <p className="text-caption text-muted-foreground mt-2">
                  {t("loadingA11yNote")}
                </p>
              </div>

              {/* Icons */}
              <div>
                <p className="text-label text-muted-foreground mb-3">
                  {t("withIcons")}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <ButtonExtended iconLeft={<Plus className="h-4 w-4" />}>
                    {t("btnAddAthlete")}
                  </ButtonExtended>
                  <ButtonExtended
                    variant="danger"
                    iconLeft={<Trash2 className="h-4 w-4" />}
                  >
                    {t("btnDelete")}
                  </ButtonExtended>
                  <ButtonExtended
                    variant="secondary"
                    iconRight={<Settings className="h-4 w-4" />}
                  >
                    {t("btnSettings")}
                  </ButtonExtended>
                </div>
              </div>

              {/* Full Width */}
              <div>
                <p className="text-label text-muted-foreground mb-3">
                  {t("fullWidth")}
                </p>
                <div className="max-w-sm">
                  <ButtonExtended fullWidth>
                    {t("btnRegister")}
                  </ButtonExtended>
                </div>
              </div>

              {/* Disabled */}
              <div>
                <p className="text-label text-muted-foreground mb-3">
                  {t("disabledState")}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <ButtonExtended disabled>{t("btnDisabled")}</ButtonExtended>
                  <ButtonExtended variant="success" disabled>
                    {t("btnSuccessDisabled")}
                  </ButtonExtended>
                </div>
              </div>
            </CardContent>
          </Card>
        </Section>

        {/* -- CardExtended ---------------------------------------- */}
        <Section title="CardExtended">
          <div className="grid gap-4 sm:grid-cols-3">
            <CardExtended variant="default">
              <CardHeaderExtended title={t("cardDefault")} subtitle={t("cardDefaultSub")} />
              <ExtCardContent>
                <p className="text-body text-muted-foreground">
                  {t("cardDefaultBody")}
                </p>
              </ExtCardContent>
            </CardExtended>

            <CardExtended variant="hover">
              <CardHeaderExtended
                title={t("cardHover")}
                subtitle={t("cardHoverSub")}
                icon={<Users className="h-5 w-5" />}
              />
              <ExtCardContent>
                <p className="text-body text-muted-foreground">
                  {t("cardHoverBody")}
                </p>
              </ExtCardContent>
            </CardExtended>

            <CardExtended variant="interactive">
              <CardHeaderExtended
                title={t("cardInteractive")}
                subtitle={t("cardInteractiveSub")}
                icon={<Activity className="h-5 w-5" />}
                action={
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                }
              />
              <ExtCardContent>
                <p className="text-body text-muted-foreground">
                  {t("cardInteractiveBody")}
                </p>
              </ExtCardContent>
              <CardFooter>
                <Button variant="outline" size="sm">
                  {t("cardDetails")}
                </Button>
              </CardFooter>
            </CardExtended>
          </div>
        </Section>

        {/* -- StatsCard ------------------------------------------- */}
        <Section title="StatsCard">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatsCard
              color="blue"
              title={t("statsActiveAthletes")}
              value="24"
              trend={{ value: 12, direction: "up" }}
              icon={<Users className="h-5 w-5" />}
            />
            <StatsCard
              color="green"
              title={t("statsCompliance")}
              value="87%"
              trend={{ value: 5, direction: "up" }}
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <StatsCard
              color="purple"
              title={t("statsPrograms")}
              value="8"
              trend={{ value: 0, direction: "neutral" }}
              icon={<BarChart3 className="h-5 w-5" />}
            />
            <StatsCard
              color="orange"
              title={t("statsSessionsWeek")}
              value="4.2"
              trend={{ value: 3, direction: "down" }}
              icon={<Activity className="h-5 w-5" />}
            />
            <StatsCard
              color="red"
              title={t("statsInjuries")}
              value="2"
              trend={{ value: 50, direction: "up" }}
              icon={<Heart className="h-5 w-5" />}
            />
          </div>
        </Section>

        {/* -- BadgeExtended --------------------------------------- */}
        <Section title="BadgeExtended">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div>
                <p className="text-label text-muted-foreground mb-3">
                  {t("variantsMd")}
                </p>
                <div className="flex flex-wrap gap-2">
                  <BadgeExtended variant="success">{t("badgeActive")}</BadgeExtended>
                  <BadgeExtended variant="warning">{t("badgePending")}</BadgeExtended>
                  <BadgeExtended variant="error">{t("badgeInjured")}</BadgeExtended>
                  <BadgeExtended variant="info">{t("badgeNew")}</BadgeExtended>
                  <BadgeExtended variant="gray">{t("badgeInactive")}</BadgeExtended>
                  <BadgeExtended variant="primary">{t("badgePremium")}</BadgeExtended>
                </div>
              </div>
              <div>
                <p className="text-label text-muted-foreground mb-3">
                  {t("sizeSm")}
                </p>
                <div className="flex flex-wrap gap-2">
                  <BadgeExtended variant="success" size="sm">
                    {t("badgeActive")}
                  </BadgeExtended>
                  <BadgeExtended variant="error" size="sm">
                    {t("badgeInjured")}
                  </BadgeExtended>
                  <BadgeExtended variant="info" size="sm">
                    {t("badgeNew")}
                  </BadgeExtended>
                </div>
              </div>
              <div>
                <p className="text-label text-muted-foreground mb-3">
                  {t("comparisonShadcn")}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge>{t("shadcnDefault")}</Badge>
                  <Badge variant="secondary">{t("shadcnSecondary")}</Badge>
                  <Badge variant="destructive">{t("shadcnDestructive")}</Badge>
                  <Badge variant="outline">{t("shadcnOutline")}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </Section>

        {/* -- AlertExtended --------------------------------------- */}
        <Section title="AlertExtended">
          <div className="space-y-3">
            <AlertExtended variant="success" title={t("alertSuccessTitle")}>
              {t("alertSuccessBody")}
            </AlertExtended>

            <AlertExtended
              variant="warning"
              title={t("alertWarningTitle")}
              action={
                <Button variant="outline" size="sm">
                  {t("alertWarningAction")}
                </Button>
              }
            >
              {t("alertWarningBody")}
            </AlertExtended>

            <AlertExtended variant="error" title={t("alertErrorTitle")}>
              {t("alertErrorBody")}
            </AlertExtended>

            {alertVisible && (
              <AlertExtended
                variant="info"
                title={t("alertInfoTitle")}
                onDismiss={() => setAlertVisible(false)}
              >
                {t("alertInfoBody")}
              </AlertExtended>
            )}
            {!alertVisible && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAlertVisible(true)}
              >
                {t("alertInfoShowAgain")}
              </Button>
            )}
          </div>
        </Section>

        {/* -- FormField ------------------------------------------- */}
        <Section title="FormField">
          <Card>
            <CardContent className="max-w-md space-y-6 pt-6">
              <FormField
                label={t("formName")}
                placeholder={t("formNamePlaceholder")}
                helperText={t("formNameHelper")}
                required
              />

              <FormField
                label={t("formEmail")}
                type="email"
                placeholder={t("formEmailPlaceholder")}
                iconLeft={<Mail className="h-4 w-4" />}
              />

              <FormField
                label={t("formSearch")}
                placeholder={t("formSearchPlaceholder")}
                iconLeft={<Search className="h-4 w-4" />}
              />

              <FormField
                label={t("formWeight")}
                type="number"
                placeholder={t("formWeightPlaceholder")}
                error={t("formWeightError")}
              />

              <FormField
                label={t("formNotes")}
                multiline
                rows={4}
                placeholder={t("formNotesPlaceholder")}
                helperText={t("formNotesHelper")}
              />

              <FormField
                label={t("formDisabled")}
                placeholder={t("formDisabledPlaceholder")}
                disabled
              />
            </CardContent>
          </Card>
        </Section>

        {/* -- Select, Checkbox, RadioGroup, Switch ---------------- */}
        <Section title="Form Controls (shadcn/ui)">
          <Card>
            <CardContent className="max-w-md space-y-6 pt-6">
              {/* Select */}
              <div className="space-y-2">
                <Label className="text-label text-foreground">
                  {t("selectSport")}
                </Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectSportPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fussball">{t("sportFootball")}</SelectItem>
                    <SelectItem value="basketball">{t("sportBasketball")}</SelectItem>
                    <SelectItem value="leichtathletik">{t("sportAthletics")}</SelectItem>
                    <SelectItem value="schwimmen">{t("sportSwimming")}</SelectItem>
                    <SelectItem value="tennis">{t("sportTennis")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Checkbox */}
              <div className="space-y-3">
                <Label className="text-label text-foreground">
                  {t("checkboxTrainingOptions")}
                </Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="option-kraft" defaultChecked />
                    <Label htmlFor="option-kraft" className="text-body cursor-pointer">
                      {t("optStrength")}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="option-ausdauer" />
                    <Label htmlFor="option-ausdauer" className="text-body cursor-pointer">
                      {t("optEndurance")}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="option-mobility" />
                    <Label htmlFor="option-mobility" className="text-body cursor-pointer">
                      {t("optMobility")}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="option-disabled" disabled />
                    <Label htmlFor="option-disabled" className="text-body cursor-pointer opacity-50">
                      {t("optDisabled")}
                    </Label>
                  </div>
                </div>
              </div>

              <Separator />

              {/* RadioGroup */}
              <div className="space-y-3">
                <Label className="text-label text-foreground">
                  {t("radioIntensity")}
                </Label>
                <RadioGroup defaultValue="mittel">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="niedrig" id="r-niedrig" />
                    <Label htmlFor="r-niedrig" className="text-body cursor-pointer">
                      {t("intensityLow")}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="mittel" id="r-mittel" />
                    <Label htmlFor="r-mittel" className="text-body cursor-pointer">
                      {t("intensityMedium")}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="hoch" id="r-hoch" />
                    <Label htmlFor="r-hoch" className="text-body cursor-pointer">
                      {t("intensityHigh")}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              {/* Switch */}
              <div className="space-y-3">
                <Label className="text-label text-foreground">
                  {t("switchSettings")}
                </Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="switch-notifications" className="text-body cursor-pointer">
                      {t("switchNotifications")}
                    </Label>
                    <Switch id="switch-notifications" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="switch-darkmode" className="text-body cursor-pointer">
                      {t("switchDarkMode")}
                    </Label>
                    <Switch id="switch-darkmode" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="switch-disabled" className="text-body cursor-pointer opacity-50">
                      {t("switchDisabled")}
                    </Label>
                    <Switch id="switch-disabled" disabled />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Progress */}
              <div className="space-y-3">
                <Label className="text-label text-foreground">
                  {t("progressTraining")}
                </Label>
                <Progress value={progressValue} />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProgressValue(Math.max(0, progressValue - 10))}
                  >
                    -10%
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProgressValue(Math.min(100, progressValue + 10))}
                  >
                    +10%
                  </Button>
                  <span className="text-body text-muted-foreground self-center">
                    {progressValue}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Section>

        {/* -- Modal & ConfirmDialog ------------------------------- */}
        <Section title="Modal & ConfirmDialog">
          <Card>
            <CardContent className="flex flex-wrap gap-3 pt-6">
              <Button onClick={() => setModalOpen(true)}>{t("modalOpen")}</Button>
              <Button
                variant="outline"
                onClick={() => setConfirmOpen(true)}
              >
                {t("confirmPrimary")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => setConfirmDangerOpen(true)}
              >
                {t("confirmDanger")}
              </Button>
            </CardContent>
          </Card>

          <Modal
            open={modalOpen}
            onOpenChange={setModalOpen}
            size="md"
            title={t("modalTitle")}
            description={t("modalDesc")}
            footer={
              <>
                <Button
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                >
                  {t("modalCancel")}
                </Button>
                <Button onClick={() => setModalOpen(false)}>
                  {t("modalSave")}
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <FormField label={t("modalNameLabel")} placeholder={t("modalNamePlaceholder")} required />
              <FormField
                label={t("modalEmailLabel")}
                type="email"
                placeholder={t("modalEmailPlaceholder")}
              />
            </div>
          </Modal>

          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            variant="primary"
            title={t("confirmSaveTitle")}
            message={t("confirmSaveMessage")}
            confirmLabel={t("confirmSaveBtn")}
            cancelLabel={t("confirmCancelBtn")}
            onConfirm={() => setConfirmOpen(false)}
            onCancel={() => setConfirmOpen(false)}
          />

          <ConfirmDialog
            open={confirmDangerOpen}
            onOpenChange={setConfirmDangerOpen}
            variant="danger"
            title={t("confirmDeleteTitle")}
            message={t("confirmDeleteMessage")}
            confirmLabel={t("confirmDeleteBtn")}
            cancelLabel={t("confirmDeleteCancelBtn")}
            onConfirm={() => setConfirmDangerOpen(false)}
            onCancel={() => setConfirmDangerOpen(false)}
          />
        </Section>

        {/* -- Tabs (shadcn) --------------------------------------- */}
        <Section title="Tabs (shadcn/ui)">
          <Card>
            <CardContent className="pt-6">
              <Tabs defaultValue="overview">
                <TabsList>
                  <TabsTrigger value="overview">{t("tabOverview")}</TabsTrigger>
                  <TabsTrigger value="training">{t("tabTraining")}</TabsTrigger>
                  <TabsTrigger value="body">{t("tabBody")}</TabsTrigger>
                  <TabsTrigger value="nutrition">{t("tabNutrition")}</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="mt-4">
                  <p className="text-body text-muted-foreground">
                    {t("tabOverviewContent")}
                  </p>
                </TabsContent>
                <TabsContent value="training" className="mt-4">
                  <p className="text-body text-muted-foreground">
                    {t("tabTrainingContent")}
                  </p>
                </TabsContent>
                <TabsContent value="body" className="mt-4">
                  <p className="text-body text-muted-foreground">
                    {t("tabBodyContent")}
                  </p>
                </TabsContent>
                <TabsContent value="nutrition" className="mt-4">
                  <p className="text-body text-muted-foreground">
                    {t("tabNutritionContent")}
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </Section>

        {/* -- Tooltip (shadcn) ------------------------------------ */}
        <Section title="Tooltip (shadcn/ui)">
          <Card>
            <CardContent className="flex flex-wrap gap-4 pt-6">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline">{t("tooltipTop")}</Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{t("tooltipTopContent")}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline">{t("tooltipRight")}</Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{t("tooltipRightContent")}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline">{t("tooltipBottom")}</Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{t("tooltipBottomContent")}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline">{t("tooltipLeft")}</Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>{t("tooltipLeftContent")}</p>
                </TooltipContent>
              </Tooltip>
            </CardContent>
          </Card>
        </Section>

        {/* -- Skeleton Composites --------------------------------- */}
        <Section title="Skeleton Loaders">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <p className="text-label text-muted-foreground">SkeletonCard</p>
              <SkeletonCard />
            </div>
            <div className="space-y-2">
              <p className="text-label text-muted-foreground">
                SkeletonStatsCard
              </p>
              <SkeletonStatsCard />
            </div>
            <div className="space-y-2">
              <p className="text-label text-muted-foreground">SkeletonText</p>
              <div className="rounded-lg border bg-card p-6">
                <SkeletonText lines={4} />
              </div>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-label text-muted-foreground mb-3">
              SkeletonAvatar
            </p>
            <div className="flex items-center gap-3">
              <SkeletonAvatar size="sm" />
              <SkeletonAvatar size="md" />
              <SkeletonAvatar size="lg" />
            </div>
          </div>
        </Section>

        {/* -- EmptyState ------------------------------------------ */}
        <Section title="EmptyState">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <EmptyState
                icon={<Users className="h-12 w-12" />}
                title={t("emptyNoAthletes")}
                description={t("emptyNoAthletesDesc")}
                action={
                  <ButtonExtended
                    iconLeft={<UserPlus className="h-4 w-4" />}
                  >
                    {t("emptyInviteAthlete")}
                  </ButtonExtended>
                }
              />
            </Card>
            <Card>
              <EmptyState
                icon="🏋️"
                title={t("emptyNoPlan")}
                description={t("emptyNoPlanDesc")}
                action={
                  <ButtonExtended
                    variant="secondary"
                    iconLeft={<Plus className="h-4 w-4" />}
                  >
                    {t("emptyCreatePlan")}
                  </ButtonExtended>
                }
              />
            </Card>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 mt-4">
            <Card>
              <EmptyState
                icon={<Search className="h-12 w-12" />}
                title={t("emptyNoResults")}
                description={t("emptyNoResultsDesc")}
              />
            </Card>
            <Card>
              <EmptyState
                icon="⚠️"
                title={t("emptyLoadError")}
                description={t("emptyLoadErrorDesc")}
                action={
                  <Button variant="outline">{t("emptyRetry")}</Button>
                }
              />
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
  )
}
