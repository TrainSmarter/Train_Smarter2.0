import { getTranslations } from "next-intl/server";
import { AdminSettingsPage } from "@/components/admin/admin-settings-page";
import {
  getAiModelSetting,
  getApiKeyStatus,
  getRateLimitConfigAdmin,
} from "@/lib/admin/settings-actions";
import { getCustomPrompts } from "@/lib/ai/prompts";

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
  let rateLimitConfig: { period: "day" | "week" | "month"; maxCount: number } = { period: "month", maxCount: 50 };
  let customPrompts = { suggestAll: null as string | null, optimizeField: null as string | null };

  try {
    const [modelId, keys, rateLimitResult, prompts] = await Promise.all([
      getAiModelSetting(),
      getApiKeyStatus(),
      getRateLimitConfigAdmin(),
      getCustomPrompts(),
    ]);

    currentModelId = modelId;
    keyStatus = keys;

    if (rateLimitResult.success && rateLimitResult.data) {
      rateLimitConfig = rateLimitResult.data;
    }

    customPrompts = prompts;
  } catch {
    // Backend not ready yet — provide defaults
    currentModelId = "claude-haiku-4-5-20251001";
    keyStatus = { anthropic: false, openai: false };
  }

  return (
    <AdminSettingsPage
      currentModelId={currentModelId}
      apiKeyStatus={keyStatus}
      rateLimitConfig={rateLimitConfig}
      customPrompts={customPrompts}
    />
  );
}
