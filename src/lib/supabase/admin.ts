import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Shared Supabase admin client (service-role key).
 *
 * Use this for any server-side operation that needs to bypass RLS,
 * e.g. updating app_metadata, admin user management, health checks.
 *
 * NEVER expose this client or its key to the browser.
 */
export function createAdminClient() {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
