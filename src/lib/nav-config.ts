import {
  LayoutDashboard,
  Dumbbell,
  Activity,
  Users,
  User,
  Shield,
  Library,
  UsersRound,
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
    type: "section",
    section: {
      labelKey: "training",
      icon: Dumbbell,
      basePath: "/training",
      allowedRoles: ["TRAINER"],
      items: [
        {
          labelKey: "trainingExercises",
          icon: Library,
          path: "/training/exercises",
        },
      ],
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
    type: "section",
    section: {
      labelKey: "admin",
      icon: Shield,
      basePath: "/admin",
      requiresPlatformAdmin: true,
      items: [
        {
          labelKey: "adminUsers",
          icon: UsersRound,
          path: "/admin/users",
        },
      ],
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
