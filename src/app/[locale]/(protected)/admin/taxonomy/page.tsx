import { getTranslations } from "next-intl/server";
import { TaxonomyAdminPage } from "@/components/taxonomy/taxonomy-admin-page";
import { getAllTaxonomyData } from "@/lib/taxonomy/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "taxonomy" });
  return {
    title: t("pageTitle"),
  };
}

export default async function AdminTaxonomyRoute() {
  const taxonomyData = await getAllTaxonomyData();

  const dimensions = taxonomyData.map((d) => d.dimension);
  const nodes = taxonomyData.flatMap((d) => d.nodes);

  return <TaxonomyAdminPage dimensions={dimensions} nodes={nodes} />;
}
