"use client";

import { claimTaskRewardAction } from "@/actions/task-rewards/user";
import { referralConfig } from "@/config/referral";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  MANUAL_REVIEW_TASK_KEYS,
  type ManualReviewTaskKey,
} from "@/config/task-rewards";
import { isAutomaticClaimableTaskKey } from "@/lib/task-rewards/claim";
import type {
  TaskRewardItemData,
  TaskRewardsDashboardData,
} from "@/lib/task-rewards/dashboard-data";
import {
  getMetricToneClasses,
  getTaskIconToneClasses,
  getTaskStatusToneClasses,
} from "@/lib/task-rewards/theme";
import {
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Coins,
  Gift,
  Video,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { startTransition, useMemo, useState } from "react";
import { toast } from "sonner";
import ManualTaskSubmissionDialog from "./ManualTaskSubmissionDialog";

function getTaskIcon(taskKey: TaskRewardItemData["taskKey"]) {
  switch (taskKey) {
    case "daily_checkin":
    case "checkin_3_days":
      return <CheckCircle2 className="h-4.5 w-4.5" />;
    case "first_public_generation":
      return <Video className="h-4.5 w-4.5" />;
    case "first_purchase":
      return <WalletCards className="h-4.5 w-4.5" />;
    case "invite_signup":
    case "invite_first_purchase":
    case "github_star":
    case "huggingface_like":
    case "share_twitter":
    case "share_facebook":
    case "share_tiktok":
    case "share_instagram":
      return <Gift className="h-4.5 w-4.5" />;
  }
}

function isTaskDone(task: TaskRewardItemData): boolean {
  return task.status === "claimed" || task.status === "completed";
}

function isManualReviewTask(
  task: TaskRewardItemData,
): task is TaskRewardItemData & {
  taskKey: ManualReviewTaskKey;
  targetUrl: string;
} {
  return (
    typeof task.targetUrl === "string" &&
    MANUAL_REVIEW_TASK_KEYS.some((taskKey) => taskKey === task.taskKey)
  );
}

export default function TasksClient({
  data,
}: {
  data: TaskRewardsDashboardData;
}) {
  const t = useTranslations("DashboardUserTasks");
  const router = useRouter();
  const [pendingTaskKey, setPendingTaskKey] = useState<string | null>(null);

  const refresh = () => startTransition(() => router.refresh());

  const summary = useMemo(() => {
    const totalTasks = data.tasks.length;
    const completedTasks = data.tasks.filter(isTaskDone).length;

    const claimableCredits = data.tasks.reduce(
      (sum, task) =>
        task.status === "claimable" ? sum + (task.creditAmount ?? 0) : sum,
      0,
    );

    return {
      totalTasks,
      completedTasks,
      claimableCredits,
      progressPercent:
        totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
    };
  }, [data.tasks]);

  const firstOrderReward =
    referralConfig.firstOrderRewardMode === "fixed"
      ? `$${referralConfig.firstOrderRewardFixedUsd}`
      : `${referralConfig.firstOrderRewardPercent}%`;

  const handleClaim = async (
    taskKey: Parameters<typeof claimTaskRewardAction>[0],
  ) => {
    setPendingTaskKey(taskKey);
    const result = await claimTaskRewardAction(taskKey);
    setPendingTaskKey(null);

    if (!result.success) {
      const errorKey =
        result.customCode === "already_claimed"
          ? "alreadyClaimed"
          : result.customCode === "not_completed"
            ? "notCompleted"
            : "claimFailed";
      toast.error(t(`toast.${errorKey}`));
      refresh();
      return;
    }

    toast.success(
      t("toast.claimed", {
        credits: result.data?.creditAmount ?? 0,
      }),
    );
    refresh();
  };

  const quickLinks = [
    {
      key: "topUp",
      href: "/#pricing",
      icon: <WalletCards className="h-4.5 w-4.5" />,
    },
    {
      key: "creditHistory",
      href: "/dashboard/credit-history",
      icon: <Coins className="h-4.5 w-4.5" />,
    },
    {
      key: "referrals",
      href: "/dashboard/referrals",
      icon: <Gift className="h-4.5 w-4.5" />,
    },
  ] as const;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-slate-50">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-xs leading-5 text-slate-500 dark:text-slate-400">
          {t("description")}
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.72fr)_300px]">
        <div className="space-y-3">
          <Card className="overflow-hidden border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#eef6ff_42%,#f5fff7_100%)] shadow-none dark:border-slate-800 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.96)_0%,rgba(17,24,39,0.94)_50%,rgba(6,78,59,0.20)_100%)]">
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1">
                  <div className="inline-flex items-center rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900/80 dark:text-slate-300 dark:ring-slate-700">
                    {t("summary.badge")}
                  </div>
                  <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-slate-50">
                    {t("summary.title")}
                  </h2>
                  <p className="max-w-xl text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {t("summary.subtitle")}
                  </p>
                </div>

                <div className="grid min-w-[200px] gap-2 sm:grid-cols-2">
                  <MetricCard
                    label={t("summary.readyCredits")}
                    value={t("summary.creditValue", {
                      credits: summary.claimableCredits,
                    })}
                    hint={t("summary.readyCreditsHint")}
                    tone="amber"
                  />
                  <MetricCard
                    label={t("summary.completedTasks")}
                    value={t("summary.completedValue", {
                      completed: summary.completedTasks,
                      total: summary.totalTasks,
                    })}
                    hint={t("summary.completedTasksHint")}
                    tone="emerald"
                  />
                </div>
              </div>

              <div className="space-y-2.5 rounded-3xl border border-slate-200 bg-white/85 p-3.5 dark:border-slate-800 dark:bg-slate-950/70">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {t("summary.progressLabel")}
                    </div>
                    <div className="mt-1 text-base font-black text-slate-950 dark:text-slate-50">
                      {t("summary.progressValue", {
                        claimableCredits: summary.claimableCredits,
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {t("summary.progressPercent")}
                    </div>
                    <div className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {summary.progressPercent}%
                    </div>
                  </div>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-slate-900 dark:bg-slate-800"
                  role="progressbar"
                  aria-label={t("summary.progressPercent")}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={summary.progressPercent}
                >
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#111827_0%,#16a34a_100%)] transition-all dark:bg-[linear-gradient(90deg,#94a3b8_0%,#22c55e_100%)]"
                    style={{ width: `${summary.progressPercent}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2.5">
            {data.tasks.map((task) => {
              const completed = isTaskDone(task);
              const manualTask = isManualReviewTask(task);
              const automaticTaskKey = isAutomaticClaimableTaskKey(task.taskKey)
                ? task.taskKey
                : null;
              const progress = task.progress;
              const description =
                task.taskKey === "invite_signup"
                  ? t("tasks.invite_signup.description", {
                      signupCredit: referralConfig.signupInviteCredit,
                      firstOrderReward,
                    })
                  : task.taskKey === "invite_first_purchase"
                    ? t("tasks.invite_first_purchase.description", {
                        firstOrderReward,
                      })
                    : t(`tasks.${task.taskKey}.description`);
              const actionLabel =
                task.taskKey === "invite_signup" ||
                task.taskKey === "invite_first_purchase"
                  ? completed
                    ? t("actions.viewReferral")
                    : t("actions.inviteNow")
                  : task.taskKey === "first_public_generation"
                    ? t("actions.goCreate")
                    : task.taskKey === "first_purchase"
                      ? t("actions.goPurchase")
                      : t("actions.goComplete");
              const statusLabel = completed
                ? t("status.done")
                : t(`status.${task.status}`);

              return (
                <Card
                  key={task.taskKey}
                  className={`border py-2 shadow-none transition-colors ${getTaskStatusToneClasses(task.status)}`}
                >
                  <CardContent className="flex flex-col gap-3 p-3.5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl ${getTaskIconToneClasses(
                          {
                            completed,
                            claimable: task.status === "claimable",
                          },
                        )}`}
                      >
                        {completed ? (
                          <CheckCircle2 className="h-4.5 w-4.5" />
                        ) : (
                          getTaskIcon(task.taskKey)
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-slate-950 dark:text-slate-50">
                            {t(`tasks.${task.taskKey}.title`)}
                          </h3>
                          {task.creditAmount !== null ? (
                            <Badge
                              variant="outline"
                              className="rounded-full border-emerald-200 bg-emerald-100/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
                            >
                              +{task.creditAmount}
                            </Badge>
                          ) : null}
                        </div>

                        <p className="max-w-2xl text-xs leading-5 text-slate-500 dark:text-slate-400">
                          {description}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 ring-1 ring-slate-200 dark:bg-slate-900/80 dark:ring-slate-700">
                            {completed ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <CircleDashed className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                            )}
                            {statusLabel}
                          </span>
                          {progress ? (
                            <span>
                              {t("progressValue", {
                                current: progress.current,
                                required: progress.required,
                              })}
                            </span>
                          ) : null}
                        </div>
                        {task.status === "rejected" && task.reviewNote ? (
                          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                            <span className="font-semibold">
                              {t("reviewReason")}
                            </span>{" "}
                            {task.reviewNote}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:min-w-[144px] lg:justify-end">
                      {manualTask && task.status === "pending" ? (
                        <Button
                          variant="outline"
                          disabled
                          className="h-9 min-w-[104px] whitespace-nowrap px-3"
                        >
                          {t("actions.pending")}
                        </Button>
                      ) : manualTask &&
                        (task.status === "available" ||
                          task.status === "rejected") ? (
                        <ManualTaskSubmissionDialog
                          taskKey={task.taskKey}
                          targetUrl={task.targetUrl}
                          title={t(`tasks.${task.taskKey}.title`)}
                          description={description}
                          triggerLabel={
                            task.status === "rejected"
                              ? t("actions.resubmit")
                              : t("actions.submit")
                          }
                        />
                      ) : completed ? (
                        task.href && task.status === "completed" ? (
                          <Button
                            asChild
                            variant="outline"
                            className="h-9 min-w-[104px] px-3"
                          >
                            <Link href={task.href}>
                              {actionLabel}
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            disabled
                            className="h-9 min-w-[104px] px-3"
                          >
                            {t("actions.claimed")}
                          </Button>
                        )
                      ) : task.status === "claimable" && automaticTaskKey ? (
                        <Button
                          className="h-9 min-w-[104px] px-3"
                          onClick={() => handleClaim(automaticTaskKey)}
                          disabled={pendingTaskKey === task.taskKey}
                        >
                          <Coins className="mr-2 h-4 w-4" />
                          {t("actions.claim")}
                        </Button>
                      ) : task.href ? (
                        <Button asChild className="h-9 min-w-[104px] px-3">
                          <Link href={task.href}>
                            {actionLabel}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          disabled
                          className="h-9 min-w-[104px] px-3"
                        >
                          {t("actions.claimed")}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <Card className="border-slate-200 bg-slate-50 shadow-none dark:border-slate-800 dark:bg-slate-950/70">
            <CardContent className="space-y-3 p-4">
              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  {t("quickLinks.eyebrow")}
                </div>
                <h2 className="text-lg font-black tracking-tight text-slate-950 dark:text-slate-50">
                  {t("quickLinks.title")}
                </h2>
              </div>

              <div className="space-y-2">
                {quickLinks.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className="flex items-start gap-2.5 rounded-2xl bg-white px-3 py-2.5 transition-colors hover:bg-slate-100 dark:bg-slate-950/80 dark:hover:bg-slate-900"
                  >
                    <div className="mt-0.5 rounded-2xl bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-bold text-slate-950 dark:text-slate-50">
                        {t(`quickLinks.items.${item.key}.title`)}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        {t(`quickLinks.items.${item.key}.description`)}
                      </div>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "amber" | "emerald";
}) {
  return (
    <div className={`rounded-3xl border p-3.5 ${getMetricToneClasses(tone)}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em]">
        {label}
      </div>
      <div className="mt-1.5 text-xl font-black">{value}</div>
      <div className="mt-1 text-[11px] font-medium opacity-80">{hint}</div>
    </div>
  );
}
