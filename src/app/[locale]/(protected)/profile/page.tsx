import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { toAuthUser } from "@/lib/mock-session";
import { fetchMyTrainer } from "@/lib/athletes/queries";
import { ProfileView } from "@/components/profile-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "profile" });
  return {
    title: `${t("title")} — Train Smarter`,
  };
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const authUser = toAuthUser(user);
  const role = authUser.app_metadata.roles[0];

  // Only fetch trainer info if user is an athlete
  const trainerInfo = role === "ATHLETE" ? await fetchMyTrainer() : null;

  return (
    <ProfileView
      user={authUser}
      trainerInfo={trainerInfo}
    />
  );
}
