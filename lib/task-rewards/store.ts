import type {
  TaskRewardClaimRecord,
  TaskRewardStore,
} from "@/lib/task-rewards/types";

export interface MemoryTaskRewardStoreOptions {
  claimedDailyCheckinDates?: string[];
  hasSuccessfulPublicGeneration?: boolean;
  hasSuccessfulPurchase?: boolean;
  referralInviteCount?: number;
  hasReferralFirstPurchase?: boolean;
}

export class MemoryTaskRewardStore implements TaskRewardStore {
  private readonly claimKeys = new Map<string, Set<string>>();
  private readonly claimedDailyCheckinDates: Set<string>;
  private readonly successfulPublicGeneration: boolean;
  private readonly successfulPurchase: boolean;
  private readonly referralInviteCount: number;
  private readonly referralFirstPurchase: boolean;
  readonly claims: TaskRewardClaimRecord[] = [];

  constructor(options: MemoryTaskRewardStoreOptions = {}) {
    this.claimedDailyCheckinDates = new Set(
      options.claimedDailyCheckinDates ?? [],
    );
    this.successfulPublicGeneration =
      options.hasSuccessfulPublicGeneration ?? true;
    this.successfulPurchase = options.hasSuccessfulPurchase ?? true;
    this.referralInviteCount = options.referralInviteCount ?? 1;
    this.referralFirstPurchase = options.hasReferralFirstPurchase ?? true;
  }

  async hasClaim(userId: string, claimKey: string): Promise<boolean> {
    return this.claimKeys.get(userId)?.has(claimKey) ?? false;
  }

  async getClaimedDailyCheckinDates(
    _userId: string,
    calendarDates: string[],
  ): Promise<Set<string>> {
    return new Set(
      calendarDates.filter((calendarDate) =>
        this.claimedDailyCheckinDates.has(calendarDate),
      ),
    );
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
    this.claims.push(record);
    return true;
  }
}

export function createMemoryTaskRewardStore(
  options: MemoryTaskRewardStoreOptions = {},
): MemoryTaskRewardStore {
  return new MemoryTaskRewardStore(options);
}
