import { getTranslations } from "next-intl/server";
import { AdminSettingsPage } from "@/components/admin/admin-settings-page";
import { getAiModelSetting, getApiKeyStatus } from "@/lib/admin/settings-actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return {
    title: t("settingsTitle"),
  };
}

export default async function AdminSettingsRoute() {
  let currentModelId: string;
  let keyStatus: { anthropic: boolean; openai: boolean };

  try {
    [currentModelId, keyStatus] = await Promise.all([
      getAiModelSetting(),
      getApiKeyStatus(),
    ]);
  } catch {
    // Backend not ready yet — provide defaults
    currentModelId = "claude-haiku-4-5-20251001";
    keyStatus = { anthropic: false, openai: false };
  }

  return (
    <AdminSettingsPage
      currentModelId={currentModelId}
      apiKeyStatus={keyStatus}
    />
  );
}
