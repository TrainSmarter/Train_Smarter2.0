"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// ── Validation Schema ──────────────────────────────────────────
const profileSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

/**
 * Server Action: Update the current user's profile.
 * Establishes the pattern for all future Server Actions in PROJ-5+.
 *
 * Pattern:
 * 1. Authenticate via server-side Supabase client
 * 2. Validate input (Zod)
 * 3. Perform mutation
 * 4. Revalidate affected paths
 * 5. Return typed result { success, error }
 */
export async function updateProfile(data: {
  firstName: string;
  lastName: string;
  birthDate?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  // Validate input with Zod
  const parsed = profileSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "INVALID_INPUT" };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  const { firstName, lastName, birthDate } = parsed.data;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      birth_date: birthDate || null,
    })
    .eq("id", user.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Also update user_metadata for display in sidebar/header
  const { error: metaError } = await supabase.auth.updateUser({
    data: {
      first_name: firstName,
      last_name: lastName,
    },
  });

  if (metaError) {
    console.error("Failed to update user metadata:", metaError);
    // Non-fatal: profile data was already updated
  }

  revalidatePath("/", "layout");
  return { success: true };
}
