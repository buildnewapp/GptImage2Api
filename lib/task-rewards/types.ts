import type {
  AutomaticClaimableTaskKey,
  ManualReviewTaskKey,
  TaskRewardsConfig,
} from "@/config/task-rewards";

export type { AutomaticClaimableTaskKey, ManualReviewTaskKey };

export interface TaskRewardProgress {
  current: number;
  required: number;
}

export type TaskRewardClaimResult =
  | {
      status: "claimed";
      claimKey: string;
      creditAmount: number;
      progress?: undefined;
    }
  | {
      status: "already_claimed";
      claimKey: string;
      creditAmount?: undefined;
      progress?: undefined;
    }
  | {
      status: "not_completed";
      reason: "requirements";
      claimKey: string;
      creditAmount?: undefined;
      progress: TaskRewardProgress;
    }
  | {
      status: "disabled";
      claimKey?: undefined;
      creditAmount?: undefined;
      progress?: undefined;
    };

export interface TaskRewardClaimRecord {
  userId: string;
  taskKey: AutomaticClaimableTaskKey | ManualReviewTaskKey;
  claimKey: string;
  creditAmount: number;
  metadata?: Record<string, unknown>;
}

export interface TaskRewardStore {
  hasClaim(userId: string, claimKey: string): Promise<boolean>;
  countDailyCheckins(userId: string): Promise<number>;
  getClaimedDailyCheckinDates(
    userId: string,
    calendarDates: string[],
  ): Promise<Set<string>>;
  hasSuccessfulPublicGeneration(userId: string): Promise<boolean>;
  hasSuccessfulPurchase(userId: string): Promise<boolean>;
  countReferralInvites(userId: string): Promise<number>;
  hasReferralFirstPurchase(userId: string): Promise<boolean>;
  createClaim(record: TaskRewardClaimRecord): Promise<boolean>;
}

export interface ClaimTaskRewardParams {
  store: TaskRewardStore;
  userId: string;
  taskKey: AutomaticClaimableTaskKey;
  config?: TaskRewardsConfig;
  now?: Date;
}
