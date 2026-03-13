import { getTranslations } from "next-intl/server";
import { AthletesList } from "@/components/athletes-list";
import { fetchAthletes } from "@/lib/athletes/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "athletes" });
  return {
    title: `${t("title")} — Train Smarter`,
  };
}

export default async function AthletesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const resolvedParams = await searchParams;
  const page = Math.max(1, parseInt(resolvedParams.page ?? "1", 10) || 1);
  const { athletes, totalCount, hasMore } = await fetchAthletes(page);

  return (
    <div className="space-y-0">
      <AthletesList
        athletes={athletes}
        currentPage={page}
        totalCount={totalCount}
        hasMore={hasMore}
      />
    </div>
  );
}
