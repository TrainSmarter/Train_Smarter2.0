import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Construction } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { toAuthUser } from "@/lib/auth-user";
import { TrainingTabs } from "@/components/training/training-tabs";

export default async function TrainingPage() {
  const t = await getTranslations("common");
  const tNav = await getTranslations("nav");

  // Role guard: only trainers and platform admins
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

  return (
    <div className="space-y-6">
      <TrainingTabs />
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center space-y-4">
          <Construction className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="text-h3 font-semibold">{tNav("training")}</h1>
          <p className="text-body text-muted-foreground max-w-md">
            {t("comingSoonDescription")}
          </p>
        </div>
      </div>
    </div>
  );
}
