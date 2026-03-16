"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Server Action: Update the current user's profile.
 * Establishes the pattern for all future Server Actions in PROJ-5+.
 *
 * Pattern:
 * 1. Authenticate via server-side Supabase client
 * 2. Validate input (Zod or manual)
 * 3. Perform mutation
 * 4. Revalidate affected paths
 * 5. Return typed result { success, error }
 */
export async function updateProfile(data: {
  firstName: string;
  lastName: string;
  birthDate?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      first_name: data.firstName,
      last_name: data.lastName,
      birth_date: data.birthDate || null,
    })
    .eq("id", user.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Also update user_metadata for display in sidebar/header
  const { error: metaError } = await supabase.auth.updateUser({
    data: {
      first_name: data.firstName,
      last_name: data.lastName,
    },
  });

  if (metaError) {
    console.error("Failed to update user metadata:", metaError);
    // Non-fatal: profile data was already updated
  }

  revalidatePath("/", "layout");
  return { success: true };
}
