"use client";

import { Bell, Dumbbell } from "lucide-react";
import { useTranslations } from "next-intl";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

interface AppHeaderProps {
  pageTitle?: string;
}

export function AppHeader({ pageTitle = "Dashboard" }: AppHeaderProps) {
  const t = useTranslations("header");
  const tSidebar = useTranslations("sidebar");

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
      {/* Sidebar toggle — always visible (hamburger on mobile, collapse toggle on desktop) */}
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mx-2 h-4" />

      {/* Mobile-only: brand logo */}
      <div className="flex items-center gap-1.5 lg:hidden">
        <div className="flex aspect-square size-6 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary-700 text-primary-foreground">
          <Dumbbell className="size-3.5" />
        </div>
        <span className="font-semibold text-sm">{tSidebar("brand")}</span>
      </div>
      <Separator orientation="vertical" className="mx-2 h-4 lg:hidden" />

      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative notification-badge"
              aria-label={t("notifications")}
            >
              <Bell className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("notifications")}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
