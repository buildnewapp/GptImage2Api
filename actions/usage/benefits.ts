'use server';

import { actionResponse, ActionResult } from '@/lib/action-response';
import { getSession } from '@/lib/auth/server';
import { getDb } from '@/lib/db';
import {
  creditLogs as creditLogsSchema,
  orders as ordersSchema,
  subscriptionCreditBuckets as subscriptionCreditBucketsSchema,
  subscriptions as subscriptionsSchema,
  usage as usageSchema,
} from '@/lib/db/schema';
import {
  applyDueYearlyAllocations,
  getNextYearlyCreditDate,
} from '@/lib/payments/subscription-credits';
import { and, desc, eq, gt, inArray, sql } from 'drizzle-orm';

export interface UserBenefits {
  activePlanId: string | null;
  subscriptionStatus: string | null; // e.g., 'active', 'trialing', 'past_due', 'canceled', null
  currentPeriodEnd: string | null;
  nextCreditDate: string | null;
  totalAvailableCredits: number;
  subscriptionCreditsBalance: number;
  oneTimeCreditsBalance: number;
  // Add other plan-specific benefits if needed, fetched via planId
}

interface UsageData {
  subscriptionCreditsBalance: number | null;
  oneTimeCreditsBalance: number | null;
  balanceJsonb: any;
}

interface SubscriptionData {
  planId: string;
  status: string;
  currentPeriodEnd: string | null;
}

const defaultUserBenefits: UserBenefits = {
  activePlanId: null,
  subscriptionStatus: null,
  currentPeriodEnd: null,
  nextCreditDate: null,
  totalAvailableCredits: 0,
  subscriptionCreditsBalance: 0,
  oneTimeCreditsBalance: 0,
};

function createUserBenefitsFromData(
  usageData: UsageData | null,
  subscription: SubscriptionData | null,
): UserBenefits {
  const subCredits = (usageData?.subscriptionCreditsBalance ?? 0) as number;
  const oneTimeCredits = (usageData?.oneTimeCreditsBalance ?? 0) as number;
  const totalCredits = subCredits + oneTimeCredits;

  const currentPeriodEnd = subscription?.currentPeriodEnd ?? null;
  const nextCreditDate = getNextYearlyCreditDate(usageData?.balanceJsonb) ?? null;

  let finalStatus = subscription?.status ?? null;
  if (finalStatus && subscription?.currentPeriodEnd && new Date(subscription.currentPeriodEnd) < new Date()) {
    finalStatus = 'inactive_period_ended';
  }

  return {
    activePlanId: (finalStatus === 'active' || finalStatus === 'trialing') ? subscription?.planId ?? null : null,
    subscriptionStatus: finalStatus,
    currentPeriodEnd,
    nextCreditDate,
    totalAvailableCredits: totalCredits,
    subscriptionCreditsBalance: subCredits,
    oneTimeCreditsBalance: oneTimeCredits,
  };
}

