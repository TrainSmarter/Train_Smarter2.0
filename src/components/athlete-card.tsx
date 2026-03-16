"use client";

import { useTranslations, useFormatter, useNow } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Clock, Hourglass, MailCheck, RefreshCw, Undo2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AthleteListItem } from "@/lib/athletes/types";

interface AthleteCardProps {
  athlete: AthleteListItem;
  onResendInvite?: (connectionId: string) => void;
  isResending?: boolean;
  onWithdrawInvite?: (connectionId: string) => void;
  isWithdrawing?: boolean;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function AthleteCard({
  athlete,
  onResendInvite,
  isResending = false,
  onWithdrawInvite,
  isWithdrawing = false,
}: AthleteCardProps) {
  const t = useTranslations("athletes");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const isPending = athlete.status === "pending";
  const isExpired =
    isPending && new Date(athlete.invitationExpiresAt) < new Date();

  const cardContent = (
    <Card
      className={cn(
        "transition-all duration-200",
        !isPending &&
          "hover:-translate-y-0.5 hover:shadow-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isPending && "border-dashed"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 shrink-0">
            {athlete.avatarUrl && (
              <AvatarImage src={athlete.avatarUrl} alt={`${athlete.firstName} ${athlete.lastName}`} />
            )}
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {athlete.firstName && athlete.lastName
                ? getInitials(athlete.firstName, athlete.lastName)
                : <MailCheck className="h-5 w-5" />}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-body font-medium text-foreground">
                {athlete.firstName && athlete.lastName
                  ? `${athlete.firstName} ${athlete.lastName}`
                  : athlete.email}
              </h3>
            </div>

            {athlete.firstName && athlete.lastName && (
              <p className="truncate text-body-sm text-muted-foreground">
                {athlete.email}
              </p>
            )}

            <div className="mt-2 flex items-center gap-2">
              {isPending ? (
                <>
                  <Badge variant={isExpired ? "error" : "warning"} size="sm">
                    {isExpired ? t("invitationExpired") : t("invitationPending")}
                  </Badge>
                  {!isExpired && onResendInvite && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 px-2 text-xs"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onResendInvite(athlete.connectionId);
                      }}
                      loading={isResending}
                    >
                      <RefreshCw className="h-3 w-3" />
                      {t("resend")}
                    </Button>
                  )}
                  {!isExpired && onWithdrawInvite && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onWithdrawInvite(athlete.connectionId);
                      }}
                      loading={isWithdrawing}
                    >
                      <Undo2 className="h-3 w-3" />
                      {t("withdraw")}
                    </Button>
                  )}
                </>
              ) : (
                <Badge variant="success" size="sm">
                  {t("active")}
                </Badge>
              )}
            </div>

            {isPending && (
              <div className="mt-1 space-y-0.5">
                <p className="flex items-center gap-1 text-caption text-muted-foreground">
                  <Clock className="h-3 w-3 shrink-0" />
                  {t("invitedAgo", {
                    time: format.relativeTime(new Date(athlete.invitedAt), now),
                  })}
                </p>
                {!isExpired && (
                  <p className="flex items-center gap-1 text-caption text-muted-foreground">
                    <Hourglass className="h-3 w-3 shrink-0" />
                    {t("expiresIn", {
                      time: format.relativeTime(new Date(athlete.invitationExpiresAt), now),
                    })}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isPending) {
    return cardContent;
  }

  return (
    <Link
      href={{ pathname: "/organisation/athletes/[id]", params: { id: athlete.id } }}
      className="block focus:outline-none"
      aria-label={`${athlete.firstName} ${athlete.lastName} — ${t("viewProfile")}`}
    >
      {cardContent}
    </Link>
  );
}
