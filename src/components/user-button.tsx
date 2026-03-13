"use client";

import React from "react";
import { ChevronsUpDown, LogOut, Monitor, Moon, Settings, Sun, User } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import type { AuthUser } from "@/lib/mock-session";

interface UserButtonProps {
  user: AuthUser;
}

function getInitials(firstName: string, lastName: string): string {
  const a = firstName.charAt(0) ?? "";
  const b = lastName.charAt(0) ?? "";
  const initials = `${a}${b}`.toUpperCase();
  return initials || "?";
}

/** Only allow https: URLs to prevent javascript:/data: injection from client-writable user_metadata */
function getSafeAvatarUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? url : undefined;
  } catch {
    return undefined;
  }
}

export function UserButton({ user }: UserButtonProps) {
  const { isMobile } = useSidebar();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const t = useTranslations("userMenu");
  const router = useRouter();
  const pathname = usePathname();
  const { first_name, last_name, avatar_url } = user.user_metadata;
  const initials = getInitials(first_name ?? "", last_name ?? "");
  const safeAvatarUrl = getSafeAvatarUrl(avatar_url);
  const displayName = `${first_name} ${last_name}`.trim() || user.email;

  function switchLocale(locale: "de" | "en") {
    router.replace(pathname, { locale });
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                {safeAvatarUrl && <AvatarImage src={safeAvatarUrl} alt={displayName} />}
                <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold max-w-[120px]">{displayName}</span>
                <span className="truncate text-xs text-sidebar-foreground/70 max-w-[120px]">
                  {user.email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  {safeAvatarUrl && <AvatarImage src={safeAvatarUrl} alt={displayName} />}
                  <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-xs font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{displayName}</span>
                  <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push("/profile")}>
                <User className="mr-2 size-4" />
                {t("profile")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/account/settings")}>
                <Settings className="mr-2 size-4" />
                {t("settings")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {/* Language selector */}
            {mounted && (
              <div className="px-2 py-1.5">
                <p className="mb-1.5 text-xs text-muted-foreground">{t("language")}</p>
                <div className="flex gap-1">
                  {(
                    [
                      { value: "de" as const, label: t("german") },
                      { value: "en" as const, label: t("english") },
                    ]
                  ).map(({ value, label }) => (
                    <Button
                      key={value}
                      variant="ghost"
                      size="sm"
                      className="h-7 flex-1 gap-1 px-2 text-xs"
                      onClick={(e) => {
                        e.preventDefault();
                        switchLocale(value);
                      }}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <DropdownMenuSeparator />
            {/* Theme selector */}
            {mounted && (
              <div className="px-2 py-1.5">
                <p className="mb-1.5 text-xs text-muted-foreground">{t("appearance")}</p>
                <div className="flex gap-1">
                  {(
                    [
                      { value: "light", icon: Sun, label: t("light") },
                      { value: "dark", icon: Moon, label: t("dark") },
                      { value: "system", icon: Monitor, label: t("system") },
                    ] as const
                  ).map(({ value, icon: Icon, label }) => (
                    <Button
                      key={value}
                      variant={theme === value ? "default" : "ghost"}
                      size="sm"
                      className="h-7 flex-1 gap-1 px-2 text-xs"
                      onClick={(e) => {
                        e.preventDefault();
                        setTheme(value);
                      }}
                    >
                      <Icon className="size-3" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                const { createClient } = await import("@/lib/supabase/client");
                const supabase = createClient();
                await supabase.auth.signOut();
                router.replace("/login");
              }}
            >
              <LogOut className="mr-2 size-4" />
              {t("signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
