import type {
  TaskRewardClaimRecord,
  TaskRewardStore,
} from "@/lib/task-rewards/types";

export interface MemoryTaskRewardStoreOptions {
  claimedDailyCheckinDates?: string[];
  dailyCheckinCount?: number;
  hasValidSubscription?: boolean;
  hasSuccessfulPublicGeneration?: boolean;
  hasSuccessfulPurchase?: boolean;
  referralInviteCount?: number;
  hasReferralFirstPurchase?: boolean;
}

export class MemoryTaskRewardStore implements TaskRewardStore {
  private readonly claimKeys = new Map<string, Set<string>>();
  private readonly claimedDailyCheckinDates: Set<string>;
  private readonly initialDailyCheckinCount: number | null;
  private readonly validSubscription: boolean;
  private readonly claimedDailyCheckinDatesByUser = new Map<
    string,
    Set<string>
  >();
  private readonly successfulPublicGeneration: boolean;
  private readonly successfulPurchase: boolean;
  private readonly referralInviteCount: number;
  private readonly referralFirstPurchase: boolean;
  readonly claims: TaskRewardClaimRecord[] = [];

  constructor(options: MemoryTaskRewardStoreOptions = {}) {
    this.claimedDailyCheckinDates = new Set(
      options.claimedDailyCheckinDates ?? [],
    );
    this.initialDailyCheckinCount = options.dailyCheckinCount ?? null;
    this.validSubscription = options.hasValidSubscription ?? false;
    this.successfulPublicGeneration =
      options.hasSuccessfulPublicGeneration ?? true;
    this.successfulPurchase = options.hasSuccessfulPurchase ?? true;
    this.referralInviteCount = options.referralInviteCount ?? 1;
    this.referralFirstPurchase = options.hasReferralFirstPurchase ?? true;
  }

  async hasClaim(userId: string, claimKey: string): Promise<boolean> {
    return this.claimKeys.get(userId)?.has(claimKey) ?? false;
  }

  async getDailyCheckinStreak(
    userId: string,
    calendarDate: string,
  ): Promise<number> {
    const claimedDates = new Set([
      ...this.claimedDailyCheckinDates,
      ...(this.claimedDailyCheckinDatesByUser.get(userId) ?? []),
    ]);
    const date = new Date(`${calendarDate}T00:00:00.000Z`);
    let streak = 0;
    date.setUTCDate(date.getUTCDate() - 1);
    while (claimedDates.has(date.toISOString().slice(0, 10))) {
      streak += 1;
      date.setUTCDate(date.getUTCDate() - 1);
    }
    return streak;
  }

  async getDailyCheckinCount(userId: string): Promise<number> {
    const claimedDates = new Set([
      ...this.claimedDailyCheckinDates,
      ...(this.claimedDailyCheckinDatesByUser.get(userId) ?? []),
    ]);
    const seededCount = this.initialDailyCheckinCount ?? claimedDates.size;
    const claimedAfterInitialization = this.claims.filter(
      (claim) => claim.userId === userId && claim.taskKey === "daily_checkin",
    ).length;
    return seededCount + claimedAfterInitialization;
  }

  async hasValidSubscription(_userId: string, _now: Date): Promise<boolean> {
    return this.validSubscription;
  }

  async hasSuccessfulPublicGeneration(): Promise<boolean> {
    return this.successfulPublicGeneration;
  }

  async hasSuccessfulPurchase(): Promise<boolean> {
    return this.successfulPurchase;
  }

  async countReferralInvites(): Promise<number> {
    return this.referralInviteCount;
  }

  async hasReferralFirstPurchase(): Promise<boolean> {
    return this.referralFirstPurchase;
  }

  async createClaim(record: TaskRewardClaimRecord): Promise<boolean> {
    if (await this.hasClaim(record.userId, record.claimKey)) {
      return false;
    }

    if (!this.claimKeys.has(record.userId)) {
      this.claimKeys.set(record.userId, new Set());
    }

    this.claimKeys.get(record.userId)!.add(record.claimKey);
    if (record.taskKey === "daily_checkin") {
      const calendarDate = record.claimKey.split(":")[1];
      if (calendarDate) {
        if (!this.claimedDailyCheckinDatesByUser.has(record.userId)) {
          this.claimedDailyCheckinDatesByUser.set(record.userId, new Set());
        }
        this.claimedDailyCheckinDatesByUser
          .get(record.userId)!
          .add(calendarDate);
      }
    }
    this.claims.push(record);
    return true;
  }
}

export function createMemoryTaskRewardStore(
  options: MemoryTaskRewardStoreOptions = {},
): MemoryTaskRewardStore {
  return new MemoryTaskRewardStore(options);
}
