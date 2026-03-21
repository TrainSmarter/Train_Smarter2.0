"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { Loader2, CheckCircle2, XCircle, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { setAiModelSetting, testAiModel } from "@/lib/admin/settings-actions";
import {
  AI_MODELS,
  getModelById,
  type AiProvider,
  type ApiKeyStatus,
  type AiExerciseSuggestion,
} from "@/lib/ai/providers";

// ── Types ─────────────────────────────────────────────────────────

interface AdminSettingsPageProps {
  currentModelId: string;
  apiKeyStatus: ApiKeyStatus;
}

// ── Cost Badge Helper ──────────────────────────────────────────────

function CostBadge({ cost }: { cost: string }) {
  const variant =
    cost === "\u20ac"
      ? "success"
      : cost === "\u20ac\u20ac"
        ? "warning"
        : "error";
  return (
    <Badge variant={variant} className="ml-2 text-xs">
      {cost}
    </Badge>
  );
}

// ── Provider Label Helper ──────────────────────────────────────────

function useProviderLabel() {
  const t = useTranslations("admin");
  return (provider: AiProvider) => {
    switch (provider) {
      case "anthropic":
        return t("providerAnthropic");
      case "openai":
        return t("providerOpenai");
      default:
        return provider;
    }
  };
}

// ── Main Component ────────────────────────────────────────────────

export function AdminSettingsPage({
  currentModelId,
  apiKeyStatus,
}: AdminSettingsPageProps) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const locale = useLocale() as "de" | "en";
  const getProviderLabel = useProviderLabel();

  // Model selection state
  const [selectedModelId, setSelectedModelId] = React.useState(currentModelId);
  const [isSaving, setIsSaving] = React.useState(false);

  // Test state
  const [testName, setTestName] = React.useState("Bankdrücken");
  const [isTesting, setIsTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<AiExerciseSuggestion | null>(null);
  const [testError, setTestError] = React.useState<string | null>(null);

  // Derived: selected model info
  const selectedModel = getModelById(selectedModelId);
  const selectedProvider = selectedModel?.provider;
  const hasChanged = selectedModelId !== currentModelId;

  // Derived: does the selected model have a missing key?
  const selectedProviderKeyMissing =
    selectedProvider != null && !apiKeyStatus[selectedProvider];

  // Group models by provider
  const anthropicModels = AI_MODELS.filter((m) => m.provider === "anthropic");
  const openaiModels = AI_MODELS.filter((m) => m.provider === "openai");

  // ── Handlers ────────────────────────────────────────────────────

  async function handleSave() {
    setIsSaving(true);
    try {
      const result = await setAiModelSetting(selectedModelId);
      if (result.success) {
        toast.success(t("aiModelSaved"));
      } else {
        toast.error(t("errorGeneric"));
      }
    } catch {
      toast.error(t("errorGeneric"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTest() {
    setIsTesting(true);
    setTestResult(null);
    setTestError(null);

    try {
      const result = await testAiModel(selectedModelId, testName);
      if (result.success && result.data) {
        setTestResult(result.data);
      } else {
        setTestError(result.error ?? "UNKNOWN_ERROR");
      }
    } catch {
      setTestError("UNKNOWN_ERROR");
    } finally {
      setIsTesting(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-h1 text-foreground">{t("settingsTitle")}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Model + API Keys */}
        <div className="space-y-6">
          {/* AI Model Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-secondary" />
                {t("aiModelTitle")}
              </CardTitle>
              <CardDescription>{t("aiModelDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ai-model">{t("aiModelLabel")}</Label>
                <Select
                  value={selectedModelId}
                  onValueChange={setSelectedModelId}
                >
                  <SelectTrigger id="ai-model" aria-label={t("aiModelLabel")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>{getProviderLabel("anthropic")}</SelectLabel>
                      {anthropicModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <span className="flex items-center">
                            {model.displayName}
                            <CostBadge cost={model.cost} />
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>{getProviderLabel("openai")}</SelectLabel>
                      {openaiModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <span className="flex items-center">
                            {model.displayName}
                            <CostBadge cost={model.cost} />
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* Warning if key is missing */}
              {selectedProviderKeyMissing && selectedProvider && (
                <div className="flex items-start gap-2 rounded-md border border-warning/50 bg-warning/10 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  <p className="text-sm text-warning-foreground">
                    {t("keyMissing", { provider: getProviderLabel(selectedProvider) })}
                  </p>
                </div>
              )}

              <Button
                onClick={handleSave}
                disabled={!hasChanged || isSaving || selectedProviderKeyMissing}
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {tCommon("save")}
              </Button>
            </CardContent>
          </Card>

          {/* API Key Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t("apiKeyStatus")}</CardTitle>
              <CardDescription>{t("apiKeyStatusDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(["anthropic", "openai"] as AiProvider[]).map((provider) => {
                  const isAvailable = apiKeyStatus[provider];
                  return (
                    <div
                      key={provider}
                      className="flex items-center justify-between rounded-md border px-4 py-3"
                    >
                      <span className="text-sm font-medium">
                        {getProviderLabel(provider)}
                      </span>
                      <div className="flex items-center gap-2">
                        {isAvailable ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-success" />
                            <span className="text-sm text-success">
                              {t("keyConfigured")}
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-error" />
                            <span className="text-sm text-error">
                              {t("keyNotConfigured")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Test */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-secondary" />
              {t("testTitle")}
            </CardTitle>
            <CardDescription>{t("testDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Test Input */}
            <div className="space-y-1.5">
              <Label htmlFor="test-exercise-name">{t("testExerciseName")}</Label>
              <Input
                id="test-exercise-name"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="Bankdrücken"
              />
            </div>

            <Button
              onClick={handleTest}
              disabled={isTesting || !testName.trim() || selectedProviderKeyMissing}
              variant="secondary"
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("testRunning")}
                </>
              ) : (
                t("testButton")
              )}
            </Button>

            {/* Test Error */}
            {testError && (
              <div className="flex items-start gap-2 rounded-md border border-error/50 bg-error/10 p-3">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-error" />
                <div>
                  <p className="text-sm font-medium text-error">
                    {t("testError")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {testError}
                  </p>
                </div>
              </div>
            )}

            {/* Test Result */}
            {testResult && (
              <div className="space-y-3">
                <Separator />
                <h3 className="text-sm font-semibold text-foreground">
                  {t("testResult")}
                </h3>

                <TestResultField label={t("testExerciseName")} value={testResult.nameTranslation} />
                <TestResultField label={t("testExerciseType")} value={testResult.exerciseType} />
                <TestResultField label={t("testDescription_de")} value={testResult.descriptionDe} />
                <TestResultField label={t("testDescription_en")} value={testResult.descriptionEn} />
                <TestResultField
                  label={t("testPrimaryMuscles")}
                  value={
                    testResult.primaryMuscleGroupIds.length > 0
                      ? testResult.primaryMuscleGroupIds.join(", ")
                      : "—"
                  }
                />
                <TestResultField
                  label={t("testSecondaryMuscles")}
                  value={
                    testResult.secondaryMuscleGroupIds.length > 0
                      ? testResult.secondaryMuscleGroupIds.join(", ")
                      : "—"
                  }
                />
                <TestResultField
                  label={t("testEquipment")}
                  value={
                    testResult.equipmentIds.length > 0
                      ? testResult.equipmentIds.join(", ")
                      : "—"
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Subcomponent: Test Result Field ────────────────────────────────

function TestResultField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground whitespace-pre-wrap">{value}</p>
    </div>
  );
}
