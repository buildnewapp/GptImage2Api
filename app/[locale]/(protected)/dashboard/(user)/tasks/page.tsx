import { getTaskRewardsDashboardData } from "@/actions/task-rewards/user";
import { taskRewardsConfig } from "@/config/task-rewards";
import { constructMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import TasksClient from "./TasksClient";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "DashboardUserTasks",
  });

  return constructMetadata({
    title: t("meta.title"),
    description: t("meta.description"),
    locale: locale as Locale,
    path: "/dashboard/tasks",
  });
}

export default async function TasksPage() {
  if (!taskRewardsConfig.enabled) {
    redirect("/dashboard/settings");
  }

  const result = await getTaskRewardsDashboardData();
  if (!result.success || !result.data) {
    redirect("/dashboard/settings");
  }

  return <TasksClient data={result.data} />;
}
