"use client";

import { usePathname, Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { navConfig, type NavEntry, type NavItem, type NavSection } from "@/lib/nav-config";
import type { UserRole } from "@/lib/mock-session";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface NavMainProps {
  /** Primary role of the user. undefined = no role yet (mid-onboarding). */
  role: UserRole | undefined;
  isPlatformAdmin?: boolean;
}

function isAllowed(
  allowedRoles: UserRole[] | undefined,
  requiresPlatformAdmin: boolean | undefined,
  role: UserRole | undefined,
  isPlatformAdmin: boolean
): boolean {
  if (requiresPlatformAdmin && !isPlatformAdmin) return false;
  if (!allowedRoles) return true;
  if (role === undefined) return false;
  return allowedRoles.includes(role);
}

function NavItemLink({
  item,
  pathname,
  t,
}: {
  item: NavItem;
  pathname: string;
  t: (key: string) => string;
}) {
  const isActive = pathname === item.path || pathname.startsWith(item.path + "/");
  const Icon = item.icon;
  const label = t(item.labelKey);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={label}
        className={cn(
          isActive &&
            "data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
        )}
      >
        <Link href={item.path as "/"} aria-current={isActive ? "page" : undefined}>
          <Icon className="size-4 shrink-0" />
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function NavSectionGroup({
  section,
  pathname,
  role,
  isPlatformAdmin,
  t,
}: {
  section: NavSection;
  pathname: string;
  role: UserRole | undefined;
  isPlatformAdmin: boolean;
  t: (key: string) => string;
}) {
  const Icon = section.icon;
  const isExpanded = section.basePath ? pathname.startsWith(section.basePath) : false;
  const label = t(section.labelKey);

  const visibleItems = section.items.filter((item) =>
    isAllowed(item.allowedRoles, item.requiresPlatformAdmin, role, isPlatformAdmin)
  );

  if (visibleItems.length === 0) return null;

  return (
    <Collapsible defaultOpen={isExpanded} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={label}>
            <Icon className="size-4 shrink-0" />
            <span>{label}</span>
            <ChevronRight className="ml-auto size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {visibleItems.map((subItem) => {
              const isActive = pathname === subItem.path;
              return (
                <SidebarMenuSubItem key={subItem.path}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={isActive}
                    className={cn(
                      isActive &&
                        "data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
                    )}
                  >
                    <Link href={subItem.path as "/"} aria-current={isActive ? "page" : undefined}>
                      <span>{t(subItem.labelKey)}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function NavMain({ role, isPlatformAdmin = false }: NavMainProps) {
  const pathname = usePathname();
  const tNav = useTranslations("nav");
  const tSidebar = useTranslations("sidebar");

  const visibleEntries = navConfig.filter((entry: NavEntry) => {
    if (entry.type === "item") {
      return isAllowed(entry.item.allowedRoles, entry.item.requiresPlatformAdmin, role, isPlatformAdmin);
    }
    return isAllowed(entry.section.allowedRoles, entry.section.requiresPlatformAdmin, role, isPlatformAdmin);
  });

  return (
    <nav aria-label={tSidebar("navigationAriaLabel")}>
    <SidebarGroup>
      <SidebarGroupLabel>{tSidebar("navigation")}</SidebarGroupLabel>
      <SidebarMenu>
        {visibleEntries.map((entry: NavEntry) => {
          if (entry.type === "item") {
            return (
              <NavItemLink
                key={entry.item.path}
                item={entry.item}
                pathname={pathname}
                t={tNav}
              />
            );
          }
          return (
            <NavSectionGroup
              key={entry.section.labelKey}
              section={entry.section}
              pathname={pathname}
              role={role}
              isPlatformAdmin={isPlatformAdmin}
              t={tNav}
            />
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
    </nav>
  );
}
