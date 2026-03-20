"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Shield,
  ShieldOff,
  KeyRound,
  Users,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/modal";
import type { AdminUser, UserStats } from "@/lib/admin/types";

interface UserDetailSlideOverProps {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(dateStr: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(dateStr));
}

function formatRelativeTime(
  dateStr: string | null,
  locale: string,
  neverLabel: string
): string {
  if (!dateStr) return neverLabel;

  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const rtf = new Intl.RelativeTimeFormat(locale === "de" ? "de" : "en", {
    numeric: "auto",
  });

  if (diffDays > 30) {
    return formatDate(dateStr, locale);
  } else if (diffDays >= 1) {
    return rtf.format(-diffDays, "day");
  } else {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours >= 1) {
      return rtf.format(-diffHours, "hour");
    }
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes >= 1) {
      return rtf.format(-diffMinutes, "minute");
    }
    return rtf.format(0, "second");
  }
}

export function UserDetailSlideOver({
  user,
  open,
  onOpenChange,
  onUserUpdated,
}: UserDetailSlideOverProps) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  // User stats
  const [stats, setStats] = React.useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = React.useState(false);

  // Role change state
  const [newRole, setNewRole] = React.useState<"TRAINER" | "ATHLETE">(
    user?.role ?? "ATHLETE"
  );
  const [roleConfirmOpen, setRoleConfirmOpen] = React.useState(false);
  const [roleChanging, setRoleChanging] = React.useState(false);

  // Ban/unban state
  const [banConfirmOpen, setBanConfirmOpen] = React.useState(false);
  const [banChanging, setBanChanging] = React.useState(false);

  // Password reset state
  const [resetConfirmOpen, setResetConfirmOpen] = React.useState(false);
  const [resetSending, setResetSending] = React.useState(false);

  // Determine if this is the current admin (self-protection)
  const [isSelf, setIsSelf] = React.useState(false);

  // Load stats when user changes
  React.useEffect(() => {
    if (!user || !open) {
      setStats(null);
      return;
    }

    setNewRole(user.role ?? "ATHLETE");

    // Try to load stats from backend
    async function loadStats() {
      setStatsLoading(true);
      try {
        const { getUserStatsAction } = await import("@/lib/admin/actions");
        const result = await getUserStatsAction(user!.id);
        setStats(result);
      } catch {
        // Backend not ready yet
        setStats(null);
      } finally {
        setStatsLoading(false);
      }
    }

    // Try to check if current user is the displayed user
    async function checkIsSelf() {
      try {
        const { checkIsSelfUserAction } = await import("@/lib/admin/actions");
        const result = await checkIsSelfUserAction(user!.id);
        setIsSelf(result);
      } catch {
        // Fallback: check isPlatformAdmin flag as heuristic
        setIsSelf(user!.isPlatformAdmin);
      }
    }

    loadStats();
    checkIsSelf();
  }, [user, open]);

  async function handleRoleChange() {
    if (!user) return;
    setRoleChanging(true);
    try {
      const { changeUserRole } = await import("@/lib/admin/actions");
      const result = await changeUserRole(user.id, newRole);
      if (result.success) {
        toast.success(t("roleChangeSuccess"));
        setRoleConfirmOpen(false);
        onUserUpdated();
        onOpenChange(false);
      } else {
        toast.error(result.error ?? t("errorGeneric"));
      }
    } catch {
      toast.error(t("errorGeneric"));
    } finally {
      setRoleChanging(false);
    }
  }

  async function handleBanToggle() {
    if (!user) return;
    setBanChanging(true);
    try {
      if (user.isBanned) {
        const { unbanUser } = await import("@/lib/admin/actions");
        const result = await unbanUser(user.id);
        if (result.success) {
          toast.success(t("unbanSuccess"));
          setBanConfirmOpen(false);
          onUserUpdated();
          onOpenChange(false);
        } else {
          toast.error(result.error ?? t("errorGeneric"));
        }
      } else {
        const { banUser } = await import("@/lib/admin/actions");
        const result = await banUser(user.id);
        if (result.success) {
          toast.success(t("banSuccess"));
          setBanConfirmOpen(false);
          onUserUpdated();
          onOpenChange(false);
        } else {
          toast.error(result.error ?? t("errorGeneric"));
        }
      }
    } catch {
      toast.error(t("errorGeneric"));
    } finally {
      setBanChanging(false);
    }
  }

  async function handlePasswordReset() {
    if (!user) return;
    setResetSending(true);
    try {
      const { sendPasswordReset } = await import("@/lib/admin/actions");
      const result = await sendPasswordReset(user.email);
      if (result.success) {
        toast.success(t("passwordResetSuccess"));
        setResetConfirmOpen(false);
      } else {
        toast.error(result.error ?? t("errorGeneric"));
      }
    } catch {
      toast.error(t("errorGeneric"));
    } finally {
      setResetSending(false);
    }
  }

  if (!user) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-lg"
        >
          <SheetHeader className="mb-6">
            <SheetTitle>{t("userDetail")}</SheetTitle>
            <SheetDescription className="sr-only">
              {t("userDetailDescription")}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6">
            {/* User Profile Section */}
            <div className="flex items-start gap-4">
              <Avatar className="h-14 w-14">
                {user.avatarUrl && (
                  <AvatarImage
                    src={user.avatarUrl}
                    alt={user.displayName ?? ""}
                  />
                )}
                <AvatarFallback className="text-lg">
                  {getInitials(user.displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-lg font-semibold text-foreground">
                  {user.displayName ?? t("noName")}
                </h3>
                <p className="truncate text-sm text-muted-foreground">
                  {user.email}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {user.role ? (
                    <Badge
                      variant={
                        user.role === "TRAINER" ? "primary" : "secondary"
                      }
                      size="sm"
                    >
                      {user.role === "TRAINER"
                        ? t("roleTrainer")
                        : t("roleAthlete")}
                    </Badge>
                  ) : (
                    <Badge variant="gray" size="sm">
                      {t("noRole")}
                    </Badge>
                  )}
                  <Badge
                    variant={user.isBanned ? "error" : "success"}
                    size="sm"
                  >
                    {user.isBanned ? t("statusBanned") : t("statusActive")}
                  </Badge>
                  {user.isPlatformAdmin && (
                    <Badge variant="info" size="sm">
                      {t("platformAdmin")}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {t("columnRegistered")}
                </p>
                <p className="mt-0.5 text-sm text-foreground">
                  {formatDate(user.createdAt, locale)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {t("columnLastLogin")}
                </p>
                <p className="mt-0.5 text-sm text-foreground">
                  {formatRelativeTime(user.lastSignInAt, locale, t("never"))}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {t("onboarding")}
                </p>
                <p className="mt-0.5 text-sm text-foreground">
                  {user.onboardingCompleted
                    ? t("onboardingCompleted")
                    : t("onboardingPending")}
                </p>
              </div>
            </div>

            {/* Stats */}
            {stats && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-50 dark:bg-primary/20">
                      <Users className="h-4 w-4 text-primary-700 dark:text-primary-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {stats.athleteConnections}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("athleteConnections")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary-50 dark:bg-secondary/20">
                      <UsersRound className="h-4 w-4 text-secondary-700 dark:text-secondary-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {stats.teamMemberships}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("teamMemberships")}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {statsLoading && (
              <>
                <Separator />
                <p className="text-sm text-muted-foreground">
                  {tCommon("loading")}
                </p>
              </>
            )}

            <Separator />

            {/* Actions Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground">
                {t("actions")}
              </h4>

              {/* Role Change */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("changeRoleLabel")}
                </p>
                <div className="flex items-center gap-2">
                  <Select
                    value={newRole}
                    onValueChange={(v) =>
                      setNewRole(v as "TRAINER" | "ATHLETE")
                    }
                    disabled={isSelf}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRAINER">
                        {t("roleTrainer")}
                      </SelectItem>
                      <SelectItem value="ATHLETE">
                        {t("roleAthlete")}
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            size="sm"
                            disabled={isSelf || newRole === user.role}
                            onClick={() => setRoleConfirmOpen(true)}
                          >
                            {t("changeRole")}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {isSelf && (
                        <TooltipContent>
                          {t("cannotChangeOwnRole")}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              {/* Ban / Unban */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("accountStatusLabel")}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          variant={user.isBanned ? "default" : "destructive"}
                          size="sm"
                          disabled={isSelf}
                          onClick={() => setBanConfirmOpen(true)}
                          iconLeft={
                            user.isBanned ? (
                              <ShieldOff className="h-4 w-4" />
                            ) : (
                              <Shield className="h-4 w-4" />
                            )
                          }
                        >
                          {user.isBanned ? t("unbanUser") : t("banUser")}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {isSelf && (
                      <TooltipContent>
                        {t("cannotBanSelf")}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Password Reset */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("passwordResetLabel")}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setResetConfirmOpen(true)}
                  iconLeft={<KeyRound className="h-4 w-4" />}
                >
                  {t("sendPasswordReset")}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Role Change Confirmation */}
      <ConfirmDialog
        open={roleConfirmOpen}
        onOpenChange={setRoleConfirmOpen}
        variant="primary"
        title={t("roleConfirmTitle")}
        message={t("roleConfirmMessage", {
          name: user.displayName ?? user.email,
          oldRole:
            user.role === "TRAINER" ? t("roleTrainer") : t("roleAthlete"),
          newRole:
            newRole === "TRAINER" ? t("roleTrainer") : t("roleAthlete"),
        })}
        confirmLabel={t("changeRole")}
        cancelLabel={tCommon("cancel")}
        onConfirm={handleRoleChange}
        loading={roleChanging}
      />

      {/* Ban/Unban Confirmation */}
      <ConfirmDialog
        open={banConfirmOpen}
        onOpenChange={setBanConfirmOpen}
        variant="danger"
        title={user.isBanned ? t("unbanConfirmTitle") : t("banConfirmTitle")}
        message={
          user.isBanned
            ? t("unbanConfirmMessage", {
                name: user.displayName ?? user.email,
              })
            : t("banConfirmMessage", {
                name: user.displayName ?? user.email,
              })
        }
        confirmLabel={user.isBanned ? t("unbanUser") : t("banUser")}
        cancelLabel={tCommon("cancel")}
        onConfirm={handleBanToggle}
        loading={banChanging}
      />

      {/* Password Reset Confirmation */}
      <ConfirmDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        variant="primary"
        title={t("passwordResetConfirmTitle")}
        message={t("passwordResetConfirmMessage", { email: user.email })}
        confirmLabel={t("sendPasswordReset")}
        cancelLabel={tCommon("cancel")}
        onConfirm={handlePasswordReset}
        loading={resetSending}
      />
    </>
  );
}
