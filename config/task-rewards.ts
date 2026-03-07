import { siteConfig } from "@/config/site";

export type TaskRewardKey =
  | "daily_checkin"
  | "checkin_3_days"
  | "first_public_generation"
  | "first_purchase"
  | "invite_signup"
  | "invite_first_purchase"
  | "github_star"
  | "huggingface_like";

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
  githubStar: {
    enabled: boolean;
    credits: number;
    cooldownSeconds: number;
    targetUrl: string;
  };
  huggingFaceLike: {
    enabled: boolean;
    credits: number;
    cooldownSeconds: number;
    targetUrl: string;
  };
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
  githubStar: {
    enabled: true,
    credits: 10,
    cooldownSeconds: 15,
    targetUrl: siteConfig.socialLinks?.github ?? "https://github.com",
  },
  huggingFaceLike: {
    enabled: true,
    credits: 10,
    cooldownSeconds: 15,
    targetUrl:
      process.env.NEXT_PUBLIC_HUGGINGFACE_SPACE_URL ||
      "https://huggingface.co/spaces",
  },
} satisfies TaskRewardsConfig;

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
