"use client"

import * as React from "react"
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
            Train Smarter 2.0 &mdash; Component Library
          </h1>
          <p className="text-body-lg text-muted-foreground">
            PROJ-2: UI Component Library. Alle erweiterten Komponenten auf
            einen Blick.
          </p>
        </div>

        {/* -- Design System Principles -------------------------------- */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border-l-4 border-l-primary bg-primary-50 p-4 dark:bg-primary/10">
            <p className="text-label text-primary-700 dark:text-primary-300">Teal = Action</p>
            <p className="text-body-sm text-muted-foreground mt-1">
              CTAs, Highlights, Branding, Focus-Ringe
            </p>
          </div>
          <div className="rounded-lg border-l-4 border-l-violet-500 bg-violet-50 p-4 dark:bg-violet-500/10">
            <p className="text-label text-violet-700 dark:text-violet-300">Violet = Accent</p>
            <p className="text-body-sm text-muted-foreground mt-1">
              Secondary, Periodisierung, Highlights
            </p>
          </div>
          <div className="rounded-lg border-l-4 border-l-gray-400 bg-gray-50 p-4 dark:bg-gray-800">
            <p className="text-label text-gray-700 dark:text-gray-300">Left Border = Identity</p>
            <p className="text-body-sm text-muted-foreground mt-1">
              4px Signature-Element durch alle Komponenten
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
                  Varianten
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <ButtonExtended variant="default">Primary</ButtonExtended>
                  <ButtonExtended variant="secondary">
                    Secondary
                  </ButtonExtended>
                  <ButtonExtended variant="ghost">Ghost</ButtonExtended>
                  <ButtonExtended variant="success">Success</ButtonExtended>
                  <ButtonExtended variant="danger">Danger</ButtonExtended>
                </div>
              </div>

              {/* Sizes */}
              <div>
                <p className="text-label text-muted-foreground mb-3">
                  Sizes
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <ButtonExtended size="sm">Small</ButtonExtended>
                  <ButtonExtended size="default">Medium</ButtonExtended>
                  <ButtonExtended size="lg">Large</ButtonExtended>
                </div>
              </div>

              {/* Loading */}
              <div>
                <p className="text-label text-muted-foreground mb-3">
                  Loading State
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <ButtonExtended loading>Speichern...</ButtonExtended>
                  <ButtonExtended variant="danger" loading>
                    Loeschen...
                  </ButtonExtended>
                </div>
                <p className="text-caption text-muted-foreground mt-2">
                  Loading-Buttons verwenden aria-disabled statt disabled, damit sie weiterhin fokussierbar bleiben (WCAG).
                </p>
              </div>

              {/* Icons */}
              <div>
                <p className="text-label text-muted-foreground mb-3">
                  Mit Icons
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <ButtonExtended iconLeft={<Plus className="h-4 w-4" />}>
                    Athlet hinzufuegen
                  </ButtonExtended>
                  <ButtonExtended
                    variant="danger"
                    iconLeft={<Trash2 className="h-4 w-4" />}
                  >
                    Loeschen
                  </ButtonExtended>
                  <ButtonExtended
                    variant="secondary"
                    iconRight={<Settings className="h-4 w-4" />}
                  >
                    Einstellungen
                  </ButtonExtended>
                </div>
              </div>

              {/* Full Width */}
              <div>
                <p className="text-label text-muted-foreground mb-3">
                  Full Width
                </p>
                <div className="max-w-sm">
                  <ButtonExtended fullWidth>
                    Registrieren
                  </ButtonExtended>
                </div>
              </div>

              {/* Disabled */}
              <div>
                <p className="text-label text-muted-foreground mb-3">
                  Disabled State
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <ButtonExtended disabled>Deaktiviert</ButtonExtended>
                  <ButtonExtended variant="success" disabled>
                    Success Disabled
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
              <CardHeaderExtended title="Default" subtitle="Standard Karte" />
              <ExtCardContent>
                <p className="text-body text-muted-foreground">
                  Keine Hover-Effekte.
                </p>
              </ExtCardContent>
            </CardExtended>

            <CardExtended variant="hover">
              <CardHeaderExtended
                title="Hover"
                subtitle="Hover fuer Lift-Effekt"
                icon={<Users className="h-5 w-5" />}
              />
              <ExtCardContent>
                <p className="text-body text-muted-foreground">
                  -translate-y-0.5 + Shadow-Lift
                </p>
              </ExtCardContent>
            </CardExtended>

            <CardExtended variant="interactive">
              <CardHeaderExtended
                title="Interactive"
                subtitle="Linker Akzent-Rand"
                icon={<Activity className="h-5 w-5" />}
                action={
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                }
              />
              <ExtCardContent>
                <p className="text-body text-muted-foreground">
                  4px Primary Border links + Hover
                </p>
              </ExtCardContent>
              <CardFooter>
                <Button variant="outline" size="sm">
                  Details
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
              title="Aktive Athleten"
              value="24"
              trend={{ value: 12, direction: "up" }}
              icon={<Users className="h-5 w-5" />}
            />
            <StatsCard
              color="green"
              title="Compliance"
              value="87%"
              trend={{ value: 5, direction: "up" }}
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <StatsCard
              color="purple"
              title="Programme"
              value="8"
              trend={{ value: 0, direction: "neutral" }}
              icon={<BarChart3 className="h-5 w-5" />}
            />
            <StatsCard
              color="orange"
              title="Sessions/Woche"
              value="4.2"
              trend={{ value: 3, direction: "down" }}
              icon={<Activity className="h-5 w-5" />}
            />
            <StatsCard
              color="red"
              title="Verletzungen"
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
                  Varianten (md)
                </p>
                <div className="flex flex-wrap gap-2">
                  <BadgeExtended variant="success">Aktiv</BadgeExtended>
                  <BadgeExtended variant="warning">Ausstehend</BadgeExtended>
                  <BadgeExtended variant="error">Verletzt</BadgeExtended>
                  <BadgeExtended variant="info">Neu</BadgeExtended>
                  <BadgeExtended variant="gray">Inaktiv</BadgeExtended>
                  <BadgeExtended variant="primary">Premium</BadgeExtended>
                </div>
              </div>
              <div>
                <p className="text-label text-muted-foreground mb-3">
                  Size sm
                </p>
                <div className="flex flex-wrap gap-2">
                  <BadgeExtended variant="success" size="sm">
                    Aktiv
                  </BadgeExtended>
                  <BadgeExtended variant="error" size="sm">
                    Verletzt
                  </BadgeExtended>
                  <BadgeExtended variant="info" size="sm">
                    Neu
                  </BadgeExtended>
                </div>
              </div>
              <div>
                <p className="text-label text-muted-foreground mb-3">
                  Vergleich mit shadcn Badge
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge>shadcn Default</Badge>
                  <Badge variant="secondary">shadcn Secondary</Badge>
                  <Badge variant="destructive">shadcn Destructive</Badge>
                  <Badge variant="outline">shadcn Outline</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </Section>

        {/* -- AlertExtended --------------------------------------- */}
        <Section title="AlertExtended">
          <div className="space-y-3">
            <AlertExtended variant="success" title="Erfolgreich gespeichert">
              Die Aenderungen wurden erfolgreich uebernommen.
            </AlertExtended>

            <AlertExtended
              variant="warning"
              title="Achtung"
              action={
                <Button variant="outline" size="sm">
                  Ueberpruefen
                </Button>
              }
            >
              Einige Felder sind noch nicht ausgefuellt.
            </AlertExtended>

            <AlertExtended variant="error" title="Fehler beim Speichern">
              Die Verbindung zum Server konnte nicht hergestellt werden. Bitte
              versuche es erneut.
            </AlertExtended>

            {alertVisible && (
              <AlertExtended
                variant="info"
                title="Tipp"
                onDismiss={() => setAlertVisible(false)}
              >
                Du kannst Athleten auch per E-Mail einladen. Klicke auf das
                X um diese Nachricht zu schliessen.
              </AlertExtended>
            )}
            {!alertVisible && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAlertVisible(true)}
              >
                Info-Alert erneut anzeigen
              </Button>
            )}
          </div>
        </Section>

        {/* -- FormField ------------------------------------------- */}
        <Section title="FormField">
          <Card>
            <CardContent className="max-w-md space-y-6 pt-6">
              <FormField
                label="Name"
                placeholder="Max Mustermann"
                helperText="Vor- und Nachname des Athleten"
                required
              />

              <FormField
                label="E-Mail"
                type="email"
                placeholder="max@beispiel.de"
                iconLeft={<Mail className="h-4 w-4" />}
              />

              <FormField
                label="Suche"
                placeholder="Athlet suchen..."
                iconLeft={<Search className="h-4 w-4" />}
              />

              <FormField
                label="Gewicht (kg)"
                type="number"
                placeholder="75"
                error="Bitte gib ein gueltiges Gewicht ein"
              />

              <FormField
                label="Notizen"
                multiline
                rows={4}
                placeholder="Freitext fuer Notizen..."
                helperText="Maximal 500 Zeichen"
              />

              <FormField
                label="Deaktiviertes Feld"
                placeholder="Nicht editierbar"
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
                  Select - Sportart
                </Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Sportart waehlen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fussball">Fussball</SelectItem>
                    <SelectItem value="basketball">Basketball</SelectItem>
                    <SelectItem value="leichtathletik">Leichtathletik</SelectItem>
                    <SelectItem value="schwimmen">Schwimmen</SelectItem>
                    <SelectItem value="tennis">Tennis</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Checkbox */}
              <div className="space-y-3">
                <Label className="text-label text-foreground">
                  Checkboxen - Trainingsoptionen
                </Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="option-kraft" defaultChecked />
                    <Label htmlFor="option-kraft" className="text-body cursor-pointer">
                      Krafttraining
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="option-ausdauer" />
                    <Label htmlFor="option-ausdauer" className="text-body cursor-pointer">
                      Ausdauertraining
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="option-mobility" />
                    <Label htmlFor="option-mobility" className="text-body cursor-pointer">
                      Mobility & Stretching
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="option-disabled" disabled />
                    <Label htmlFor="option-disabled" className="text-body cursor-pointer opacity-50">
                      Deaktiviert
                    </Label>
                  </div>
                </div>
              </div>

              <Separator />

              {/* RadioGroup */}
              <div className="space-y-3">
                <Label className="text-label text-foreground">
                  RadioGroup - Intensitaet
                </Label>
                <RadioGroup defaultValue="mittel">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="niedrig" id="r-niedrig" />
                    <Label htmlFor="r-niedrig" className="text-body cursor-pointer">
                      Niedrig
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="mittel" id="r-mittel" />
                    <Label htmlFor="r-mittel" className="text-body cursor-pointer">
                      Mittel
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="hoch" id="r-hoch" />
                    <Label htmlFor="r-hoch" className="text-body cursor-pointer">
                      Hoch
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              {/* Switch */}
              <div className="space-y-3">
                <Label className="text-label text-foreground">
                  Switch - Einstellungen
                </Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="switch-notifications" className="text-body cursor-pointer">
                      Benachrichtigungen
                    </Label>
                    <Switch id="switch-notifications" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="switch-darkmode" className="text-body cursor-pointer">
                      Dark Mode
                    </Label>
                    <Switch id="switch-darkmode" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="switch-disabled" className="text-body cursor-pointer opacity-50">
                      Deaktiviert
                    </Label>
                    <Switch id="switch-disabled" disabled />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Progress */}
              <div className="space-y-3">
                <Label className="text-label text-foreground">
                  Progress - Trainingsfortschritt
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
              <Button onClick={() => setModalOpen(true)}>Modal oeffnen</Button>
              <Button
                variant="outline"
                onClick={() => setConfirmOpen(true)}
              >
                Confirm Dialog (Primary)
              </Button>
              <Button
                variant="destructive"
                onClick={() => setConfirmDangerOpen(true)}
              >
                Confirm Dialog (Danger)
              </Button>
            </CardContent>
          </Card>

          <Modal
            open={modalOpen}
            onOpenChange={setModalOpen}
            size="md"
            title="Neuen Athleten anlegen"
            description="Fuelle die Pflichtfelder aus, um einen Athleten hinzuzufuegen."
            footer={
              <>
                <Button
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                >
                  Abbrechen
                </Button>
                <Button onClick={() => setModalOpen(false)}>
                  Speichern
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <FormField label="Name" placeholder="Vorname Nachname" required />
              <FormField
                label="E-Mail"
                type="email"
                placeholder="athlet@beispiel.de"
              />
            </div>
          </Modal>

          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            variant="primary"
            title="Aenderungen speichern?"
            message="Moechtest du die Aenderungen am Trainingsprogramm speichern?"
            confirmLabel="Speichern"
            onConfirm={() => setConfirmOpen(false)}
            onCancel={() => setConfirmOpen(false)}
          />

          <ConfirmDialog
            open={confirmDangerOpen}
            onOpenChange={setConfirmDangerOpen}
            variant="danger"
            title="Athleten loeschen?"
            message="Diese Aktion kann nicht rueckgaengig gemacht werden. Alle Trainingsdaten dieses Athleten werden geloescht."
            confirmLabel="Endgueltig loeschen"
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
                  <TabsTrigger value="overview">Uebersicht</TabsTrigger>
                  <TabsTrigger value="training">Training</TabsTrigger>
                  <TabsTrigger value="body">Body</TabsTrigger>
                  <TabsTrigger value="nutrition">Ernaehrung</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="mt-4">
                  <p className="text-body text-muted-foreground">
                    Uebersicht-Tab mit allgemeinen Informationen zum Athleten.
                    ARIA-Rollen sind durch Radix Tabs automatisch gesetzt.
                  </p>
                </TabsContent>
                <TabsContent value="training" className="mt-4">
                  <p className="text-body text-muted-foreground">
                    Trainingsplan und aktuelle Programme.
                  </p>
                </TabsContent>
                <TabsContent value="body" className="mt-4">
                  <p className="text-body text-muted-foreground">
                    Koerperdaten, Gewicht, Anthropometrie.
                  </p>
                </TabsContent>
                <TabsContent value="nutrition" className="mt-4">
                  <p className="text-body text-muted-foreground">
                    Ernaehrungsdaten und Makro-Tracking.
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
                  <Button variant="outline">Oben (default)</Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Tooltip oben</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline">Rechts</Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Tooltip rechts</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline">Unten</Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Tooltip unten</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline">Links</Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Tooltip links</p>
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
                title="Keine Athleten"
                description="Du hast noch keine Athleten hinzugefuegt. Lade deinen ersten Athleten ein."
                action={
                  <ButtonExtended
                    iconLeft={<UserPlus className="h-4 w-4" />}
                  >
                    Athlet einladen
                  </ButtonExtended>
                }
              />
            </Card>
            <Card>
              <EmptyState
                icon="🏋️"
                title="Kein Trainingsplan"
                description="Erstelle einen Trainingsplan, um mit dem Training zu beginnen."
                action={
                  <ButtonExtended
                    variant="secondary"
                    iconLeft={<Plus className="h-4 w-4" />}
                  >
                    Plan erstellen
                  </ButtonExtended>
                }
              />
            </Card>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 mt-4">
            <Card>
              <EmptyState
                icon={<Search className="h-12 w-12" />}
                title="Kein Ergebnis"
                description="Deine Suche hat keine Treffer ergeben. Versuche einen anderen Suchbegriff."
              />
            </Card>
            <Card>
              <EmptyState
                icon="⚠️"
                title="Fehler beim Laden"
                description="Die Daten konnten nicht geladen werden. Bitte versuche es erneut."
                action={
                  <Button variant="outline">Erneut versuchen</Button>
                }
              />
            </Card>
          </div>
        </Section>

        {/* Footer */}
        <footer className="border-t border-border pt-8 text-center">
          <p className="text-body-sm text-muted-foreground">
            Train Smarter 2.0 &mdash; UI Component Library (PROJ-2)
          </p>
        </footer>
      </main>
    </>
  )
}
