import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { toAuthUser } from "@/lib/auth-user";
import { TeamDetailView } from "@/components/team-detail-view";
import {
  fetchTeamDetail,
  fetchTeamMembers,
  fetchTeamAthletes,
  fetchTeamInvitations,
  fetchAssignableAthletes,
} from "@/lib/teams/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const team = await fetchTeamDetail(id);
  if (!team) {
    const t = await getTranslations({ locale, namespace: "teams" });
    return { title: `${t("title")} — Train Smarter` };
  }
  return { title: `${team.name} — Train Smarter` };
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();
  const authUser = toAuthUser(user);

  const [team, members, athletes, invitations, assignableAthletes] =
    await Promise.all([
      fetchTeamDetail(id),
      fetchTeamMembers(id),
      fetchTeamAthletes(id),
      fetchTeamInvitations(id),
      fetchAssignableAthletes(id),
    ]);

  if (!team || team.archivedAt) {
    notFound();
  }

  return (
    <TeamDetailView
      team={team}
      members={members}
      athletes={athletes}
      invitations={invitations}
      assignableAthletes={assignableAthletes}
      currentUserId={authUser.id}
    />
  );
}
