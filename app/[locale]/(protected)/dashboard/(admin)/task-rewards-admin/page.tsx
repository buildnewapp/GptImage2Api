import { getAdminRewardApplications } from "@/actions/task-rewards/admin";
import { constructMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";
import TaskRewardReviewClient from "./TaskRewardReviewClient";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "AdminTaskRewards",
  });

  return constructMetadata({
    page: "Admin Task Rewards",
    title: t("title"),
    description: t("description"),
    locale: locale as Locale,
    path: "/dashboard/task-rewards-admin",
  });
}

export default async function TaskRewardAdminPage() {
  const result = await getAdminRewardApplications();

  if (!result.success || !result.data) {
    return (
      <p className="text-destructive">
        {result.success
          ? "Failed to load task reward applications."
          : result.error}
      </p>
    );
  }

  return <TaskRewardReviewClient initialData={result.data} />;
}
