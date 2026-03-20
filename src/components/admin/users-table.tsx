"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminUser } from "@/lib/admin/types";

interface UsersTableProps {
  users: AdminUser[];
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSortChange: (sortBy: string, sortOrder: "asc" | "desc") => void;
  onUserClick: (user: AdminUser) => void;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(dateStr: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(dateStr));
}

function formatRelativeTime(
  dateStr: string | null,
  locale: string,
  neverLabel: string
): string {
  if (!dateStr) return neverLabel;

  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  const rtf = new Intl.RelativeTimeFormat(locale === "de" ? "de" : "en", {
    numeric: "auto",
  });

  if (diffDays > 30) {
    return formatDate(dateStr, locale);
  } else if (diffDays >= 1) {
    return rtf.format(-diffDays, "day");
  } else if (diffHours >= 1) {
    return rtf.format(-diffHours, "hour");
  } else if (diffMinutes >= 1) {
    return rtf.format(-diffMinutes, "minute");
  } else {
    return rtf.format(0, "second");
  }
}

interface SortableHeaderProps {
  label: string;
  column: string;
  currentSort: string;
  currentOrder: "asc" | "desc";
  onSort: (sortBy: string, sortOrder: "asc" | "desc") => void;
  className?: string;
}

function SortableHeader({
  label,
  column,
  currentSort,
  currentOrder,
  onSort,
  className,
}: SortableHeaderProps) {
  const isActive = currentSort === column;

  function handleClick() {
    if (isActive) {
      onSort(column, currentOrder === "asc" ? "desc" : "asc");
    } else {
      onSort(column, "asc");
    }
  }

  return (
    <TableHead className={className}>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 gap-1 font-medium text-muted-foreground hover:text-foreground"
        onClick={handleClick}
      >
        {label}
        {isActive ? (
          currentOrder === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
        )}
      </Button>
    </TableHead>
  );
}

export function UsersTable({
  users,
  sortBy,
  sortOrder,
  onSortChange,
  onUserClick,
}: UsersTableProps) {
  const t = useTranslations("admin");
  const locale = useLocale();

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader
              label={t("columnName")}
              column="name"
              currentSort={sortBy}
              currentOrder={sortOrder}
              onSort={onSortChange}
            />
            <SortableHeader
              label={t("columnEmail")}
              column="email"
              currentSort={sortBy}
              currentOrder={sortOrder}
              onSort={onSortChange}
              className="hidden md:table-cell"
            />
            <TableHead>{t("columnRole")}</TableHead>
            <SortableHeader
              label={t("columnRegistered")}
              column="createdAt"
              currentSort={sortBy}
              currentOrder={sortOrder}
              onSort={onSortChange}
              className="hidden lg:table-cell"
            />
            <SortableHeader
              label={t("columnLastLogin")}
              column="lastSignInAt"
              currentSort={sortBy}
              currentOrder={sortOrder}
              onSort={onSortChange}
              className="hidden lg:table-cell"
            />
            <TableHead>{t("columnStatus")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow
              key={user.id}
              className="cursor-pointer"
              onClick={() => onUserClick(user)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onUserClick(user);
                }
              }}
              aria-label={t("openUserDetail", {
                name: user.displayName ?? user.email,
              })}
            >
              {/* Avatar + Name */}
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    {user.avatarUrl && (
                      <AvatarImage
                        src={user.avatarUrl}
                        alt={user.displayName ?? ""}
                      />
                    )}
                    <AvatarFallback className="text-xs">
                      {getInitials(user.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {user.displayName ?? t("noName")}
                    </p>
                    {/* Show email on mobile below name */}
                    <p className="truncate text-xs text-muted-foreground md:hidden">
                      {user.email}
                    </p>
                  </div>
                </div>
              </TableCell>

              {/* Email (hidden on mobile) */}
              <TableCell className="hidden md:table-cell">
                <span className="truncate text-muted-foreground">
                  {user.email}
                </span>
              </TableCell>

              {/* Role Badge */}
              <TableCell>
                {user.role ? (
                  <Badge
                    variant={user.role === "TRAINER" ? "primary" : "secondary"}
                    size="sm"
                  >
                    {user.role === "TRAINER"
                      ? t("roleTrainer")
                      : t("roleAthlete")}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {t("noRole")}
                  </span>
                )}
              </TableCell>

              {/* Registered (hidden on small) */}
              <TableCell className="hidden lg:table-cell">
                <span className="text-sm text-muted-foreground">
                  {formatDate(user.createdAt, locale)}
                </span>
              </TableCell>

              {/* Last Login (hidden on small) */}
              <TableCell className="hidden lg:table-cell">
                <span className="text-sm text-muted-foreground">
                  {formatRelativeTime(user.lastSignInAt, locale, t("never"))}
                </span>
              </TableCell>

              {/* Status Badge */}
              <TableCell>
                <Badge
                  variant={user.isBanned ? "error" : "success"}
                  size="sm"
                >
                  {user.isBanned ? t("statusBanned") : t("statusActive")}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
