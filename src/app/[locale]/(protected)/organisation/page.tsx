import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { UnifiedOrganisationView } from "@/components/unified-organisation-view";
import { fetchAllAthletes } from "@/lib/athletes/queries";
import { fetchTeams, fetchAllTeamAthletes } from "@/lib/teams/queries";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nav" });
  return {
    title: `${t("organisation")} — Train Smarter`,
  };
}

export default async function OrganisationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Role check: only trainers can access the organisation page
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const roles = (user?.app_metadata?.roles as string[]) ?? [];
  if (!roles.includes("TRAINER")) {
    redirect(`/${locale}/dashboard`);
  }

  const [athletes, teams, teamAthleteMap] = await Promise.all([
    fetchAllAthletes(),
    fetchTeams(),
    fetchAllTeamAthletes(),
  ]);

  return (
    <UnifiedOrganisationView
      athletes={athletes}
      teams={teams}
      initialTeamAthleteMap={teamAthleteMap}
    />
  );
}
