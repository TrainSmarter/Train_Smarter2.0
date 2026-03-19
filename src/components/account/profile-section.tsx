"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Camera,
  Mail,
  Shield,
  UserX,
  Users,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";

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
import { uploadAvatar } from "@/hooks/use-avatar-upload";
import { disconnectAthlete } from "@/lib/athletes/actions";
import type { AuthUser } from "@/lib/auth-user";
import type { TrainerInfo } from "@/lib/athletes/types";
import { getSafeAvatarUrl, getInitials } from "@/lib/utils";

interface ProfileSectionProps {
  user: AuthUser;
  trainerInfo: TrainerInfo | null;
}

const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB

export function ProfileSection({ user, trainerInfo }: ProfileSectionProps) {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [showDisconnect, setShowDisconnect] = React.useState(false);
  const [isDisconnecting, setIsDisconnecting] = React.useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  const fullName =
    `${user.user_metadata.first_name} ${user.user_metadata.last_name}`.trim();
  const role = user.app_metadata.roles[0];
  const isAthlete = role === "ATHLETE";
  const isTrainer = role === "TRAINER";

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_AVATAR_SIZE) {
      toast.error(t("avatarTooLarge"));
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const result = await uploadAvatar(user.id, file);
      if (result.error === "INVALID_TYPE") {
        toast.error(t("avatarInvalidType"));
      } else if (result.error) {
        toast.error(t("avatarUploadError"));
      } else {
        toast.success(t("avatarUploaded"));
        router.refresh();
      }
    } catch {
      toast.error(t("avatarUploadError"));
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  async function handleDisconnectTrainer() {
    if (!trainerInfo) return;
    setIsDisconnecting(true);
    try {
      const result = await disconnectAthlete(trainerInfo.connectionId);
      if (result.success) {
        toast.success(t("trainerDisconnected"));
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
    <>
      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-h4">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="relative group">
              <Avatar className="h-20 w-20 shrink-0">
                {getSafeAvatarUrl(user.user_metadata.avatar_url) && (
                  <AvatarImage
                    src={getSafeAvatarUrl(user.user_metadata.avatar_url)!}
                    alt={fullName}
                  />
                )}
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-medium">
                  {getInitials(
                    user.user_metadata.first_name,
                    user.user_metadata.last_name
                  )}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                aria-label={t("changeAvatar")}
              >
                <Camera className="h-5 w-5 text-white" />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <div className="flex-1 min-w-0 text-center sm:text-left">
              <h2 className="text-h3 text-foreground">{fullName}</h2>

              <div className="mt-2 space-y-1">
                <p className="flex items-center justify-center gap-2 text-body text-muted-foreground sm:justify-start">
                  <Mail className="h-4 w-4 shrink-0" />
                  {user.email}
                </p>
                <p className="flex items-center justify-center gap-2 text-body-sm text-muted-foreground sm:justify-start">
                  <Shield className="h-4 w-4 shrink-0" />
                  <Badge variant="primary" size="sm">
                    {isTrainer ? t("roleTrainer") : t("roleAthlete")}
                  </Badge>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My Trainer (Athletes only) */}
      {isAthlete && (
        <Card>
          <CardHeader>
            <CardTitle className="text-h4">{t("myTrainer")}</CardTitle>
          </CardHeader>
          <CardContent>
            {trainerInfo ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 shrink-0">
                    {getSafeAvatarUrl(trainerInfo.avatarUrl ?? undefined) && (
                      <AvatarImage
                        src={getSafeAvatarUrl(trainerInfo.avatarUrl ?? undefined)!}
                        alt={`${trainerInfo.firstName} ${trainerInfo.lastName}`}
                      />
                    )}
                    <AvatarFallback className="bg-secondary/10 text-secondary font-medium">
                      {getInitials(trainerInfo.firstName, trainerInfo.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-body font-medium text-foreground">
                      {trainerInfo.firstName} {trainerInfo.lastName}
                    </p>
                    {trainerInfo.connectedAt && (
                      <p className="flex items-center gap-1 text-caption text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        {t("connectedSince", {
                          date: new Date(
                            trainerInfo.connectedAt
                          ).toLocaleDateString(locale, {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          }),
                        })}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDisconnect(true)}
                  iconLeft={<UserX className="h-4 w-4" />}
                >
                  {t("disconnectTrainer")}
                </Button>
              </div>
            ) : (
              <p className="text-body text-muted-foreground">
                {t("noTrainer")}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* My Athletes Quick Link (Trainers only) */}
      {isTrainer && (
        <Card>
          <CardHeader>
            <CardTitle className="text-h4">{t("myAthletes")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href="/organisation/athletes"
              className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-body font-medium text-foreground">
                    {t("viewAthletes")}
                  </p>
                  <p className="text-body-sm text-muted-foreground">
                    {t("viewAthletesDesc")}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Disconnect Trainer Dialog */}
      {trainerInfo && (
        <ConfirmDialog
          open={showDisconnect}
          onOpenChange={setShowDisconnect}
          variant="danger"
          title={t("disconnectTrainerDialogTitle")}
          message={t("disconnectTrainerDialogMessage", {
            name: `${trainerInfo.firstName} ${trainerInfo.lastName}`,
          })}
          confirmLabel={t("disconnectTrainer")}
          cancelLabel={tCommon("cancel")}
          onConfirm={handleDisconnectTrainer}
          loading={isDisconnecting}
        />
      )}
    </>
  );
}
