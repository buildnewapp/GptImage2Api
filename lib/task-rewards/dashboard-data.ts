import {
  MANUAL_REVIEW_TASK_KEYS,
  REDDIT_POPULAR_TASK_KEY,
  REDDIT_SHARE_TASK_KEYS,
  buildDailyClaimKey,
  buildOnceClaimKey,
  getDailyCheckinCycle,
  manualReviewTasks,
  taskRewardsConfig,
  type ManualReviewTaskKey,
  type TaskRewardKey,
} from "@/config/task-rewards";
import type { RewardApplicationRecord } from "@/lib/task-rewards/application-store";

export type TaskRewardStatus =
  | "claimable"
  | "claimed"
  | "completed"
  | "incomplete"
  | "available"
  | "pending"
  | "rejected";

export interface TaskRewardItemData {
  taskKey: TaskRewardKey;
  creditAmount: number | null;
  status: TaskRewardStatus;
  href?: string;
  targetUrl?: string;
  canSubmit?: boolean;
  reviewNote?: string;
  checkinCycle?: {
    day: number;
    rewards: number[];
  };
  progress?: {
    current: number;
    required: number;
  };
}

export interface TaskRewardsDashboardData {
  userId: string;
  tasks: TaskRewardItemData[];
}

function getTodayClaimKey(now: Date): string {
  return buildDailyClaimKey("daily_checkin", now.toISOString().slice(0, 10));
}

export function buildLatestManualApplicationLookup(
  applications: RewardApplicationRecord[],
): Map<ManualReviewTaskKey, RewardApplicationRecord> {
  const lookup = new Map<ManualReviewTaskKey, RewardApplicationRecord>();

  for (const application of applications) {
    if (
      application.source !== "user" ||
      !MANUAL_REVIEW_TASK_KEYS.includes(
        application.taskKey as ManualReviewTaskKey,
      )
    ) {
      continue;
    }

    const taskKey = application.taskKey as ManualReviewTaskKey;
    const current = lookup.get(taskKey);
    const isLater =
      !current ||
      application.submittedAt > current.submittedAt ||
      (application.submittedAt.getTime() === current.submittedAt.getTime() &&
        (application.createdAt > current.createdAt ||
          (application.createdAt.getTime() === current.createdAt.getTime() &&
            application.id > current.id)));
    if (isLater) {
      lookup.set(taskKey, application);
    }
  }

  return lookup;
}

export function buildTaskRewardItems({
  now,
  claimLookup,
  previousDailyCheckinStreak,
  hasPublicGeneration,
  hasPurchase,
  inviteCount,
  hasInviteFirstPurchase,
  latestManualApplications = new Map(),
}: {
  now: Date;
  claimLookup: Set<string>;
  previousDailyCheckinStreak: number;
  hasPublicGeneration: boolean;
  hasPurchase: boolean;
  inviteCount: number;
  hasInviteFirstPurchase: boolean;
  latestManualApplications?: Map<ManualReviewTaskKey, RewardApplicationRecord>;
}): TaskRewardItemData[] {
  const tasks: TaskRewardItemData[] = [];
  const dailyClaimKey = getTodayClaimKey(now);
  const firstPublicGenerationClaimKey = buildOnceClaimKey(
    "first_public_generation",
  );
  const firstPurchaseClaimKey = buildOnceClaimKey("first_purchase");

  if (taskRewardsConfig.dailyCheckin.enabled) {
    const cycle = getDailyCheckinCycle(previousDailyCheckinStreak);
    tasks.push({
      taskKey: "daily_checkin",
      creditAmount: cycle.creditAmount,
      status: claimLookup.has(dailyClaimKey) ? "claimed" : "claimable",
      checkinCycle: { day: cycle.day, rewards: cycle.rewards },
    });
  }

  if (taskRewardsConfig.firstPublicGeneration.enabled) {
    const claimed = claimLookup.has(firstPublicGenerationClaimKey);
    tasks.push({
      taskKey: "first_public_generation",
      creditAmount: taskRewardsConfig.firstPublicGeneration.credits,
      status: claimed
        ? "claimed"
        : hasPublicGeneration
          ? "claimable"
          : "incomplete",
      href: "/dashboard/videos",
      progress: {
        current: claimed || hasPublicGeneration ? 1 : 0,
        required: 1,
      },
    });
  }

  if (taskRewardsConfig.firstPurchase.enabled) {
    const claimed = claimLookup.has(firstPurchaseClaimKey);
    tasks.push({
      taskKey: "first_purchase",
      creditAmount: taskRewardsConfig.firstPurchase.credits,
      status: claimed ? "claimed" : hasPurchase ? "claimable" : "incomplete",
      href: "/#pricing",
      progress: {
        current: claimed || hasPurchase ? 1 : 0,
        required: 1,
      },
    });
  }

  if (taskRewardsConfig.inviteSignup.enabled) {
    tasks.push({
      taskKey: "invite_signup",
      creditAmount: null,
      status: inviteCount >= 1 ? "completed" : "incomplete",
      href: "/dashboard/referrals",
      progress: {
        current: Math.min(inviteCount, 1),
        required: 1,
      },
    });
  }

  if (taskRewardsConfig.inviteFirstPurchase.enabled) {
    tasks.push({
      taskKey: "invite_first_purchase",
      creditAmount: null,
      status: hasInviteFirstPurchase ? "completed" : "incomplete",
      href: "/dashboard/referrals",
      progress: {
        current: hasInviteFirstPurchase ? 1 : 0,
        required: 1,
      },
    });
  }

  for (const taskKey of MANUAL_REVIEW_TASK_KEYS) {
    const definition = manualReviewTasks[taskKey];
    if (!definition.enabled) continue;

    const claimed = claimLookup.has(buildOnceClaimKey(taskKey));
    const hasCompletedRedditShare = REDDIT_SHARE_TASK_KEYS.some(
      (shareTaskKey) => claimLookup.has(buildOnceClaimKey(shareTaskKey)),
    );
    const latestApplication = latestManualApplications.get(taskKey);
    const applicationStatus = latestApplication?.status;
    const status: TaskRewardStatus =
      claimed || applicationStatus === "approved"
        ? "claimed"
        : applicationStatus === "pending"
          ? "pending"
          : applicationStatus === "rejected"
            ? "rejected"
            : taskKey === REDDIT_POPULAR_TASK_KEY && !hasCompletedRedditShare
              ? "incomplete"
              : "available";

    tasks.push({
      taskKey,
      creditAmount: definition.credits,
      status,
      targetUrl: definition.targetUrl,
      canSubmit: status === "available" || status === "rejected",
      ...(status === "rejected" && latestApplication?.reviewNote
        ? { reviewNote: latestApplication.reviewNote }
        : {}),
    });
  }

  return tasks;
}
