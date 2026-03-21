import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toAuthUser } from "@/lib/auth-user";
import {
  getExerciseById,
  getExercises,
  getTaxonomy,
} from "@/lib/exercises/queries";
import { ExerciseDetailPage } from "@/components/exercises/exercise-detail-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "exercises" });

  const exercise = await getExerciseById(id);
  if (!exercise) {
    return { title: t("exerciseNotFound") };
  }

  return {
    title: exercise.name[locale as "de" | "en"],
  };
}

export default async function ExerciseDetailRoute({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;

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

  const [exercise, allExercises, muscleGroups, equipment] = await Promise.all([
    getExerciseById(id),
    getExercises(),
    getTaxonomy("muscle_group"),
    getTaxonomy("equipment"),
  ]);

  if (!exercise) {
    notFound();
  }

  return (
    <ExerciseDetailPage
      exercise={exercise}
      muscleGroups={muscleGroups}
      equipment={equipment}
      allExercises={allExercises}
    />
  );
}
