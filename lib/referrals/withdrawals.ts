import { getDb } from "@/lib/db";
import {
  referralRewards as referralRewardsSchema,
  referralWithdrawRequests as referralWithdrawRequestsSchema,
} from "@/lib/db/schema";
import { and, eq, inArray, lte } from "drizzle-orm";

export interface ReferralWithdrawalStore {
  unlockEligibleRewards(): Promise<void>;
  getClaimableRewards(): Promise<Array<{ id: string; cashAmountUsd: number }>>;
  createWithdrawalRequest(input: {
    userId: string;
    amountUsd: number;
    rewardIds: string[];
  }): Promise<string>;
  markRewardsPendingWithdraw(
    rewardIds: string[],
    withdrawRequestId: string
  ): Promise<void>;
  getWithdrawalRequest(requestId: string): Promise<{
    status: "pending" | "approved" | "paid" | "rejected";
    rewardIds: string[];
  } | null>;
  markWithdrawalRequestPaid(requestId: string): Promise<void>;
  markWithdrawalRequestRejected(requestId: string): Promise<void>;
  markRewardsPaidForRequest(requestId: string): Promise<void>;
  restoreClaimableRewardsForRequest(requestId: string): Promise<void>;
}

type DbClient = ReturnType<typeof getDb>;
type DbTransactionCallback = Parameters<DbClient["transaction"]>[0];
type DbTransaction = Parameters<DbTransactionCallback>[0];

export async function collectClaimableReferralRewards({
  store,
  userId,
}: {
  store: ReferralWithdrawalStore;
  userId: string;
}): Promise<{ status: "no_claimable_rewards" | "request_created" }> {
  await store.unlockEligibleRewards();

  const claimableRewards = await store.getClaimableRewards();
  if (claimableRewards.length === 0) {
    return { status: "no_claimable_rewards" };
  }

  const amountUsd = claimableRewards.reduce(
    (total, reward) => total + reward.cashAmountUsd,
    0
  );
  const rewardIds = claimableRewards.map((reward) => reward.id);

  const withdrawRequestId = await store.createWithdrawalRequest({
    userId,
    amountUsd,
    rewardIds,
  });
  await store.markRewardsPendingWithdraw(rewardIds, withdrawRequestId);

  return { status: "request_created" };
}

export async function processReferralWithdrawalRequest({
  store,
  requestId,
  action,
}: {
  store: ReferralWithdrawalStore;
  requestId: string;
  action: "paid" | "rejected";
}): Promise<{ status: "processed" | "not_found" | "already_processed" }> {
  const request = await store.getWithdrawalRequest(requestId);

  if (!request) {
    return { status: "not_found" };
  }

  if (request.status !== "pending") {
    return { status: "already_processed" };
  }

  if (action === "paid") {
    await store.markWithdrawalRequestPaid(requestId);
    await store.markRewardsPaidForRequest(requestId);
    return { status: "processed" };
  }

  await store.markWithdrawalRequestRejected(requestId);
  await store.restoreClaimableRewardsForRequest(requestId);
  return { status: "processed" };
}

export async function createReferralWithdrawalRequest(userId: string) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const store = createDrizzleReferralWithdrawalStore(tx, userId);
    return collectClaimableReferralRewards({ store, userId });
  });
}

export async function unlockReferralRewardsForUser(userId: string): Promise<void> {
  const db = getDb();

  await db.transaction(async (tx) => {
    const store = createDrizzleReferralWithdrawalStore(tx, userId);
    await store.unlockEligibleRewards();
  });
}

export async function processReferralWithdrawalRequestById(
  requestId: string,
  action: "paid" | "rejected"
) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const store = createDrizzleReferralWithdrawalStore(tx, "");
    return processReferralWithdrawalRequest({
      store,
      requestId,
      action,
    });
  });
}

function createDrizzleReferralWithdrawalStore(
  tx: DbTransaction,
  userId: string
): ReferralWithdrawalStore {
  return {
    async unlockEligibleRewards() {
      await tx
        .update(referralRewardsSchema)
        .set({
          status: "claimable",
        })
        .where(
          and(
            eq(referralRewardsSchema.inviterUserId, userId),
            eq(referralRewardsSchema.status, "locked"),
            lte(referralRewardsSchema.availableAt, new Date())
          )
        );
    },

    async getClaimableRewards() {
      const rewards = await tx
        .select({
          id: referralRewardsSchema.id,
          cashAmountUsd: referralRewardsSchema.cashAmountUsd,
        })
        .from(referralRewardsSchema)
        .where(
          and(
            eq(referralRewardsSchema.inviterUserId, userId),
            eq(referralRewardsSchema.status, "claimable")
          )
        );

      return rewards
        .filter((reward) => reward.cashAmountUsd !== null)
        .map((reward) => ({
          id: reward.id,
          cashAmountUsd: Number(reward.cashAmountUsd),
        }));
    },

    async createWithdrawalRequest({ amountUsd }) {
      const records = await tx
        .insert(referralWithdrawRequestsSchema)
        .values({
          userId,
          amountUsd: amountUsd.toFixed(2),
          status: "pending",
          notes: "User requested manual referral withdrawal",
        })
        .returning({ id: referralWithdrawRequestsSchema.id });

      const withdrawRequestId = records[0]?.id;
      if (!withdrawRequestId) {
        throw new Error("Failed to create referral withdrawal request");
      }

      return withdrawRequestId;
    },

    async markRewardsPendingWithdraw(rewardIds, withdrawRequestId) {
      if (rewardIds.length === 0) {
        return;
      }

      await tx
        .update(referralRewardsSchema)
        .set({
          status: "pending_withdraw",
          withdrawRequestId,
        })
        .where(inArray(referralRewardsSchema.id, rewardIds));
    },

    async getWithdrawalRequest(requestId) {
      const request = await tx
        .select({
          status: referralWithdrawRequestsSchema.status,
        })
        .from(referralWithdrawRequestsSchema)
        .where(eq(referralWithdrawRequestsSchema.id, requestId))
        .limit(1);

      const rewardIds = await tx
        .select({ id: referralRewardsSchema.id })
        .from(referralRewardsSchema)
        .where(eq(referralRewardsSchema.withdrawRequestId, requestId));

      const requestRecord = request[0];
      if (!requestRecord) {
        return null;
      }

      return {
        status: requestRecord.status,
        rewardIds: rewardIds.map((reward) => reward.id),
      };
    },

    async markWithdrawalRequestPaid(requestId) {
      await tx
        .update(referralWithdrawRequestsSchema)
        .set({
          status: "paid",
          processedAt: new Date(),
        })
        .where(eq(referralWithdrawRequestsSchema.id, requestId));
    },

    async markWithdrawalRequestRejected(requestId) {
      await tx
        .update(referralWithdrawRequestsSchema)
        .set({
          status: "rejected",
          processedAt: new Date(),
        })
        .where(eq(referralWithdrawRequestsSchema.id, requestId));
    },

    async markRewardsPaidForRequest(requestId) {
      await tx
        .update(referralRewardsSchema)
        .set({
          status: "paid",
        })
        .where(eq(referralRewardsSchema.withdrawRequestId, requestId));
    },

    async restoreClaimableRewardsForRequest(requestId) {
      await tx
        .update(referralRewardsSchema)
        .set({
          status: "claimable",
          withdrawRequestId: null,
        })
        .where(eq(referralRewardsSchema.withdrawRequestId, requestId));
    },
  };
}
