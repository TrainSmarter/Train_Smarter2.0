"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Plus, Search, SortAsc, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { AthleteCard } from "@/components/athlete-card";
import { InviteModal } from "@/components/invite-modal";
import { resendInvitation } from "@/lib/athletes/actions";
import type { AthleteListItem, SortOption } from "@/lib/athletes/types";

const PAGE_SIZE = 50;

interface AthletesListProps {
  athletes: AthleteListItem[];
  currentPage: number;
  totalCount: number;
  hasMore: boolean;
}

function sortAthletes(
  athletes: AthleteListItem[],
  sort: SortOption
): AthleteListItem[] {
  const sorted = [...athletes];
  switch (sort) {
    case "name-asc":
      return sorted.sort((a, b) =>
        `${a.lastName} ${a.firstName}`.localeCompare(
          `${b.lastName} ${b.firstName}`
        )
      );
    case "name-desc":
      return sorted.sort((a, b) =>
        `${b.lastName} ${b.firstName}`.localeCompare(
          `${a.lastName} ${a.firstName}`
        )
      );
    case "recent":
      return sorted.sort(
        (a, b) =>
          new Date(b.connectedAt ?? b.invitedAt).getTime() -
          new Date(a.connectedAt ?? a.invitedAt).getTime()
      );
    default:
      return sorted;
  }
}

export function AthletesList({ athletes, currentPage, totalCount, hasMore }: AthletesListProps) {
  const t = useTranslations("athletes");
  const tCommon = useTranslations("common");
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<SortOption>("name-asc");
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [resendingId, setResendingId] = React.useState<string | null>(null);

  // Separate pending and active
  const pending = athletes.filter((a) => a.status === "pending");
  const active = athletes.filter((a) => a.status === "active");

  // Filter by search
  const filterFn = (a: AthleteListItem) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.firstName.toLowerCase().includes(q) ||
      a.lastName.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      `${a.firstName} ${a.lastName}`.toLowerCase().includes(q)
    );
  };

  const filteredPending = sortAthletes(
    pending.filter(filterFn),
    sort
  );
  const filteredActive = sortAthletes(
    active.filter(filterFn),
    sort
  );

  const hasAny = athletes.length > 0;
  const hasResults = filteredPending.length > 0 || filteredActive.length > 0;

  async function handleResend(connectionId: string) {
    setResendingId(connectionId);
    try {
      const result = await resendInvitation(connectionId);
      if (result.success) {
        toast.success(t("resendSuccess"));
      } else if (result.error === "RATE_LIMITED") {
        toast.error(t("resendRateLimited"));
      } else {
        toast.error(t("errorGeneric"));
      }
    } catch {
      toast.error(t("errorGeneric"));
    } finally {
      setResendingId(null);
    }
  }

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h1 text-foreground">{t("title")}</h1>
          <p className="mt-1 text-body-lg text-muted-foreground">
            {t("subtitle", { count: active.length })}
          </p>
        </div>
        <Button
          onClick={() => setInviteOpen(true)}
          iconLeft={<Plus className="h-4 w-4" />}
        >
          {t("inviteAthlete")}
        </Button>
      </div>

      {/* Search + Sort Bar */}
      {hasAny && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label={tCommon("search")}
            />
          </div>
          <Select
            value={sort}
            onValueChange={(v) => setSort(v as SortOption)}
          >
            <SelectTrigger className="w-full sm:w-[200px]" aria-label={tCommon("sort")}>
              <SortAsc className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">{t("sortNameAsc")}</SelectItem>
              <SelectItem value="name-desc">{t("sortNameDesc")}</SelectItem>
              <SelectItem value="recent">{t("sortRecent")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Empty State */}
      {!hasAny && (
        <EmptyState
          className="mt-12"
          icon="👥"
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Button
              onClick={() => setInviteOpen(true)}
              iconLeft={<Plus className="h-4 w-4" />}
            >
              {t("inviteAthlete")}
            </Button>
          }
        />
      )}

      {/* No Search Results */}
      {hasAny && !hasResults && search && (
        <EmptyState
          className="mt-12"
          icon="🔍"
          title={tCommon("noResults")}
          description={t("noSearchResults", { query: search })}
        />
      )}

      {/* Pending Invitations Section */}
      {filteredPending.length > 0 && (
        <section className="mt-6" aria-label={t("pendingSection")}>
          <h2 className="text-h5 text-muted-foreground mb-3">
            {t("pendingSection")} ({filteredPending.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPending.map((athlete) => (
              <AthleteCard
                key={athlete.connectionId}
                athlete={athlete}
                onResendInvite={handleResend}
                isResending={resendingId === athlete.connectionId}
              />
            ))}
          </div>
        </section>
      )}

      {/* Active Athletes Grid */}
      {filteredActive.length > 0 && (
        <section className="mt-6" aria-label={t("activeSection")}>
          {filteredPending.length > 0 && (
            <h2 className="text-h5 text-muted-foreground mb-3">
              {t("activeSection")} ({filteredActive.length})
            </h2>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredActive.map((athlete) => (
              <AthleteCard
                key={athlete.connectionId}
                athlete={athlete}
              />
            ))}
          </div>
        </section>
      )}

      {/* Pagination */}
      {totalCount > PAGE_SIZE && (
        <nav className="mt-6 flex items-center justify-center gap-4" aria-label={t("pagination")}>
          {currentPage > 1 ? (
            <Link
              href={`/organisation/athletes?page=${currentPage - 1}` as "/organisation/athletes"}
              className="inline-flex items-center gap-1 text-body-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              {t("previousPage")}
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 text-body-sm text-muted-foreground/50">
              <ChevronLeft className="h-4 w-4" />
              {t("previousPage")}
            </span>
          )}

          <span className="text-body-sm text-muted-foreground">
            {t("pageOf", {
              current: currentPage,
              total: Math.ceil(totalCount / PAGE_SIZE),
            })}
          </span>

          {hasMore ? (
            <Link
              href={`/organisation/athletes?page=${currentPage + 1}` as "/organisation/athletes"}
              className="inline-flex items-center gap-1 text-body-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("nextPage")}
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 text-body-sm text-muted-foreground/50">
              {t("nextPage")}
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </nav>
      )}

      {/* Invite Modal */}
      <InviteModal open={inviteOpen} onOpenChange={setInviteOpen} />
    </>
  );
}
