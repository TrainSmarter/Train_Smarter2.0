import { cookies } from "next/headers";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { SessionManager } from "@/components/session-manager";
import { createClient } from "@/lib/supabase/server";
import { toAuthUser } from "@/lib/auth-user";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sidebarState = cookieStore.get("sidebar_state")?.value;
  // Default to open if no cookie is set
  const defaultOpen = sidebarState !== "false";

  // Fetch real user from Supabase (middleware already guarantees auth)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const authUser = user ? toAuthUser(user) : null;

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <SessionManager />
      <AppSidebar user={authUser} />
      <SidebarInset>
        <AppHeader />
        <div className="flex-1 p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
