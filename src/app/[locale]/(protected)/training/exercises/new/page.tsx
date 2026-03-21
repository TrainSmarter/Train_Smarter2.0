import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toAuthUser } from "@/lib/auth-user";
import { getExercises, getTaxonomy } from "@/lib/exercises/queries";
import { ExerciseDetailPage } from "@/components/exercises/exercise-detail-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "exercises" });
  return {
    title: t("createExercise"),
  };
}

export default async function NewExercisePage() {
  // Role guard
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

  const [allExercises, muscleGroups, equipment] = await Promise.all([
    getExercises(),
    getTaxonomy("muscle_group"),
    getTaxonomy("equipment"),
  ]);

  return (
    <ExerciseDetailPage
      exercise={null}
      muscleGroups={muscleGroups}
      equipment={equipment}
      allExercises={allExercises}
    />
  );
}
