import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { fetchAthleteDetail } from "@/lib/athletes/queries";
import { AthleteDetailView } from "@/components/athlete-detail-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "athletes" });
  const athlete = await fetchAthleteDetail(id);

  if (!athlete) {
    return { title: `${t("title")} — Train Smarter` };
  }

  return {
    title: `${athlete.firstName} ${athlete.lastName} — Train Smarter`,
  };
}

export default async function AthleteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const athlete = await fetchAthleteDetail(id);

  if (!athlete) {
    notFound();
  }

  return <AthleteDetailView athlete={athlete} />;
}
