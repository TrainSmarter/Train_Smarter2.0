"use client";

import * as React from "react";
import { LogOut, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AuthUser } from "@/lib/auth-user";
import { getSafeAvatarUrl, getInitials } from "@/lib/utils";
import { clearSessionMarkers } from "@/lib/auth-utils";

interface SidebarFooterUserProps {
  user: AuthUser;
}

export function SidebarFooterUser({ user }: SidebarFooterUserProps) {
  const t = useTranslations("userMenu");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [showLogoutDialog, setShowLogoutDialog] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const { first_name, last_name, avatar_url } = user.user_metadata;
  const initials = getInitials(first_name ?? "", last_name ?? "");
  const safeAvatarUrl = getSafeAvatarUrl(avatar_url);
  const displayName = `${first_name} ${last_name}`.trim() || user.email;

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      clearSessionMarkers();

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch {
      setIsLoggingOut(false);
    }
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center gap-2">
            {/* Clickable avatar + name area -> navigates to /account */}
            <SidebarMenuButton
              size="lg"
              className="flex-1 min-w-0"
              onClick={() => router.push("/account")}
              tooltip={t("profile")}
            >
              <Avatar className="h-8 w-8 shrink-0 rounded-lg">
                {safeAvatarUrl && (
                  <AvatarImage src={safeAvatarUrl} alt={displayName} />
                )}
                <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold max-w-[120px]">
                  {displayName}
                </span>
                <span className="truncate text-xs text-sidebar-foreground/70 max-w-[120px]">
                  {user.email}
                </span>
              </div>
            </SidebarMenuButton>

            {/* Logout button - visible when sidebar is expanded */}
            {!isCollapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-sidebar-foreground/60 hover:text-destructive"
                    onClick={() => setShowLogoutDialog(true)}
                    aria-label={t("signOut")}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{t("signOut")}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </SidebarMenuItem>
      </SidebarMenu>

      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("logoutDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("logoutDialogMessage")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowLogoutDialog(false)}
              disabled={isLoggingOut}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("signOut")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
