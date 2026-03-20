import { getTranslations } from "next-intl/server";
import { AdminUsersPage } from "@/components/admin/admin-users-page";
import type { UserListParams, UserListResult } from "@/lib/admin/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return {
    title: t("pageTitle"),
  };
}

interface AdminUsersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminUsersRoute({
  searchParams,
}: AdminUsersPageProps) {
  const sp = await searchParams;

  const params: UserListParams = {
    page: Number(sp.page) || 1,
    perPage: 25,
    search: typeof sp.q === "string" ? sp.q : undefined,
    roleFilter:
      sp.role === "TRAINER" || sp.role === "ATHLETE" ? sp.role : "all",
    statusFilter:
      sp.status === "active" || sp.status === "banned" ? sp.status : "all",
    sortBy:
      sp.sort === "name" ||
      sp.sort === "email" ||
      sp.sort === "createdAt" ||
      sp.sort === "lastSignInAt"
        ? sp.sort
        : "createdAt",
    sortOrder: sp.order === "asc" ? "asc" : "desc",
  };

  // Backend will provide listUsers — for now pass params to client component
  // which will call the server action. This allows the backend to be built independently.
  let result: UserListResult;
  try {
    const { listUsers } = await import("@/lib/admin/queries");
    result = await listUsers(params);
  } catch {
    // Backend not ready yet — provide empty result
    result = {
      users: [],
      totalCount: 0,
      page: params.page,
      perPage: params.perPage,
    };
  }

  return <AdminUsersPage initialData={result} params={params} />;
}
