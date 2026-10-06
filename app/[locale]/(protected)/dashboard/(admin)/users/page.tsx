import {
  getAdminManualBenefitPlans,
  getUserDetails,
  getUsers,
} from "@/actions/users/admin";
import { constructMetadata } from "@/lib/metadata";
import { Loader2 } from "lucide-react";
import { Metadata } from "next";
import { Locale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { columns } from "./Columns";
import { DataTable } from "./DataTable";

type Params = Promise<{ locale: string }>;

type MetadataProps = {
  params: Params;
};

export async function generateMetadata({
  params,
}: MetadataProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "Users",
  });

  return constructMetadata({
    page: "Users",
    title: t("title"),
    description: t("description"),
    locale: locale as Locale,
    path: `/dashboard/users`,
  });
}

const PAGE_SIZE = 20;

async function UsersTable({ selectedUserId }: { selectedUserId?: string }) {
  const [initialData, manualBenefitPlans, selectedUserDetails] =
    await Promise.all([
      getUsers({ pageIndex: 0, pageSize: PAGE_SIZE }),
      getAdminManualBenefitPlans(),
      selectedUserId ? getUserDetails({ userId: selectedUserId }) : undefined,
    ]);

  const selectedUser = selectedUserDetails?.success
    ? selectedUserDetails.data?.user
    : undefined;

  return (
    <DataTable
      columns={columns}
      initialData={initialData.data?.users || []}
      initialPageCount={Math.ceil(
        (initialData.data?.totalCount || 0) / PAGE_SIZE,
      )}
      pageSize={PAGE_SIZE}
      totalCount={initialData.data?.totalCount || 0}
      manualBenefitPlans={
        manualBenefitPlans.success ? manualBenefitPlans.data || [] : []
      }
      selectedUser={selectedUser}
    />
  );
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string | string[] }>;
}) {
  const t = useTranslations("Users");
  const params = await searchParams;
  const selectedUserId = Array.isArray(params.userId)
    ? params.userId[0]
    : params.userId;

  return (
    <div className="space-y-4">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        }
      >
        <UsersTable selectedUserId={selectedUserId} />
      </Suspense>
    </div>
  );
}
