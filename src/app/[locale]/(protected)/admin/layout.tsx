import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin layout — PROJ-10
 *
 * Server-side guard: redirects non-admins to /dashboard.
 * Middleware already checks is_platform_admin for /admin/* routes,
 * but this is a defense-in-depth layer.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || user.app_metadata?.is_platform_admin !== true) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
