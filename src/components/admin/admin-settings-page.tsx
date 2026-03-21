"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { Loader2, CheckCircle2, XCircle, Sparkles, AlertTriangle, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { setAiModelSetting, testAiModel, setRateLimitConfig, setExtendedThinkingSetting } from "@/lib/admin/settings-actions";
import { saveCustomPrompt } from "@/lib/ai/prompts";
import {
  DEFAULT_PROMPT_SUGGEST_ALL,
  DEFAULT_PROMPT_OPTIMIZE_FIELD,
} from "@/lib/ai/prompt-defaults";
import {
  AI_MODELS,
  getModelById,
  type AiProvider,
  type ApiKeyStatus,
  type AiExerciseSuggestion,
} from "@/lib/ai/providers";
import type { RateLimitPeriod, RateLimitConfig } from "@/lib/ai/usage-types";
import type { CustomPrompts } from "@/lib/ai/prompt-defaults";

// ── Types ─────────────────────────────────────────────────────────

interface AdminSettingsPageProps {
  currentModelId: string;
  apiKeyStatus: ApiKeyStatus;
  rateLimitConfig: RateLimitConfig;
  customPrompts: CustomPrompts;
  extendedThinking: boolean;
}

// ── Cost Badge Helper ──────────────────────────────────────────────

