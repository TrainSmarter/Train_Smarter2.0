import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toAuthUser } from "@/lib/auth-user";
import { getExercises, getTaxonomy } from "@/lib/exercises/queries";
import { ExerciseDetailPage } from "@/components/exercises/exercise-detail-page";
import { getAiUsageData } from "@/lib/ai/usage";

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

  // Check AI authorization: admin OR ai_enabled trainer
  const isAdmin = authUser.app_metadata.is_platform_admin;
  const aiEnabled = user.app_metadata?.ai_enabled === true;
  const showAiSuggest = isAdmin || aiEnabled;

  const [allExercises, muscleGroups, equipment, usageData] = await Promise.all([
    getExercises(),
    getTaxonomy("muscle_group"),
    getTaxonomy("equipment"),
    showAiSuggest ? getAiUsageData() : Promise.resolve(null),
  ]);

  return (
    <ExerciseDetailPage
      exercise={null}
      muscleGroups={muscleGroups}
      equipment={equipment}
      allExercises={allExercises}
      showAiSuggest={showAiSuggest}
      usageData={usageData}
      isPlatformAdmin={isAdmin === true}
    />
  );
}
