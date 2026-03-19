"use client";

import React from "react";
import { Dumbbell, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarSeparator,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavMain } from "@/components/nav-main";
import { SidebarFooterUser } from "@/components/sidebar-footer-user";
import type { AuthUser } from "@/lib/auth-user";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: AuthUser | null;
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const role = user?.app_metadata.roles[0];
  const isPlatformAdmin = user?.app_metadata.is_platform_admin ?? false;
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const isMobile = useIsMobile();
  const t = useTranslations("sidebar");
  const tFooter = useTranslations("footer");

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              tooltip={t("brand")}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-700 text-primary-foreground">
                <Dumbbell className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{t("brand")}</span>
                <span className="truncate text-xs text-sidebar-foreground/70">
                  {t("version")}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain role={role} isPlatformAdmin={isPlatformAdmin} />
      </SidebarContent>

      <SidebarFooter>
        {/* Collapse/expand toggle — desktop only (mobile uses header hamburger) */}
        {!isMobile && (
          <>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={toggleSidebar}
                  tooltip={t("expand")}
                  className="text-sidebar-foreground/60 hover:text-sidebar-foreground"
                >
                  {isCollapsed ? (
                    <PanelLeftOpen className="size-4" />
                  ) : (
                    <PanelLeftClose className="size-4" />
                  )}
                  <span>{t("collapse")}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <SidebarSeparator />
          </>
        )}
        {/* Legal links */}
        {!isCollapsed && (
          <nav
            aria-label={t("legalLinks")}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 pb-2"
          >
            <Link
              href="/datenschutz"
              className="text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
            >
              {tFooter("privacy")}
            </Link>
            <Link
              href="/impressum"
              className="text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
            >
              {tFooter("imprint")}
            </Link>
            <Link
              href="/agb"
              className="text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
            >
              {tFooter("terms")}
            </Link>
          </nav>
        )}
        {user && <SidebarFooterUser user={user} />}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