function addOneMonth(date: Date): Date {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

async function fetchSubscriptionData(
  userId: string
): Promise<SubscriptionData | null> {
  const db = getDb();

  try {
    const result = await db
      .select({
        planId: subscriptionsSchema.planId,
        status: subscriptionsSchema.status,
        currentPeriodEnd: subscriptionsSchema.currentPeriodEnd,
      })
      .from(subscriptionsSchema)
      .where(eq(subscriptionsSchema.userId, userId))
      .orderBy(desc(subscriptionsSchema.createdAt))
      .limit(1);

    if (result.length > 0) {
      const sub = result[0];
      return {
        ...sub,
        currentPeriodEnd: sub.currentPeriodEnd
          ? new Date(sub.currentPeriodEnd).toISOString()
          : null,
      };
    }

    return null;
  } catch (error) {
    console.error(
      `Unexpected error in fetchSubscriptionData for user ${userId}:`,
      error
    );
    return null;
  }
}

/**
 * Retrieves the user's current benefits
 * Server-side action.
 */
export async function getUserBenefits(userId: string): Promise<UserBenefits> {
  if (!userId) {
    return defaultUserBenefits;
  }

  const db = getDb();

  try {
    const result = await db
      .select({
        subscriptionCreditsBalance: usageSchema.subscriptionCreditsBalance,
        oneTimeCreditsBalance: usageSchema.oneTimeCreditsBalance,
        balanceJsonb: usageSchema.balanceJsonb,
      })
      .from(usageSchema)
      .where(eq(usageSchema.userId, userId));

    let finalUsageData: UsageData | null =
      (result.length > 0 ? result[0] : null) as UsageData | null;

    // ------------------------------------------
    // User with no usage data, it means he/she is a new user
    // ------------------------------------------
    // if (!usageData) {
    //   console.log(`New user(${userId}) with no usage data - may grant benefits if needed.`);
    //   finalUsageData = someFunctionToGrantBenefits(userId);
    // }

    // ------------------------------------------
    // Handle user subscription data (subscriptions table) and benefits data (usage table)
    // ------------------------------------------
    finalUsageData = await processYearlySubscriptionCatchUp(userId) ?? finalUsageData;

    const activeSubRows = await db
      .select({
        balance: sql<number>`coalesce(sum(${subscriptionCreditBucketsSchema.creditsRemaining}), 0)`,
      })
      .from(subscriptionCreditBucketsSchema)
      .where(
        and(
          eq(subscriptionCreditBucketsSchema.userId, userId),
          gt(subscriptionCreditBucketsSchema.creditsRemaining, 0),
          gt(subscriptionCreditBucketsSchema.expiresAt, new Date()),
        ),
      );
    const activeSubscriptionBalance = Number(activeSubRows[0]?.balance ?? 0);

    const subscription = await fetchSubscriptionData(userId);

    const normalizedUsage: UsageData = {
      subscriptionCreditsBalance: activeSubscriptionBalance,
      oneTimeCreditsBalance: finalUsageData?.oneTimeCreditsBalance ?? 0,
      balanceJsonb: finalUsageData?.balanceJsonb ?? {},
    };

    return createUserBenefitsFromData(
      normalizedUsage,
      subscription,
    );
  } catch (error) {
    console.error(`Unexpected error in getUserBenefits for user ${userId}:`, error);
    return defaultUserBenefits;
  }
}

/**
 * Retrieves the user's current benefits
 * Client-side action.
 */
export async function getClientUserBenefits(): Promise<ActionResult<UserBenefits>> {
  const session = await getSession()
  const user = session?.user;
  if (!user) return actionResponse.unauthorized();

  try {
    const benefits = await getUserBenefits(user.id);
    return actionResponse.success(benefits);
  } catch (error: any) {
    console.error("Error fetching user benefits for client:", error);
    return actionResponse.error(
      error.message || "Failed to fetch user benefits."
    );
  }
}

/**
 * Processes yearly subscription catch-up logic to allocate monthly credits
 * that may have been missed. This function handles the allocation of credits
 * for past months in a yearly subscription plan.
 *
 * @param userId The UUID of the user.
 * @returns A promise resolving to the updated UsageData or null if no usage data exists.
 */
async function processYearlySubscriptionCatchUp(
  userId: string
): Promise<UsageData | null> {
  const db = getDb();

  let finalUsageData: UsageData | null = null;
  let shouldContinue = true;

  while (shouldContinue) {
    shouldContinue = await db.transaction(async (tx) => {
      const usageResults = await tx
        .select()
        .from(usageSchema)
        .where(eq(usageSchema.userId, userId))
        .for('update');
      const usage = usageResults[0];

      if (!usage) {
        return false;
      }

      finalUsageData = usage as UsageData;
      const currentActiveSubRows = await tx
        .select({
          balance: sql<number>`coalesce(sum(${subscriptionCreditBucketsSchema.creditsRemaining}), 0)`,
        })
        .from(subscriptionCreditBucketsSchema)
        .where(
          and(
            eq(subscriptionCreditBucketsSchema.userId, userId),
            gt(subscriptionCreditBucketsSchema.creditsRemaining, 0),
            gt(subscriptionCreditBucketsSchema.expiresAt, new Date()),
          ),
        );
      const currentActiveSubBalance = Number(currentActiveSubRows[0]?.balance ?? 0);

      const allocationResult = applyDueYearlyAllocations({
        balanceJsonb: usage.balanceJsonb,
        currentBalance: currentActiveSubBalance,
      });

      if (allocationResult.grants.length === 0) {
        return false;
      }

      const relatedOrderIds = Array.from(
        new Set(allocationResult.grants.map((grant) => grant.relatedOrderId)),
      );
      const orderRows = relatedOrderIds.length
        ? await tx
            .select({
              id: ordersSchema.id,
              provider: ordersSchema.provider,
              subscriptionId: ordersSchema.subscriptionId,
            })
            .from(ordersSchema)
            .where(inArray(ordersSchema.id, relatedOrderIds))
        : [];
      const orderMap = new Map(orderRows.map((row) => [row.id, row]));
      const appliedGrants: typeof allocationResult.grants = [];

      for (const grant of allocationResult.grants) {
        const order = orderMap.get(grant.relatedOrderId);
        const provider = order?.provider;
        if (
          !order?.subscriptionId ||
          (provider !== 'stripe' && provider !== 'creem' && provider !== 'paypal')
        ) {
          continue;
        }
        const periodStart = new Date(grant.allocationDate);
        const periodEnd = addOneMonth(periodStart);

        await tx
          .insert(subscriptionCreditBucketsSchema)
          .values({
            userId,
            provider,
            subscriptionId: order.subscriptionId,
            periodStart,
            periodEnd,
            expiresAt: periodEnd,
            creditsTotal: grant.amount,
            creditsRemaining: grant.amount,
            relatedOrderId: grant.relatedOrderId,
          })
          .onConflictDoUpdate({
            target: [
              subscriptionCreditBucketsSchema.provider,
              subscriptionCreditBucketsSchema.subscriptionId,
              subscriptionCreditBucketsSchema.periodStart,
            ],
            set: {
              periodEnd,
              expiresAt: periodEnd,
              creditsTotal: grant.amount,
              creditsRemaining: grant.amount,
              relatedOrderId: grant.relatedOrderId,
            },
          });
        appliedGrants.push(grant);
      }

      const updatedSubRows = await tx
        .select({
          balance: sql<number>`coalesce(sum(${subscriptionCreditBucketsSchema.creditsRemaining}), 0)`,
        })
        .from(subscriptionCreditBucketsSchema)
        .where(
          and(
            eq(subscriptionCreditBucketsSchema.userId, userId),
            gt(subscriptionCreditBucketsSchema.creditsRemaining, 0),
            gt(subscriptionCreditBucketsSchema.expiresAt, new Date()),
          ),
        );
      const nextSubscriptionBalance = Number(updatedSubRows[0]?.balance ?? 0);

      const updatedUsage = await tx
        .update(usageSchema)
        .set({
          subscriptionCreditsBalance: nextSubscriptionBalance,
          balanceJsonb: allocationResult.nextBalanceJsonb,
        })
        .where(eq(usageSchema.userId, userId))
        .returning({
          oneTimeCreditsSnapshot: usageSchema.oneTimeCreditsBalance,
          subscriptionCreditsSnapshot: usageSchema.subscriptionCreditsBalance,
        });

      const balances = updatedUsage[0];
      if (balances) {
        let runningSubscriptionSnapshot =
          balances.subscriptionCreditsSnapshot - appliedGrants.reduce((sum, grant) => sum + grant.amount, 0);

        for (const grant of appliedGrants) {
          runningSubscriptionSnapshot += grant.amount;
          await tx.insert(creditLogsSchema).values({
            userId: userId,
            amount: grant.amount,
            oneTimeCreditsSnapshot: balances.oneTimeCreditsSnapshot,
            subscriptionCreditsSnapshot: runningSubscriptionSnapshot,
            type: 'subscription_grant',
            notes: `Yearly subscription monthly credits allocated`,
            relatedOrderId: grant.relatedOrderId,
            createdAt: grant.allocationDate,
          });
        }
      }

      return true;
    });
  }

  return finalUsageData;
}
