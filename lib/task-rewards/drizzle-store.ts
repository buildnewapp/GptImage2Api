import { getDb } from "@/lib/db";
import {
  aiStudioGenerations as aiStudioGenerationsSchema,
  creditLogs as creditLogsSchema,
  orders as ordersSchema,
  referralInvites as referralInvitesSchema,
  referralRewards as referralRewardsSchema,
  subscriptions as subscriptionsSchema,
  taskRewardClaims as taskRewardClaimsSchema,
  usage as usageSchema,
} from "@/lib/db/schema";
import type { TaskRewardStore } from "@/lib/task-rewards/types";
import {
  and,
  count,
  eq,
  gt,
  inArray,
  isNull,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";

type DbClient = ReturnType<typeof getDb>;
type DbTransactionCallback = Parameters<DbClient["transaction"]>[0];
type DbTransaction = Parameters<DbTransactionCallback>[0];

export const TASK_REWARD_CREDIT_LOG_TYPE = "task_reward";
export const DAILY_CHECKIN_CREDIT_EXPIRY_DAYS = 30;

async function expireDailyCheckinCredits(
  tx: DbTransaction,
  userId: string,
  now: Date,
): Promise<number> {
  const expiresBefore = new Date(
    now.getTime() - DAILY_CHECKIN_CREDIT_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  );
  const expiredClaims = await tx
    .select({
      id: taskRewardClaimsSchema.id,
      creditAmount: taskRewardClaimsSchema.creditAmount,
    })
    .from(taskRewardClaimsSchema)
    .where(
      and(
        eq(taskRewardClaimsSchema.userId, userId),
        eq(taskRewardClaimsSchema.taskKey, "daily_checkin"),
        lte(taskRewardClaimsSchema.claimedAt, expiresBefore),
        sql`(${taskRewardClaimsSchema.metadata}->>'expiredAt') is null`,
      ),
    )
    .for("update");

  if (expiredClaims.length === 0) {
    return 0;
  }

  const expiredCredits = expiredClaims.reduce(
    (sum, claim) => sum + claim.creditAmount,
    0,
  );
  const usageRows = await tx
    .select({
      oneTimeCreditsBalance: usageSchema.oneTimeCreditsBalance,
      subscriptionCreditsBalance: usageSchema.subscriptionCreditsBalance,
    })
    .from(usageSchema)
    .where(eq(usageSchema.userId, userId))
    .for("update");
  const usage = usageRows[0];
  const expiredFromBalance = Math.min(
    expiredCredits,
    usage?.oneTimeCreditsBalance ?? 0,
  );

  if (usage && expiredFromBalance > 0) {
    const nextOneTimeBalance =
      usage.oneTimeCreditsBalance - expiredFromBalance;
    await tx
      .update(usageSchema)
      .set({ oneTimeCreditsBalance: nextOneTimeBalance })
      .where(eq(usageSchema.userId, userId));

    await tx.insert(creditLogsSchema).values({
      userId,
      amount: -expiredFromBalance,
      oneTimeCreditsSnapshot: nextOneTimeBalance,
      subscriptionCreditsSnapshot: usage.subscriptionCreditsBalance,
      type: "task_reward_expiry",
      notes: `Daily check-in credits expired after ${DAILY_CHECKIN_CREDIT_EXPIRY_DAYS} days`,
    });
  }

  for (const claim of expiredClaims) {
    await tx
      .update(taskRewardClaimsSchema)
      .set({
        metadata: sql`${taskRewardClaimsSchema.metadata} || jsonb_build_object('expiredAt', ${now.toISOString()})`,
      })
      .where(eq(taskRewardClaimsSchema.id, claim.id));
  }

  return expiredFromBalance;
}

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

    async getDailyCheckinStreak(userId, calendarDate) {
      return getDailyCheckinStreakForUser(tx, userId, calendarDate);
    },

    async getDailyCheckinCount(userId) {
      const result = await tx
        .select({ value: count() })
        .from(taskRewardClaimsSchema)
        .where(
          and(
            eq(taskRewardClaimsSchema.userId, userId),
            eq(taskRewardClaimsSchema.taskKey, "daily_checkin"),
          ),
        );

      return result[0]?.value ?? 0;
    },

    async hasValidSubscription(userId, now) {
      const activeSubscriptions = await tx
        .select({ id: subscriptionsSchema.id })
        .from(subscriptionsSchema)
        .where(
          and(
            eq(subscriptionsSchema.userId, userId),
            gt(subscriptionsSchema.currentPeriodEnd, now),
            or(
              inArray(subscriptionsSchema.status, ["active", "trialing"]),
              inArray(subscriptionsSchema.status, [
                "canceled",
                "cancelled",
                "scheduled_cancel",
              ]),
            ),
          ),
        )
        .limit(1);

      return activeSubscriptions.length > 0;
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
      if (record.taskKey === "daily_checkin") {
        await expireDailyCheckinCredits(tx, record.userId, new Date());
      }

      const inserted = await tx
        .insert(taskRewardClaimsSchema)
        .values({
          userId: record.userId,
          taskKey: record.taskKey,
          claimKey: record.claimKey,
          creditAmount: record.creditAmount,
          metadata: record.metadata ?? {},
        })
        .onConflictDoNothing()
        .returning({ id: taskRewardClaimsSchema.id });

      if (!inserted[0]) {
        return false;
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
    .select({ id: aiStudioGenerationsSchema.id })
    .from(aiStudioGenerationsSchema)
    .where(
      and(
        eq(aiStudioGenerationsSchema.userId, userId),
        eq(aiStudioGenerationsSchema.category, "video"),
        eq(aiStudioGenerationsSchema.status, "succeeded"),
        eq(aiStudioGenerationsSchema.isPublic, true),
        isNull(aiStudioGenerationsSchema.userDeletedAt),
      ),
    )
    .limit(1);

  return rows.length > 0;
}

// Count consecutive UTC check-ins ending yesterday, excluding today's claim.
export async function getDailyCheckinStreakForUser(
  db: DbTransaction | DbClient,
  userId: string,
  calendarDate: string,
): Promise<number> {
  const previousCheckins = db
    .select({
      calendarDate:
        sql<string>`split_part(${taskRewardClaimsSchema.claimKey}, ':', 2)::date`.as(
          "calendar_date",
        ),
      position:
        sql<number>`row_number() over (order by ${taskRewardClaimsSchema.claimKey} desc)`.as(
          "position",
        ),
    })
    .from(taskRewardClaimsSchema)
    .where(
      and(
        eq(taskRewardClaimsSchema.userId, userId),
        eq(taskRewardClaimsSchema.taskKey, "daily_checkin"),
        lt(taskRewardClaimsSchema.claimKey, `daily_checkin:${calendarDate}`),
      ),
    )
    .as("previous_checkins");
  const result = await db
    .select({ value: count() })
    .from(previousCheckins)
    .where(
      sql`${previousCheckins.calendarDate} = ${calendarDate}::date - ${previousCheckins.position}::integer`,
    );

  return result[0]?.value ?? 0;
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
