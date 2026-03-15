"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Shield,
  Download,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Mail,
  AlertTriangle,
} from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface ConsentRecord {
  consent_type: string;
  granted: boolean;
  granted_at: string;
  policy_version: string;
}

interface TrainerConnection {
  trainer_name: string;
  can_see_body_data: boolean;
  can_see_nutrition: boolean;
  can_see_calendar: boolean;
}

export default function PrivacySettingsPage() {
  const t = useTranslations("privacy");
  const tCommon = useTranslations("common");

  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [consents, setConsents] = React.useState<ConsentRecord[]>([]);
  const [userEmail, setUserEmail] = React.useState("");
  const [userCreatedAt, setUserCreatedAt] = React.useState("");
  const [trainerConnections, setTrainerConnections] = React.useState<TrainerConnection[]>([]);

  // Revoke dialog
  const [revokeType, setRevokeType] = React.useState<string | null>(null);
  const [isRevoking, setIsRevoking] = React.useState(false);

  // Export state
  const [isExporting, setIsExporting] = React.useState(false);

  // Delete dialog
  const [deleteStep, setDeleteStep] = React.useState<0 | 1 | 2>(0);
  const [deleteEmail, setDeleteEmail] = React.useState("");
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  // Load consents
  React.useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        setUserEmail(user.email ?? "");
        setUserCreatedAt(user.created_at ?? "");

        // Load latest consent per type
        const { data: consentData, error: consentError } = await supabase
          .from("user_consents")
          .select("consent_type, granted, granted_at, policy_version")
          .eq("user_id", user.id)
          .order("granted_at", { ascending: false });

        if (consentError) {
          console.error("Error loading consents:", consentError);
          setError(t("errorLoading"));
        } else if (consentData) {
          // Get latest consent per type
          const latestByType = new Map<string, ConsentRecord>();
          for (const c of consentData) {
            if (!latestByType.has(c.consent_type)) {
              latestByType.set(c.consent_type, c);
            }
          }
          setConsents(Array.from(latestByType.values()));
        }

        // Load trainer connections (for Trainer-Datenzugriff section)
        const { data: connections } = await supabase
          .from("trainer_athlete_connections")
          .select("trainer_id, can_see_body_data, can_see_nutrition, can_see_calendar, profiles!trainer_athlete_connections_trainer_id_fkey(first_name, last_name)")
          .eq("athlete_id", user.id)
          .eq("status", "active");

        if (connections) {
          setTrainerConnections(
            connections.map((c) => {
              const profile = c.profiles as unknown as { first_name: string; last_name: string } | null;
              return {
                trainer_name: profile
                  ? `${profile.first_name} ${profile.last_name}`.trim()
                  : "Trainer",
                can_see_body_data: c.can_see_body_data,
                can_see_nutrition: c.can_see_nutrition,
                can_see_calendar: c.can_see_calendar,
              };
            })
          );
        }
      } catch {
        setError(t("errorLoading"));
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [t]);

  function getConsent(type: string): ConsentRecord | undefined {
    return consents.find((c) => c.consent_type === type);
  }

  function isGranted(type: string): boolean {
    return getConsent(type)?.granted ?? false;
  }

  async function handleToggleConsent(type: string, currentlyGranted: boolean) {
    if (currentlyGranted) {
      // Show revoke confirmation dialog
      setRevokeType(type);
    } else {
      // Grant consent directly
      await updateConsent(type, true);
    }
  }

  async function updateConsent(type: string, granted: boolean) {
    setIsRevoking(true);
    try {
      const response = await fetch("/api/gdpr/consents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consent_type: type,
          granted,
          policy_version: "v1.0",
        }),
      });

      if (!response.ok) {
        toast.error(t("errorGeneric"));
        return;
      }

      // Update local state
      setConsents((prev) => {
        const updated = prev.filter((c) => c.consent_type !== type);
        updated.push({
          consent_type: type,
          granted,
          granted_at: new Date().toISOString(),
          policy_version: "v1.0",
        });
        return updated;
      });

      toast.success(granted ? t("consentGrantedSuccess") : t("consentRevoked"));
    } catch {
      toast.error(t("errorGeneric"));
    } finally {
      setIsRevoking(false);
      setRevokeType(null);
    }
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      const response = await fetch("/api/gdpr/export", {
        method: "POST",
      });

      if (response.status === 429) {
        const data = await response.json();
        toast.error(
          t("exportRateLimited", {
            date: data.lastExport ?? "?",
            nextDate: data.nextExport ?? "?",
          })
        );
        return;
      }

      if (!response.ok) {
        toast.error(t("exportError"));
        return;
      }

      // Trigger file download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        response.headers
          .get("Content-Disposition")
          ?.match(/filename="(.+)"/)?.[1] ??
        `train-smarter-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success(t("exportRequested"));
    } catch {
      toast.error(t("exportError"));
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDelete() {
    if (deleteEmail.toLowerCase() !== userEmail.toLowerCase()) {
      setDeleteError(t("deleteEmailMismatch"));
      return;
    }

    setDeleteError(null);
    setIsDeleting(true);

    try {
      const response = await fetch("/api/gdpr/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: deleteEmail }),
      });

      if (!response.ok) {
        toast.error(t("deleteError"));
        setIsDeleting(false);
        return;
      }

      toast.success(t("deleteSuccess"));
      setDeleteStep(0);

      // Sign out and redirect
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch {
      toast.error(t("deleteError"));
      setIsDeleting(false);
    }
  }

  function formatDate(dateStr: string): string {
    try {
      return new Intl.DateTimeFormat("de-AT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-h2 font-bold text-foreground">{t("title")}</h1>
        </div>
        <p className="text-body text-muted-foreground">{t("subtitle")}</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Consents Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-h3">{t("consentsTitle")}</CardTitle>
          <CardDescription>{t("consentsDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Terms & Privacy - Required, cannot be toggled */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-body font-medium text-foreground">
                  {t("consentTerms")}
                </span>
                <Badge variant="default" className="text-xs">
                  {t("consentRequired")}
                </Badge>
              </div>
              <p className="text-body-sm text-muted-foreground">
                {t("consentTermsDesc")}
              </p>
              {getConsent("terms_privacy") && (
                <p className="text-caption text-muted-foreground">
                  {t("consentGrantedAt", {
                    date: formatDate(
                      getConsent("terms_privacy")!.granted_at
                    ),
                  })}{" "}
                  &middot;{" "}
                  {t("consentPolicyVersion", {
                    version:
                      getConsent("terms_privacy")!.policy_version,
                  })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <span className="text-body-sm font-medium text-success">
                {t("consentGranted")}
              </span>
            </div>
          </div>

          {/* Body & Wellness Data - Optional */}
          <ConsentRow
            label={t("consentBodyData")}
            description={t("consentBodyDataDesc")}
            badge={t("consentOptional")}
            granted={isGranted("body_wellness_data")}
            consent={getConsent("body_wellness_data")}
            onToggle={() =>
              handleToggleConsent(
                "body_wellness_data",
                isGranted("body_wellness_data")
              )
            }
            formatDate={formatDate}
            t={t}
          />

          {/* Nutrition Data - Optional */}
          <ConsentRow
            label={t("consentNutrition")}
            description={t("consentNutritionDesc")}
            badge={t("consentOptional")}
            granted={isGranted("nutrition_data")}
            consent={getConsent("nutrition_data")}
            onToggle={() =>
              handleToggleConsent(
                "nutrition_data",
                isGranted("nutrition_data")
              )
            }
            formatDate={formatDate}
            t={t}
          />
        </CardContent>
      </Card>

      {/* Trainer Data Access */}
      {trainerConnections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-h3">
              {t("trainerAccessTitle")}
            </CardTitle>
            <CardDescription>{t("trainerAccessDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {trainerConnections.map((conn, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-2 rounded-lg border border-border p-4"
              >
                <span className="text-body font-medium text-foreground">
                  {conn.trainer_name}
                </span>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={conn.can_see_body_data ? "default" : "outline"}>
                    {conn.can_see_body_data ? (
                      <Eye className="mr-1.5 h-3 w-3" />
                    ) : (
                      <EyeOff className="mr-1.5 h-3 w-3" />
                    )}
                    {t("consentBodyData")}
                  </Badge>
                  <Badge variant={conn.can_see_nutrition ? "default" : "outline"}>
                    {conn.can_see_nutrition ? (
                      <Eye className="mr-1.5 h-3 w-3" />
                    ) : (
                      <EyeOff className="mr-1.5 h-3 w-3" />
                    )}
                    {t("consentNutrition")}
                  </Badge>
                  <Badge variant={conn.can_see_calendar ? "default" : "outline"}>
                    {conn.can_see_calendar ? (
                      <Eye className="mr-1.5 h-3 w-3" />
                    ) : (
                      <EyeOff className="mr-1.5 h-3 w-3" />
                    )}
                    {t("trainerCanSeeCalendar")}
                  </Badge>
                </div>
              </div>
            ))}
            <p className="text-body-sm text-muted-foreground">
              <Link
                href="/account/settings"
                className="text-primary hover:underline"
              >
                {t("manageConnections")}
              </Link>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Data stored overview - Art. 15 GDPR */}
      <Card>
        <CardHeader>
          <CardTitle className="text-h3">{t("dataStoredTitle")}</CardTitle>
          <CardDescription>{t("dataStoredDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("dataCategory")}</TableHead>
                  <TableHead>{t("dataPurpose")}</TableHead>
                  <TableHead>{t("dataSince")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">
                    {t("dataCatProfile")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {t("dataCatProfilePurpose")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {userCreatedAt ? formatDate(userCreatedAt) : "-"}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    {t("dataCatTraining")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {t("dataCatTrainingPurpose")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {userCreatedAt ? formatDate(userCreatedAt) : "-"}
                  </TableCell>
                </TableRow>
                {isGranted("body_wellness_data") && (
                  <TableRow>
                    <TableCell className="font-medium">
                      {t("dataCatBody")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {t("dataCatBodyPurpose")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {getConsent("body_wellness_data")
                        ? formatDate(
                            getConsent("body_wellness_data")!.granted_at
                          )
                        : "-"}
                    </TableCell>
                  </TableRow>
                )}
                {isGranted("nutrition_data") && (
                  <TableRow>
                    <TableCell className="font-medium">
                      {t("dataCatNutrition")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {t("dataCatNutritionPurpose")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {getConsent("nutrition_data")
                        ? formatDate(
                            getConsent("nutrition_data")!.granted_at
                          )
                        : "-"}
                    </TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell className="font-medium">
                    {t("dataCatConsents")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {t("dataCatConsentsPurpose")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {userCreatedAt ? formatDate(userCreatedAt) : "-"}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <p className="text-body-sm text-muted-foreground">
            {t("formalRequest")}{" "}
            <a
              href="mailto:datenschutz@train-smarter.at"
              className="text-primary hover:underline"
            >
              datenschutz@train-smarter.at
            </a>
          </p>
        </CardContent>
      </Card>

      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-h3">
            <Download className="h-5 w-5" />
            {t("exportTitle")}
          </CardTitle>
          <CardDescription>{t("exportDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            variant="outline"
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isExporting ? t("exportRequesting") : t("exportButton")}
          </Button>
        </CardContent>
      </Card>

      {/* Account Deletion */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-h3 text-destructive">
            <Trash2 className="h-5 w-5" />
            {t("deleteTitle")}
          </CardTitle>
          <CardDescription>{t("deleteDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setDeleteStep(1)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("deleteButton")}
          </Button>
        </CardContent>
      </Card>

      {/* Revoke Consent Dialog */}
      <Dialog
        open={revokeType !== null}
        onOpenChange={(open) => {
          if (!open) setRevokeType(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("revokeDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("revokeDialogMessage")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRevokeType(null)}
              disabled={isRevoking}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => revokeType && updateConsent(revokeType, false)}
              disabled={isRevoking}
            >
              {isRevoking && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("revokeDialogConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog - Step 1 */}
      <Dialog
        open={deleteStep === 1}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteStep(0);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {t("deleteStep1Title")}
            </DialogTitle>
            <DialogDescription>
              {t("deleteStep1Message")}
            </DialogDescription>
          </DialogHeader>

          <ul className="space-y-2 text-body-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              {t("deleteConsequence1")}
            </li>
            <li className="flex items-start gap-2">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              {t("deleteConsequence2")}
            </li>
            <li className="flex items-start gap-2">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              {t("deleteConsequence3")}
            </li>
            <li className="flex items-start gap-2">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              {t("deleteConsequence4")}
            </li>
            <li className="flex items-start gap-2">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              {t("deleteConsequence5")}
            </li>
            <li className="flex items-start gap-2">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              {t("deleteConsequence6")}
            </li>
          </ul>

          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription className="text-body-sm">
              {t("deleteGracePeriod")}
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteStep(0)}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => setDeleteStep(2)}
            >
              {t("deleteStep1Continue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog - Step 2 */}
      <Dialog
        open={deleteStep === 2}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteStep(0);
            setDeleteEmail("");
            setDeleteError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {t("deleteStep2Title")}
            </DialogTitle>
            <DialogDescription>
              {t("deleteStep2Message")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              type="email"
              value={deleteEmail}
              onChange={(e) => {
                setDeleteEmail(e.target.value);
                setDeleteError(null);
              }}
              placeholder={t("deleteEmailPlaceholder")}
              autoComplete="off"
              aria-label={t("deleteEmailPlaceholder")}
            />
            {deleteError && (
              <p className="text-body-sm text-destructive">{deleteError}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteStep(0);
                setDeleteEmail("");
                setDeleteError(null);
              }}
              disabled={isDeleting}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || !deleteEmail}
            >
              {isDeleting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isDeleting ? t("deleteDeleting") : t("deleteConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Consent Row                                                        */
/* ------------------------------------------------------------------ */

interface ConsentRowProps {
  label: string;
  description: string;
  badge: string;
  granted: boolean;
  consent: ConsentRecord | undefined;
  onToggle: () => void;
  formatDate: (s: string) => string;
  t: ReturnType<typeof useTranslations<"privacy">>;
}

function ConsentRow({
  label,
  description,
  badge,
  granted,
  consent,
  onToggle,
  formatDate,
  t,
}: ConsentRowProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-4">
      <div className="space-y-1 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-body font-medium text-foreground">
            {label}
          </span>
          <Badge variant="outline" className="text-xs">
            {badge}
          </Badge>
        </div>
        <p className="text-body-sm text-muted-foreground">{description}</p>
        {consent && (
          <p className="text-caption text-muted-foreground">
            {t("consentGrantedAt", { date: formatDate(consent.granted_at) })}{" "}
            &middot;{" "}
            {t("consentPolicyVersion", {
              version: consent.policy_version,
            })}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {granted ? (
          <CheckCircle2 className="h-5 w-5 text-success" />
        ) : (
          <XCircle className="h-5 w-5 text-muted-foreground" />
        )}
        <Switch
          checked={granted}
          onCheckedChange={onToggle}
          aria-label={
            granted ? t("revokeConsent") : t("grantConsent")
          }
        />
      </div>
    </div>
  );
}
