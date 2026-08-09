import { siteConfig } from "@/config/site";

export type AutomaticClaimableTaskKey =
  | "daily_checkin"
  | "checkin_3_days"
  | "first_public_generation"
  | "first_purchase";

export const REDDIT_SHARE_TASK_KEYS = [
  "share_reddit_website",
  "share_reddit_work",
] as const;

export const REDDIT_POPULAR_TASK_KEY = "reddit_post_popular" as const;

export const MANUAL_REVIEW_TASK_KEYS = [
  "github_star",
  "huggingface_like",
  "share_twitter",
  "share_facebook",
  "share_tiktok",
  "share_instagram",
  ...REDDIT_SHARE_TASK_KEYS,
  REDDIT_POPULAR_TASK_KEY,
] as const;

export type ManualReviewTaskKey = (typeof MANUAL_REVIEW_TASK_KEYS)[number];

export type TaskRewardKey =
  | AutomaticClaimableTaskKey
  | "invite_signup"
  | "invite_first_purchase"
  | ManualReviewTaskKey;

export interface TaskRewardsConfig {
  enabled: boolean;
  dailyCheckin: {
    enabled: boolean;
    credits: number;
  };
  checkin3Days: {
    enabled: boolean;
    credits: number;
  };
  firstPublicGeneration: {
    enabled: boolean;
    credits: number;
  };
  firstPurchase: {
    enabled: boolean;
    credits: number;
  };
  inviteSignup: {
    enabled: boolean;
    credits: number;
  };
  inviteFirstPurchase: {
    enabled: boolean;
    credits: number;
  };
}

export interface ManualReviewTaskDefinition {
  enabled: boolean;
  credits: number;
  targetUrl: string;
}

export const taskRewardsConfig = {
  enabled: true,
  dailyCheckin: {
    enabled: true,
    credits: 10,
  },
  checkin3Days: {
    enabled: true,
    credits: 20,
  },
  firstPublicGeneration: {
    enabled: true,
    credits: 10,
  },
  firstPurchase: {
    enabled: true,
    credits: 20,
  },
  inviteSignup: {
    enabled: true,
    credits: 20,
  },
  inviteFirstPurchase: {
    enabled: true,
    credits: 20,
  },
} satisfies TaskRewardsConfig;

const encodedSiteUrl = encodeURIComponent(siteConfig.url);

export const manualReviewTasks: Record<
  ManualReviewTaskKey,
  ManualReviewTaskDefinition
> = {
  github_star: {
    enabled: false,
    credits: 10,
    targetUrl: siteConfig.socialLinks?.github || "https://github.com/",
  },
  huggingface_like: {
    enabled: false,
    credits: 10,
    targetUrl: siteConfig.socialLinks?.huggingface || "https://huggingface.co/",
  },
  share_twitter: {
    enabled: false,
    credits: 10,
    targetUrl: `https://twitter.com/intent/tweet?url=${encodedSiteUrl}`,
  },
  share_facebook: {
    enabled: false,
    credits: 10,
    targetUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodedSiteUrl}`,
  },
  share_tiktok: {
    enabled: false,
    credits: 10,
    targetUrl: siteConfig.socialLinks?.tiktok || "https://www.tiktok.com/",
  },
  share_instagram: {
    enabled: false,
    credits: 10,
    targetUrl:
      siteConfig.socialLinks?.instagram || "https://www.instagram.com/",
  },
  share_reddit_website: {
    enabled: true,
    credits: 100,
    targetUrl: "/share-to-reddit",
  },
  share_reddit_work: {
    enabled: true,
    credits: 200,
    targetUrl: "/share-to-reddit",
  },
  reddit_post_popular: {
    enabled: true,
    credits: 1000,
    targetUrl: "/share-to-reddit",
  },
};

export function isRedditManualReviewTaskKey(
  taskKey: unknown,
): taskKey is
  | (typeof REDDIT_SHARE_TASK_KEYS)[number]
  | typeof REDDIT_POPULAR_TASK_KEY {
  return (
    typeof taskKey === "string" &&
    (REDDIT_SHARE_TASK_KEYS.some((key) => key === taskKey) ||
      taskKey === REDDIT_POPULAR_TASK_KEY)
  );
}

export function buildDailyClaimKey(
  taskKey: "daily_checkin",
  calendarDate: string,
): string {
  return `${taskKey}:${calendarDate}`;
}

export function buildOnceClaimKey(
  taskKey: Exclude<TaskRewardKey, "daily_checkin">,
): string {
  return `${taskKey}:once`;
}