function CostBadge({ cost }: { cost: string }) {
  const variant =
    cost === "\u20ac"
      ? "success"
      : cost === "\u20ac\u20ac"
        ? "warning"
        : "error"; // €€€ and €€€€ both use error (red)
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
  rateLimitConfig: initialRateLimitConfig,
  customPrompts: initialCustomPrompts,
  extendedThinking: initialExtendedThinking,
}: AdminSettingsPageProps) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const locale = useLocale() as "de" | "en";
  const getProviderLabel = useProviderLabel();

  // Model selection state
  const [selectedModelId, setSelectedModelId] = React.useState(currentModelId);
  const [thinkingEnabled, setThinkingEnabled] = React.useState(initialExtendedThinking);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSavingThinking, setIsSavingThinking] = React.useState(false);

  // Test state
  const [testName, setTestName] = React.useState("Bankdrücken");
  const [isTesting, setIsTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<AiExerciseSuggestion | null>(null);
  const [testError, setTestError] = React.useState<string | null>(null);

  // Rate limit state
  const [ratePeriod, setRatePeriod] = React.useState<RateLimitPeriod>(initialRateLimitConfig.period);
  const [rateCount, setRateCount] = React.useState(initialRateLimitConfig.maxCount);
  const [isSavingRate, setIsSavingRate] = React.useState(false);

  // Prompt editor state
  const [promptSuggestAll, setPromptSuggestAll] = React.useState(
    initialCustomPrompts.suggestAll ?? ""
  );
  const [promptOptimizeField, setPromptOptimizeField] = React.useState(
    initialCustomPrompts.optimizeField ?? ""
  );
  const [isSavingPromptAll, setIsSavingPromptAll] = React.useState(false);
  const [isSavingPromptField, setIsSavingPromptField] = React.useState(false);

  // Derived: selected model info
  const selectedModel = getModelById(selectedModelId);
  const selectedProvider = selectedModel?.provider;
  const hasChanged = selectedModelId !== currentModelId;

  // Derived: does the selected model have a missing key?
  const selectedProviderKeyMissing =
    selectedProvider != null && !apiKeyStatus[selectedProvider];

  // Derived: does the selected model support extended thinking?
  const selectedModelSupportsThinking = selectedModel?.supportsThinking === true;

  // Derived: has rate limit changed from initial?
  const hasRateChanged =
    ratePeriod !== initialRateLimitConfig.period ||
    rateCount !== initialRateLimitConfig.maxCount;

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

  async function handleToggleThinking(enabled: boolean) {
    setIsSavingThinking(true);
    setThinkingEnabled(enabled);
    try {
      const result = await setExtendedThinkingSetting(enabled);
      if (result.success) {
        toast.success(t("extendedThinkingSaved"));
      } else {
        setThinkingEnabled(!enabled); // revert
        toast.error(t("errorGeneric"));
      }
    } catch {
      setThinkingEnabled(!enabled); // revert
      toast.error(t("errorGeneric"));
    } finally {
      setIsSavingThinking(false);
    }
  }

  async function handleSaveRateLimit() {
    setIsSavingRate(true);
    try {
      const result = await setRateLimitConfig(ratePeriod, rateCount);
      if (result.success) {
        toast.success(t("rateLimitSaved"));
      } else {
        toast.error(t("rateLimitSaveError"));
      }
    } catch {
      toast.error(t("rateLimitSaveError"));
    } finally {
      setIsSavingRate(false);
    }
  }

  async function handleSavePrompt(key: "suggest_all" | "optimize_field") {
    const content = key === "suggest_all" ? promptSuggestAll : promptOptimizeField;
    const setSaving = key === "suggest_all" ? setIsSavingPromptAll : setIsSavingPromptField;

    setSaving(true);
    try {
      const result = await saveCustomPrompt(key, content || null);
      if (result.success) {
        toast.success(t("promptSaved"));
      } else {
        toast.error(t("promptSaveError"));
      }
    } catch {
      toast.error(t("promptSaveError"));
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPrompt(key: "suggest_all" | "optimize_field") {
    const setSaving = key === "suggest_all" ? setIsSavingPromptAll : setIsSavingPromptField;
    const setPrompt = key === "suggest_all" ? setPromptSuggestAll : setPromptOptimizeField;

    setSaving(true);
    try {
      const result = await saveCustomPrompt(key, null);
      if (result.success) {
        setPrompt("");
        toast.success(t("promptReset"));
      } else {
        toast.error(t("promptSaveError"));
      }
    } catch {
      toast.error(t("promptSaveError"));
    } finally {
      setSaving(false);
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
        {/* Left Column: Model + API Keys + Rate Limit */}
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

              {/* Extended Thinking Toggle */}
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="extended-thinking" className="text-sm font-medium">
                    {t("extendedThinkingLabel")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("extendedThinkingDescription")}
                  </p>
                </div>
                <Switch
                  id="extended-thinking"
                  checked={thinkingEnabled}
                  onCheckedChange={handleToggleThinking}
                  disabled={isSavingThinking || !selectedModelSupportsThinking}
                  aria-label={t("extendedThinkingLabel")}
                />
              </div>
              {thinkingEnabled && !selectedModelSupportsThinking && (
                <p className="text-xs text-warning">
                  {t("extendedThinkingNotSupported")}
                </p>
              )}
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

          {/* Rate Limit Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t("rateLimitTitle")}</CardTitle>
              <CardDescription>{t("rateLimitDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="rate-period">{t("rateLimitPeriod")}</Label>
                  <Select
                    value={ratePeriod}
                    onValueChange={(v) => setRatePeriod(v as RateLimitPeriod)}
                  >
                    <SelectTrigger id="rate-period" aria-label={t("rateLimitPeriod")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">{t("rateLimitDay")}</SelectItem>
                      <SelectItem value="week">{t("rateLimitWeek")}</SelectItem>
                      <SelectItem value="month">{t("rateLimitMonth")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rate-count">{t("rateLimitCount")}</Label>
                  <Input
                    id="rate-count"
                    type="number"
                    min={0}
                    max={10000}
                    value={rateCount}
                    onChange={(e) => {
                      const val = Math.max(0, Math.min(10000, Math.floor(Number(e.target.value) || 0)));
                      setRateCount(val);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "-" || e.key === "e" || e.key === "E" || e.key === ".") {
                        e.preventDefault();
                      }
                    }}
                  />
                </div>
              </div>

              <Button
                onClick={handleSaveRateLimit}
                disabled={!hasRateChanged || isSavingRate}
              >
                {isSavingRate && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {tCommon("save")}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Test + Prompt Editor */}
        <div className="space-y-6">
          {/* Test Card */}
          <Card>
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

          {/* Prompt Editor Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t("promptEditorTitle")}</CardTitle>
              <CardDescription>{t("promptEditorDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {/* Suggest All Prompt */}
                <AccordionItem value="suggest-all">
                  <AccordionTrigger className="text-sm">
                    <div className="flex items-center gap-2">
                      {t("promptSuggestAllLabel")}
                      <Badge
                        variant={initialCustomPrompts.suggestAll ? "secondary" : "gray"}
                        size="sm"
                      >
                        {initialCustomPrompts.suggestAll
                          ? t("promptUsingCustom")
                          : t("promptUsingDefault")}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <Textarea
                      value={promptSuggestAll}
                      onChange={(e) => setPromptSuggestAll(e.target.value)}
                      rows={8}
                      placeholder={DEFAULT_PROMPT_SUGGEST_ALL}
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("promptVariablesHint")}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSavePrompt("suggest_all")}
                        disabled={isSavingPromptAll}
                      >
                        {isSavingPromptAll && (
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        )}
                        {tCommon("save")}
                      </Button>
                      {promptSuggestAll && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResetPrompt("suggest_all")}
                          disabled={isSavingPromptAll}
                        >
                          <RotateCcw className="mr-2 h-3.5 w-3.5" />
                          {t("promptResetToDefault")}
                        </Button>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Optimize Field Prompt */}
                <AccordionItem value="optimize-field">
                  <AccordionTrigger className="text-sm">
                    <div className="flex items-center gap-2">
                      {t("promptOptimizeFieldLabel")}
                      <Badge
                        variant={initialCustomPrompts.optimizeField ? "secondary" : "gray"}
                        size="sm"
                      >
                        {initialCustomPrompts.optimizeField
                          ? t("promptUsingCustom")
                          : t("promptUsingDefault")}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <Textarea
                      value={promptOptimizeField}
                      onChange={(e) => setPromptOptimizeField(e.target.value)}
                      rows={8}
                      placeholder={DEFAULT_PROMPT_OPTIMIZE_FIELD}
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("promptVariablesHint")}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSavePrompt("optimize_field")}
                        disabled={isSavingPromptField}
                      >
                        {isSavingPromptField && (
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        )}
                        {tCommon("save")}
                      </Button>
                      {promptOptimizeField && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResetPrompt("optimize_field")}
                          disabled={isSavingPromptField}
                        >
                          <RotateCcw className="mr-2 h-3.5 w-3.5" />
                          {t("promptResetToDefault")}
                        </Button>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
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
