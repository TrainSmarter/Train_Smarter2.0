import { getTranslations } from "next-intl/server";
import { Construction } from "lucide-react";

export default async function FeedbackPage() {
  const t = await getTranslations("common");
  const tNav = await getTranslations("nav");

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="text-center space-y-4">
        <Construction className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="text-heading-3 font-semibold">{tNav("feedbackMonitoring")}</h1>
        <p className="text-body text-muted-foreground max-w-md">
          {t("comingSoonDescription")}
        </p>
      </div>
    </div>
  );
}
