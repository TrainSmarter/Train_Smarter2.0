"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Search, Users } from "lucide-react";

import { useRouter, usePathname } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { UsersTable } from "./users-table";
import { UserDetailSlideOver } from "./user-detail-slide-over";
import { AdminPagination } from "./admin-pagination";
import type {
  AdminUser,
  UserListParams,
  UserListResult,
} from "@/lib/admin/types";

interface AdminUsersPageProps {
  initialData: UserListResult;
  params: UserListParams;
}

export function AdminUsersPage({ initialData, params }: AdminUsersPageProps) {
  const t = useTranslations("admin");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Local search state for debouncing
  const [searchValue, setSearchValue] = React.useState(params.search ?? "");

  // Slide-over state
  const [selectedUser, setSelectedUser] = React.useState<AdminUser | null>(
    null
  );
  const [slideOverOpen, setSlideOverOpen] = React.useState(false);

  // Debounced search — update URL after 300ms
  React.useEffect(() => {
    const timer = setTimeout(() => {
      const current = searchParams.get("q") ?? "";
      if (searchValue !== current) {
        updateParams({ q: searchValue || undefined, page: undefined });
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  function updateParams(updates: Record<string, string | undefined>) {
    const newParams = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === "") {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    }
    // Reset to page 1 when filters change (unless page itself is being set)
    if (!("page" in updates)) {
      newParams.delete("page");
    }
    const qs = newParams.toString();
    const href = `${pathname}${qs ? `?${qs}` : ""}`;
    // Cast needed: next-intl typed routes don't support dynamic query strings
    router.replace(href as "/admin/users", { scroll: false });
  }

  function handleUserClick(user: AdminUser) {
    setSelectedUser(user);
    setSlideOverOpen(true);
  }

  function handleSlideOverClose() {
    setSlideOverOpen(false);
    setSelectedUser(null);
  }

  function handleUserUpdated() {
    // Refresh the page to get updated data from the server
    router.refresh();
  }

  function handleSortChange(
    sortBy: string,
    sortOrder: "asc" | "desc"
  ) {
    updateParams({ sort: sortBy, order: sortOrder });
  }

  function handlePageChange(page: number) {
    updateParams({ page: page > 1 ? String(page) : undefined });
  }

  const totalPages = Math.ceil(initialData.totalCount / params.perPage);
  const hasUsers = initialData.users.length > 0;
  const hasAnyFilters =
    params.search ||
    (params.roleFilter != null && params.roleFilter !== "all") ||
    (params.statusFilter != null && params.statusFilter !== "all");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-h1 text-foreground">{t("pageTitle")}</h1>
        <p className="mt-1 text-body-lg text-muted-foreground">
          {t("userCount", { count: initialData.totalCount })}
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-9"
            aria-label={t("searchPlaceholder")}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Role Filter */}
          <Select
            value={params.roleFilter ?? "all"}
            onValueChange={(value) =>
              updateParams({
                role: value === "all" ? undefined : value,
              })
            }
          >
            <SelectTrigger className="w-[140px]" aria-label={t("roleFilter")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("roleAll")}</SelectItem>
              <SelectItem value="TRAINER">{t("roleTrainer")}</SelectItem>
              <SelectItem value="ATHLETE">{t("roleAthlete")}</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={params.statusFilter ?? "all"}
            onValueChange={(value) =>
              updateParams({
                status: value === "all" ? undefined : value,
              })
            }
          >
            <SelectTrigger
              className="w-[140px]"
              aria-label={t("statusFilter")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("statusAll")}</SelectItem>
              <SelectItem value="active">{t("statusActive")}</SelectItem>
              <SelectItem value="banned">{t("statusBanned")}</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select
            value={`${params.sortBy ?? "createdAt"}-${params.sortOrder ?? "desc"}`}
            onValueChange={(value) => {
              const [sortBy, sortOrder] = value.split("-") as [
                string,
                "asc" | "desc",
              ];
              handleSortChange(sortBy, sortOrder);
            }}
          >
            <SelectTrigger className="w-[180px]" aria-label={t("sortLabel")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">{t("sortNameAZ")}</SelectItem>
              <SelectItem value="name-desc">{t("sortNameZA")}</SelectItem>
              <SelectItem value="createdAt-desc">{t("sortNewest")}</SelectItem>
              <SelectItem value="createdAt-asc">{t("sortOldest")}</SelectItem>
              <SelectItem value="lastSignInAt-desc">
                {t("sortLastLogin")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table or Empty State */}
      {!hasUsers && hasAnyFilters && (
        <EmptyState
          className="mt-12"
          icon="🔍"
          title={t("emptySearchTitle")}
          description={t("emptySearchDescription")}
        />
      )}

      {!hasUsers && !hasAnyFilters && (
        <EmptyState
          className="mt-12"
          icon={<Users className="h-12 w-12" />}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      )}

      {hasUsers && (
        <>
          <UsersTable
            users={initialData.users}
            sortBy={params.sortBy ?? "createdAt"}
            sortOrder={params.sortOrder ?? "desc"}
            onSortChange={handleSortChange}
            onUserClick={handleUserClick}
          />

          {totalPages > 1 && (
            <AdminPagination
              currentPage={initialData.page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}

      {/* User Detail Slide-Over */}
      <UserDetailSlideOver
        user={selectedUser}
        open={slideOverOpen}
        onOpenChange={(open) => {
          if (!open) handleSlideOverClose();
        }}
        onUserUpdated={handleUserUpdated}
      />
    </div>
  );
}
