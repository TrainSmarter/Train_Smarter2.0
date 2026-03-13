"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  ArrowLeft,
  Calendar,
  Mail,
  UserX,
  Cake,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/modal";
import { disconnectAthlete } from "@/lib/athletes/actions";
import type { AthleteDetail } from "@/lib/athletes/types";

interface AthleteDetailViewProps {
  athlete: AthleteDetail;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function AthleteDetailView({ athlete }: AthleteDetailViewProps) {
  const t = useTranslations("athletes");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [showDisconnect, setShowDisconnect] = React.useState(false);
  const [isDisconnecting, setIsDisconnecting] = React.useState(false);

  const fullName = `${athlete.firstName} ${athlete.lastName}`.trim();
  const isPending = athlete.status === "pending";

  async function handleDisconnect() {
    setIsDisconnecting(true);
    try {
      const result = await disconnectAthlete(athlete.connectionId);
      if (result.success) {
        toast.success(t("disconnected"));
        router.push("/organisation/athletes");
      } else {
        toast.error(t("errorGeneric"));
      }
    } catch {
      toast.error(t("errorGeneric"));
    } finally {
      setIsDisconnecting(false);
      setShowDisconnect(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/organisation/athletes"
        className="inline-flex items-center gap-1 text-body-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToAthletes")}
      </Link>

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <Avatar className="h-20 w-20 shrink-0">
              {athlete.avatarUrl && (
                <AvatarImage
                  src={athlete.avatarUrl}
                  alt={fullName}
                />
              )}
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-medium">
                {getInitials(athlete.firstName, athlete.lastName)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex flex-col items-center gap-2 sm:flex-row">
                <h1 className="text-h2 text-foreground">{fullName}</h1>
                <Badge variant={isPending ? "warning" : "success"}>
                  {isPending ? t("invitationPending") : t("active")}
                </Badge>
              </div>

              <div className="mt-2 space-y-1">
                <p className="flex items-center justify-center gap-2 text-body text-muted-foreground sm:justify-start">
                  <Mail className="h-4 w-4 shrink-0" />
                  {athlete.email}
                </p>
                {athlete.connectedAt && (
                  <p className="flex items-center justify-center gap-2 text-body-sm text-muted-foreground sm:justify-start">
                    <Calendar className="h-4 w-4 shrink-0" />
                    {t("connectedSince", {
                      date: new Date(athlete.connectedAt).toLocaleDateString(locale, { year: "numeric", month: "2-digit", day: "2-digit" }),
                    })}
                  </p>
                )}
              </div>
            </div>

            {/* Disconnect button */}
            {athlete.status === "active" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDisconnect(true)}
                iconLeft={<UserX className="h-4 w-4" />}
                className="shrink-0"
              >
                {t("disconnect")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Base Data Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-h4">{t("baseData")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            {athlete.birthDate && (
              <>
                <div>
                  <dt className="text-body-sm text-muted-foreground flex items-center gap-1">
                    <Cake className="h-3.5 w-3.5" />
                    {t("birthDate")}
                  </dt>
                  <dd className="mt-1 text-body text-foreground">
                    {new Date(athlete.birthDate).toLocaleDateString(locale, { year: "numeric", month: "2-digit", day: "2-digit" })}
                  </dd>
                </div>
                <div>
                  <dt className="text-body-sm text-muted-foreground">
                    {t("age")}
                  </dt>
                  <dd className="mt-1 text-body text-foreground">
                    {calculateAge(athlete.birthDate)} {t("years")}
                  </dd>
                </div>
              </>
            )}
            {!athlete.birthDate && (
              <p className="text-body text-muted-foreground col-span-full">
                {t("noBaseData")}
              </p>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Disconnect Confirm Dialog */}
      <ConfirmDialog
        open={showDisconnect}
        onOpenChange={setShowDisconnect}
        variant="danger"
        title={t("disconnectDialogTitle")}
        message={t("disconnectDialogMessage", { name: fullName })}
        confirmLabel={t("disconnect")}
        cancelLabel={tCommon("cancel")}
        onConfirm={handleDisconnect}
        loading={isDisconnecting}
      />
    </div>
  );
}
