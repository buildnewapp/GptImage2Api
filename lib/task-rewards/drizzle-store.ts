import { getDb } from "@/lib/db";
import {
  creditLogs as creditLogsSchema,
  orders as ordersSchema,
  referralInvites as referralInvitesSchema,
  referralRewards as referralRewardsSchema,
  taskRewardClaims as taskRewardClaimsSchema,
  usage as usageSchema,
  videoGenerations as videoGenerationsSchema,
} from "@/lib/db/schema";
import type { TaskRewardStore } from "@/lib/task-rewards/types";
import { and, count, eq, inArray, sql } from "drizzle-orm";

type DbClient = ReturnType<typeof getDb>;
type DbTransactionCallback = Parameters<DbClient["transaction"]>[0];
type DbTransaction = Parameters<DbTransactionCallback>[0];

export const TASK_REWARD_CREDIT_LOG_TYPE = "task_reward";

export function createDrizzleTaskRewardStore(
  tx: DbTransaction,
): TaskRewardStore {
  return {
    async hasClaim(userId, claimKey) {
      const existing = await tx
        .select({ id: taskRewardClaimsSchema.id })
        .from(taskRewardClaimsSchema)
        .where(
          and(
            eq(taskRewardClaimsSchema.userId, userId),
            eq(taskRewardClaimsSchema.claimKey, claimKey),
          ),
        )
        .limit(1);

      return existing.length > 0;
    },

    async getClaimedDailyCheckinDates(userId, calendarDates) {
      return getClaimedDailyCheckinDatesForUser(tx, userId, calendarDates);
    },

    async hasSuccessfulPublicGeneration(userId) {
      return hasSuccessfulPublicGenerationForUser(tx, userId);
    },

    async hasSuccessfulPurchase(userId) {
      return hasSuccessfulPurchaseForUser(tx, userId);
    },

    async countReferralInvites(userId) {
      return countReferralInvitesForUser(tx, userId);
    },

    async hasReferralFirstPurchase(userId) {
      return hasReferralFirstPurchaseForUser(tx, userId);
    },

    async createClaim(record) {
      try {
        await tx.insert(taskRewardClaimsSchema).values({
          userId: record.userId,
          taskKey: record.taskKey,
          claimKey: record.claimKey,
          creditAmount: record.creditAmount,
          metadata: record.metadata ?? {},
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.toLowerCase().includes("unique")) {
          return false;
        }
        throw error;
      }

      const updatedUsage = await tx
        .insert(usageSchema)
        .values({
          userId: record.userId,
          oneTimeCreditsBalance: record.creditAmount,
        })
        .onConflictDoUpdate({
          target: usageSchema.userId,
          set: {
            oneTimeCreditsBalance: sql`${usageSchema.oneTimeCreditsBalance} + ${record.creditAmount}`,
          },
        })
        .returning({
          oneTimeCreditsSnapshot: usageSchema.oneTimeCreditsBalance,
          subscriptionCreditsSnapshot: usageSchema.subscriptionCreditsBalance,
        });

      const balances = updatedUsage[0];
      if (!balances) {
        throw new Error("Failed to update usage for task reward claim");
      }

      await tx.insert(creditLogsSchema).values({
        userId: record.userId,
        amount: record.creditAmount,
        oneTimeCreditsSnapshot: balances.oneTimeCreditsSnapshot,
        subscriptionCreditsSnapshot: balances.subscriptionCreditsSnapshot,
        type: TASK_REWARD_CREDIT_LOG_TYPE,
        notes: `Task reward claimed: ${record.taskKey}`,
      });

      return true;
    },
  };
}

export async function hasSuccessfulPublicVideoForUser(
  db: DbTransaction | DbClient,
  userId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: videoGenerationsSchema.id })
    .from(videoGenerationsSchema)
    .where(
      and(
        eq(videoGenerationsSchema.userId, userId),
        eq(videoGenerationsSchema.status, "success"),
        eq(videoGenerationsSchema.isPublic, true),
      ),
    )
    .limit(1);

  return rows.length > 0;
}

export async function getClaimedDailyCheckinDatesForUser(
  db: DbTransaction | DbClient,
  userId: string,
  calendarDates: string[],
): Promise<Set<string>> {
  if (calendarDates.length === 0) {
    return new Set();
  }

  const claimKeys = calendarDates.map(
    (calendarDate) => `daily_checkin:${calendarDate}`,
  );
  const rows = await db
    .select({ claimKey: taskRewardClaimsSchema.claimKey })
    .from(taskRewardClaimsSchema)
    .where(
      and(
        eq(taskRewardClaimsSchema.userId, userId),
        eq(taskRewardClaimsSchema.taskKey, "daily_checkin"),
        inArray(taskRewardClaimsSchema.claimKey, claimKeys),
      ),
    );

  return new Set(rows.map((row) => row.claimKey.split(":")[1] ?? ""));
}

export async function hasSuccessfulPublicGenerationForUser(
  db: DbTransaction | DbClient,
  userId: string,
): Promise<boolean> {
  return hasSuccessfulPublicVideoForUser(db, userId);
}

export async function hasSuccessfulPurchaseForUser(
  db: DbTransaction | DbClient,
  userId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: ordersSchema.id })
    .from(ordersSchema)
    .where(
      and(
        eq(ordersSchema.userId, userId),
        eq(ordersSchema.status, "succeeded"),
      ),
    )
    .limit(1);

  return rows.length > 0;
}

export async function getTaskClaimLookup(
  db: DbClient,
  userId: string,
  claimKeys: string[],
): Promise<Set<string>> {
  if (claimKeys.length === 0) {
    return new Set();
  }

  const rows = await db
    .select({ claimKey: taskRewardClaimsSchema.claimKey })
    .from(taskRewardClaimsSchema)
    .where(
      and(
        eq(taskRewardClaimsSchema.userId, userId),
        inArray(taskRewardClaimsSchema.claimKey, claimKeys),
      ),
    );

  return new Set(rows.map((row) => row.claimKey));
}

export async function countReferralInvitesForUser(
  db: DbTransaction | DbClient,
  inviterUserId: string,
): Promise<number> {
  const result = await db
    .select({ value: count() })
    .from(referralInvitesSchema)
    .where(eq(referralInvitesSchema.inviterUserId, inviterUserId));

  return result[0]?.value ?? 0;
}

export async function hasReferralFirstPurchaseForUser(
  db: DbTransaction | DbClient,
  inviterUserId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: referralRewardsSchema.id })
    .from(referralRewardsSchema)
    .where(
      and(
        eq(referralRewardsSchema.inviterUserId, inviterUserId),
        eq(referralRewardsSchema.rewardType, "first_order_cash"),
      ),
    )
    .limit(1);

  return rows.length > 0;
}
