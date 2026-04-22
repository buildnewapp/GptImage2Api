import {
  buildDailyClaimKey,
  buildOnceClaimKey,
  taskRewardsConfig,
  type TaskRewardsConfig,
} from "@/config/task-rewards";
import type {
  ClaimableTaskKey,
  TaskRewardProgress,
} from "@/lib/task-rewards/types";

type CompletionResult =
  | { completed: true; progress?: undefined }
  | {
      completed: false;
      reason: "requirements" | "cooldown";
      progress: TaskRewardProgress;
    };

export interface TaskDefinitionContext {
  userId: string;
  calendarDate: string;
  now: Date;
  externalTaskStartedAt?: string;
  getClaimedDailyCheckinDates(calendarDates: string[]): Promise<Set<string>>;
  hasSuccessfulPublicGeneration(): Promise<boolean>;
  hasSuccessfulPurchase(): Promise<boolean>;
  countReferralInvites(): Promise<number>;
  hasReferralFirstPurchase(): Promise<boolean>;
}

export interface TaskDefinition {
  isEnabled(config: TaskRewardsConfig): boolean;
  creditAmount(config: TaskRewardsConfig): number;
  claimKey(calendarDate: string): string;
  evaluate(
    context: TaskDefinitionContext,
    config: TaskRewardsConfig,
  ): Promise<CompletionResult>;
}

export const taskDefinitions: Record<ClaimableTaskKey, TaskDefinition> = {
  daily_checkin: {
    isEnabled(config) {
      return config.enabled && config.dailyCheckin.enabled;
    },
    creditAmount(config) {
      return config.dailyCheckin.credits;
    },
    claimKey(calendarDate) {
      return buildDailyClaimKey("daily_checkin", calendarDate);
    },
    async evaluate() {
      return { completed: true };
    },
  },
  checkin_3_days: {
    isEnabled(config) {
      return config.enabled && config.checkin3Days.enabled;
    },
    creditAmount(config) {
      return config.checkin3Days.credits;
    },
    claimKey() {
      return buildOnceClaimKey("checkin_3_days");
    },
    async evaluate(context) {
      const requiredDates = [0, 1, 2].map((offset) => {
        const date = new Date(context.now);
        date.setUTCDate(date.getUTCDate() - offset);
        return date.toISOString().slice(0, 10);
      });
      const claimedDates =
        await context.getClaimedDailyCheckinDates(requiredDates);
      const current = requiredDates.filter((date) =>
        claimedDates.has(date),
      ).length;

      if (current === requiredDates.length) {
        return { completed: true };
      }

      return {
        completed: false,
        reason: "requirements",
        progress: {
          current,
          required: requiredDates.length,
        },
      };
    },
  },
  first_public_generation: {
    isEnabled(config) {
      return config.enabled && config.firstPublicGeneration.enabled;
    },
    creditAmount(config) {
      return config.firstPublicGeneration.credits;
    },
    claimKey() {
      return buildOnceClaimKey("first_public_generation");
    },
    async evaluate(context) {
      const hasPublicGeneration = await context.hasSuccessfulPublicGeneration();
      if (hasPublicGeneration) {
        return { completed: true };
      }

      return {
        completed: false,
        reason: "requirements",
        progress: {
          current: 0,
          required: 1,
        },
      };
    },
  },
  first_purchase: {
    isEnabled(config) {
      return config.enabled && config.firstPurchase.enabled;
    },
    creditAmount(config) {
      return config.firstPurchase.credits;
    },
    claimKey() {
      return buildOnceClaimKey("first_purchase");
    },
    async evaluate(context) {
      const hasPurchase = await context.hasSuccessfulPurchase();
      if (hasPurchase) {
        return { completed: true };
      }

      return {
        completed: false,
        reason: "requirements",
        progress: {
          current: 0,
          required: 1,
        },
      };
    },
  },
  github_star: createTimedExternalTaskDefinition({
    isEnabled: (config) => config.enabled && config.githubStar.enabled,
    getCredits: (config) => config.githubStar.credits,
    getCooldownSeconds: (config) => config.githubStar.cooldownSeconds,
    taskKey: "github_star",
  }),
  huggingface_like: createTimedExternalTaskDefinition({
    isEnabled: (config) => config.enabled && config.huggingFaceLike.enabled,
    getCredits: (config) => config.huggingFaceLike.credits,
    getCooldownSeconds: (config) => config.huggingFaceLike.cooldownSeconds,
    taskKey: "huggingface_like",
  }),
};

function createTimedExternalTaskDefinition({
  isEnabled,
  getCredits,
  getCooldownSeconds,
  taskKey,
}: {
  isEnabled(config: TaskRewardsConfig): boolean;
  getCredits(config: TaskRewardsConfig): number;
  getCooldownSeconds(config: TaskRewardsConfig): number;
  taskKey: Extract<ClaimableTaskKey, "github_star" | "huggingface_like">;
}): TaskDefinition {
  return {
    isEnabled,
    creditAmount: getCredits,
    claimKey() {
      return buildOnceClaimKey(taskKey);
    },
    async evaluate(context, config) {
      const startedAt = context.externalTaskStartedAt
        ? new Date(context.externalTaskStartedAt)
        : null;
      const cooldownSeconds = getCooldownSeconds(config);
      if (!startedAt || Number.isNaN(startedAt.getTime())) {
        return {
          completed: false,
          reason: "requirements",
          progress: {
            current: 0,
            required: cooldownSeconds,
          },
        };
      }

      const elapsedSeconds = Math.max(
        0,
        Math.floor((context.now.getTime() - startedAt.getTime()) / 1000),
      );
      if (elapsedSeconds >= cooldownSeconds) {
        return { completed: true };
      }

      return {
        completed: false,
        reason: "cooldown",
        progress: {
          current: elapsedSeconds,
          required: cooldownSeconds,
        },
      };
    },
  };
}

export function getTaskDefinition(taskKey: ClaimableTaskKey): TaskDefinition {
  return taskDefinitions[taskKey];
}

export function getDefaultTaskRewardsConfig(): TaskRewardsConfig {
  return taskRewardsConfig;
}
