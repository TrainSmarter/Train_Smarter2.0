import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { toAuthUser } from "@/lib/auth-user";
import { fetchPendingInvitations } from "@/lib/athletes/queries";
import { fetchAthleteTeams } from "@/lib/teams/queries";
import { InvitationBanner } from "@/components/invitation-banner";
import { TeamOverviewCard } from "@/components/team-overview-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const authUser = user ? toAuthUser(user) : null;
  const isAthlete = authUser?.app_metadata.roles[0] === "ATHLETE";

  // BUG-2 fix: Fetch pending invitations for athletes
  const [pendingInvitations, athleteTeams] = await Promise.all([
    isAthlete ? fetchPendingInvitations() : Promise.resolve([]),
    isAthlete ? fetchAthleteTeams() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h1 text-foreground">{t("title")}</h1>
        <p className="text-body-lg text-muted-foreground mt-1">{t("welcome")}</p>
      </div>

      {/* Pending invitations for athletes */}
      {pendingInvitations.length > 0 && (
        <section aria-label={t("pendingInvitations")}>
          <h2 className="text-h4 text-foreground mb-3">{t("pendingInvitations")}</h2>
          <div className="space-y-3">
            {pendingInvitations.map((invitation) => (
              <InvitationBanner
                key={invitation.connectionId}
                invitation={invitation}
              />
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("activeAthletes")}</CardDescription>
            <CardTitle className="text-h1 text-primary">24</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-body-sm text-muted-foreground">{t("activeAthletesChange")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("runningPrograms")}</CardDescription>
            <CardTitle className="text-h1 text-violet-600 dark:text-violet-400">8</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-body-sm text-muted-foreground">{t("runningProgramsChange")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("compliance")}</CardDescription>
            <CardTitle className="text-h1 text-success">87%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-body-sm text-muted-foreground">{t("complianceChange")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("todaySessions")}</CardDescription>
            <CardTitle className="text-h1 text-foreground">12</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-body-sm text-muted-foreground">{t("todaySessionsChange")}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("nextSessions")}</CardTitle>
            <CardDescription>{t("nextSessionsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-body text-muted-foreground">{t("nextSessionsEmpty")}</p>
              <Badge variant="outline" className="mt-2">{t("nextSessionsComingSoon")}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("athleteActivity")}</CardTitle>
            <CardDescription>{t("athleteActivityDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-body text-muted-foreground">{t("athleteActivityEmpty")}</p>
              <Badge variant="outline" className="mt-2">{t("athleteActivityComingSoon")}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Athlete: Teams overview card (PROJ-9) */}
      {isAthlete && (
        <TeamOverviewCard teams={athleteTeams} />
      )}
    </div>
  );
}
