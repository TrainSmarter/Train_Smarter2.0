import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toAuthUser } from "@/lib/auth-user";
import { getExercises, getTaxonomy } from "@/lib/exercises/queries";
import { ExerciseLibraryPage } from "@/components/exercises/exercise-library-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "exercises" });
  return {
    title: t("title"),
  };
}

export default async function ExercisesPage() {
  // Role guard: only trainers and platform admins may access
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const authUser = toAuthUser(user);
  const role = authUser.app_metadata.roles[0];

  if (role !== "TRAINER" && !authUser.app_metadata.is_platform_admin) {
    redirect("/dashboard");
  }

  const [exercises, muscleGroups, equipment] = await Promise.all([
    getExercises(),
    getTaxonomy("muscle_group"),
    getTaxonomy("equipment"),
  ]);

  return (
    <ExerciseLibraryPage
      exercises={exercises}
      muscleGroups={muscleGroups}
      equipment={equipment}
    />
  );
}
