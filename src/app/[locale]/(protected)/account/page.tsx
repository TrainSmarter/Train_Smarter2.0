"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { User, Shield, Loader2 } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { toAuthUser, type AuthUser } from "@/lib/auth-user";
import type { TrainerInfo } from "@/lib/athletes/types";

import { ProfileSection } from "@/components/account/profile-section";
import { LanguageSection } from "@/components/account/language-section";
import { AppearanceSection } from "@/components/account/appearance-section";
import { NotificationsSection } from "@/components/account/notifications-section";

// Lazy-load the privacy tab (it's a large component)
const PrivacyTabContent = React.lazy(
  () => import("@/components/account/privacy-tab-content")
);

export default function AccountPage() {
  return (
    <React.Suspense fallback={null}>
      <AccountPageInner />
    </React.Suspense>
  );
}

function AccountPageInner() {
  const t = useTranslations("account");
  const searchParams = useSearchParams();

  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [trainerInfo, setTrainerInfo] = React.useState<TrainerInfo | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Determine initial tab from URL hash
  const [activeTab, setActiveTab] = React.useState(() => {
    if (typeof window !== "undefined") {
      return window.location.hash === "#datenschutz" ? "privacy" : "general";
    }
    return "general";
  });

  // Also check for tab query param (for redirects)
  React.useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "datenschutz" || tab === "privacy") {
      setActiveTab("privacy");
    }
  }, [searchParams]);

  // Update hash when tab changes
  React.useEffect(() => {
    if (activeTab === "privacy") {
      window.history.replaceState(null, "", "#datenschutz");
    } else {
      // Remove hash without page reload
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [activeTab]);

  React.useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();
        const {
          data: { user: supabaseUser },
        } = await supabase.auth.getUser();

        if (!supabaseUser) {
          setError(t("errorLoading"));
          return;
        }

        setUser(toAuthUser(supabaseUser));

        // Fetch trainer info if athlete
        const roles = (supabaseUser.app_metadata?.roles as string[]) ?? [];
        if (roles.includes("ATHLETE")) {
          const { data: connections } = await supabase
            .from("trainer_athlete_connections")
            .select(
              "id, trainer_id, status, created_at, profiles!trainer_athlete_connections_trainer_id_fkey(first_name, last_name, avatar_url)"
            )
            .eq("athlete_id", supabaseUser.id)
            .eq("status", "active")
            .limit(1)
            .single();

          if (connections) {
            const profile = connections.profiles as unknown as {
              first_name: string;
              last_name: string;
              avatar_url: string | null;
            } | null;

            if (profile) {
              setTrainerInfo({
                id: connections.trainer_id,
                connectionId: connections.id,
                firstName: profile.first_name,
                lastName: profile.last_name,
                email: "",
                avatarUrl: profile.avatar_url ?? null,
                connectedAt: connections.created_at,
                status: "active",
              });
            }
          }
        }
      } catch {
        setError(t("errorLoading"));
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [t]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-80" />
        </div>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center space-y-4">
          <p className="text-body text-muted-foreground">
            {error ?? t("errorLoading")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 text-foreground">{t("title")}</h1>
        <p className="mt-1 text-body-lg text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {t("tabGeneral")}
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {t("tabPrivacy")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6 space-y-6">
          <ProfileSection user={user} trainerInfo={trainerInfo} />
          <LanguageSection />
          <AppearanceSection />
          <NotificationsSection />
        </TabsContent>

        <TabsContent value="privacy" className="mt-6">
          <React.Suspense
            fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            }
          >
            <PrivacyTabContent />
          </React.Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
