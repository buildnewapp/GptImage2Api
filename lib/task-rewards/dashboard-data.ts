import {
  buildDailyClaimKey,
  buildOnceClaimKey,
  taskRewardsConfig,
} from "@/config/task-rewards";

export type TaskRewardStatus =
  | "claimable"
  | "claimed"
  | "completed"
  | "incomplete";

export interface TaskRewardItemData {
  taskKey:
    | "daily_checkin"
    | "checkin_3_days"
    | "first_public_generation"
    | "first_purchase"
    | "invite_signup"
    | "invite_first_purchase"
    | "github_star"
    | "huggingface_like";
  creditAmount: number | null;
  status: TaskRewardStatus;
  href?: string;
  targetUrl?: string;
  cooldownSeconds?: number;
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

function getLastThreeCalendarDates(now: Date): string[] {
  return [0, 1, 2].map((offset) => {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() - offset);
    return date.toISOString().slice(0, 10);
  });
}

export function buildTaskRewardItems({
  now,
  claimLookup,
  claimedStreakDates,
  hasPublicGeneration,
  hasPurchase,
  inviteCount,
  hasInviteFirstPurchase,
}: {
  now: Date;
  claimLookup: Set<string>;
  claimedStreakDates: Set<string>;
  hasPublicGeneration: boolean;
  hasPurchase: boolean;
  inviteCount: number;
  hasInviteFirstPurchase: boolean;
}): TaskRewardItemData[] {
  const tasks: TaskRewardItemData[] = [];
  const dailyClaimKey = getTodayClaimKey(now);
  const streakClaimKey = buildOnceClaimKey("checkin_3_days");
  const firstPublicGenerationClaimKey = buildOnceClaimKey(
    "first_public_generation",
  );
  const firstPurchaseClaimKey = buildOnceClaimKey("first_purchase");
  const githubStarClaimKey = buildOnceClaimKey("github_star");
  const huggingFaceLikeClaimKey = buildOnceClaimKey("huggingface_like");
  const streakDates = getLastThreeCalendarDates(now);
  const streakProgress = streakDates.filter((date) =>
    claimedStreakDates.has(date),
  ).length;
  const hasClaimedStreakReward = claimLookup.has(streakClaimKey);

  if (taskRewardsConfig.dailyCheckin.enabled) {
    tasks.push({
      taskKey: "daily_checkin",
      creditAmount: taskRewardsConfig.dailyCheckin.credits,
      status: claimLookup.has(dailyClaimKey) ? "claimed" : "claimable",
    });
  }

  if (taskRewardsConfig.checkin3Days.enabled) {
    tasks.push({
      taskKey: "checkin_3_days",
      creditAmount: taskRewardsConfig.checkin3Days.credits,
      status: hasClaimedStreakReward
        ? "claimed"
        : streakProgress >= 3
          ? "claimable"
          : "incomplete",
      progress: {
        current: hasClaimedStreakReward ? 3 : streakProgress,
        required: 3,
      },
    });
  }

  if (taskRewardsConfig.firstPublicGeneration.enabled) {
    const claimed = claimLookup.has(firstPublicGenerationClaimKey);
    tasks.push({
      taskKey: "first_public_generation",
      creditAmount: taskRewardsConfig.firstPublicGeneration.credits,
      status: claimed ? "claimed" : hasPublicGeneration ? "claimable" : "incomplete",
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

  if (taskRewardsConfig.githubStar.enabled) {
    tasks.push({
      taskKey: "github_star",
      creditAmount: taskRewardsConfig.githubStar.credits,
      status: claimLookup.has(githubStarClaimKey) ? "claimed" : "incomplete",
      targetUrl: taskRewardsConfig.githubStar.targetUrl,
      cooldownSeconds: taskRewardsConfig.githubStar.cooldownSeconds,
      progress: {
        current: 0,
        required: taskRewardsConfig.githubStar.cooldownSeconds,
      },
    });
  }

  if (taskRewardsConfig.huggingFaceLike.enabled) {
    tasks.push({
      taskKey: "huggingface_like",
      creditAmount: taskRewardsConfig.huggingFaceLike.credits,
      status: claimLookup.has(huggingFaceLikeClaimKey) ? "claimed" : "incomplete",
      targetUrl: taskRewardsConfig.huggingFaceLike.targetUrl,
      cooldownSeconds: taskRewardsConfig.huggingFaceLike.cooldownSeconds,
      progress: {
        current: 0,
        required: taskRewardsConfig.huggingFaceLike.cooldownSeconds,
      },
    });
  }

  return tasks;
}
