import {
  LayoutDashboard,
  Dumbbell,
  Activity,
  Users,
  User,
  Shield,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/lib/auth-user";

export interface NavItem {
  /** Key into messages.nav namespace */
  labelKey: string;
  icon: LucideIcon;
  path: string;
  /** If set, only these roles see this item. Undefined = all roles. */
  allowedRoles?: UserRole[];
  /** If true, only users with is_platform_admin = true see this item. */
  requiresPlatformAdmin?: boolean;
}

export interface NavSection {
  /** Key into messages.nav namespace */
  labelKey: string;
  icon: LucideIcon;
  /** Base path used for auto-expand detection */
  basePath?: string;
  items: NavItem[];
  /** If set, only these roles see this section. */
  allowedRoles?: UserRole[];
  /** If true, only users with is_platform_admin = true see this section. */
  requiresPlatformAdmin?: boolean;
}

export type NavEntry =
  | { type: "item"; item: NavItem }
  | { type: "section"; section: NavSection };

/**
 * Full navigation configuration.
 *
 * Current structure (flat top-level only — subcategories added per feature):
 *   TRAINER:   Dashboard · Training · Feedback/Monitoring · Organisation · [Admin] · Account · Settings
 *   ATHLETE:   Dashboard · Training · Feedback/Monitoring · Account · Settings
 *
 * Role filtering happens at render time in NavMain.
 */
export const navConfig: NavEntry[] = [
  {
    type: "item",
    item: {
      labelKey: "dashboard",
      icon: LayoutDashboard,
      path: "/dashboard",
    },
  },
  {
    type: "item",
    item: {
      labelKey: "training",
      icon: Dumbbell,
      path: "/training",
      allowedRoles: ["TRAINER"],
    },
  },
  {
    type: "item",
    item: {
      labelKey: "feedbackMonitoring",
      icon: Activity,
      path: "/feedback",
    },
  },
  {
    type: "item",
    item: {
      labelKey: "organisation",
      icon: Users,
      path: "/organisation",
      allowedRoles: ["TRAINER"],
    },
  },
  {
    type: "item",
    item: {
      labelKey: "admin",
      icon: Shield,
      path: "/admin",
      requiresPlatformAdmin: true,
    },
  },
  {
    type: "item",
    item: {
      labelKey: "myAccount",
      icon: User,
      path: "/account",
    },
  },
];
