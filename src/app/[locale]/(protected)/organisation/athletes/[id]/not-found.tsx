import { getTranslations } from "next-intl/server";
import { UserX } from "lucide-react";

import { EmptyState } from "@/components/empty-state";

export default async function AthleteNotFound() {
  const t = await getTranslations("athletes");

  return (
    <EmptyState
      className="mt-12"
      icon={<UserX className="h-12 w-12" />}
      title={t("notFoundTitle")}
      description={t("notFoundDescription")}
    />
  );
}
