import {
  buildDailyClaimKey,
  buildOnceClaimKey,
  getDailyCheckinCycle,
  taskRewardsConfig,
  type TaskRewardsConfig,
} from "@/config/task-rewards";
import type {
  AutomaticClaimableTaskKey,
  TaskRewardProgress,
} from "@/lib/task-rewards/types";

type CompletionResult =
  | { completed: true; progress?: undefined }
  | {
      completed: false;
      reason: "requirements";
      progress: TaskRewardProgress;
    };

export interface TaskDefinitionContext {
  userId: string;
  calendarDate: string;
  now: Date;
  hasSuccessfulPublicGeneration(): Promise<boolean>;
  hasSuccessfulPurchase(): Promise<boolean>;
  countReferralInvites(): Promise<number>;
  hasReferralFirstPurchase(): Promise<boolean>;
}

export interface TaskDefinition {
  isEnabled(config: TaskRewardsConfig): boolean;
  creditAmount(
    config: TaskRewardsConfig,
    previousDailyCheckinStreak: number,
  ): number;
  claimKey(calendarDate: string): string;
  evaluate(
    context: TaskDefinitionContext,
    config: TaskRewardsConfig,
  ): Promise<CompletionResult>;
}

export const taskDefinitions: Record<
  AutomaticClaimableTaskKey,
  TaskDefinition
> = {
  daily_checkin: {
    isEnabled(config) {
      return config.enabled && config.dailyCheckin.enabled;
    },
    creditAmount(config, previousDailyCheckinStreak) {
      return getDailyCheckinCycle(previousDailyCheckinStreak, config)
        .creditAmount;
    },
    claimKey(calendarDate) {
      return buildDailyClaimKey("daily_checkin", calendarDate);
    },
    async evaluate() {
      return { completed: true };
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
};

export function getTaskDefinition(
  taskKey: AutomaticClaimableTaskKey,
): TaskDefinition {
  return taskDefinitions[taskKey];
}

export function getDefaultTaskRewardsConfig(): TaskRewardsConfig {
  return taskRewardsConfig;
}
