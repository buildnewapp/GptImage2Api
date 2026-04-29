/**
 * Credit Management System
 * 
 * This module handles all credit-related operations for the payment system.
 * It is provider-agnostic and used by all payment providers (Stripe, Creem, etc.)
 * 
 * Key Operations:
 * - Upgrade one-time credits (one-time purchases)
 * - Upgrade subscription credits (monthly/yearly subscriptions)
 * - Revoke one-time credits (refunds)
 * - Revoke subscription credits (subscription refunds)
 * - Revoke remaining credits (subscription cancellation/expiration)
 * 
 * 这个模块处理支付系统的所有积分相关操作。
 * 它是提供商无关的，由所有支付提供商（Stripe、Creem 等）使用。
 * 
 * このモジュールは、支払いシステムのすべてのクレジット関連操作を処理します。
 * プロバイダーに依存せず、すべての支払いプロバイダー（Stripe、Creem など）で使用されます。
 */

import { getDb } from '@/lib/db';
import {
  creditLogs as creditLogsSchema,
  PaymentProvider,
  pricingPlans as pricingPlansSchema,
  subscriptionCreditBuckets as subscriptionCreditBucketsSchema,
  usage as usageSchema,
} from '@/lib/db/schema';
import { isYearlyInterval } from '@/lib/payments/provider-utils';
import {
  buildYearlyAllocationEntry,
  mergeYearlyAllocation,
} from '@/lib/payments/subscription-credits';
import type {
  Order,
} from '@/lib/payments/types';
import { and, asc, eq, gt, lte, sql } from 'drizzle-orm';

// ============================================================================
// One-Time Credit Operations
// ============================================================================

/**
 * Upgrades one-time credits for a user based on their plan purchase.
 * 
 * 根据用户购买的计划为用户升级一次性积分。
 * 
 * ユーザーのプラン購入に基づいて、ユーザーのワンタイムクレジットをアップグレードします。
 * 
 * @param userId - The user's ID
 * @param planId - The plan's ID
 * @param orderId - The order's ID
 */
export async function upgradeOneTimeCredits(userId: string, planId: string, orderId: string) {
  const db = getDb();

  // --- TODO: [custom] Upgrade the user's benefits ---
  /**
   * Complete the user's benefit upgrade based on your business logic.
   * We recommend defining benefits in the `benefitsJsonb` field within your pricing plans (accessible in the dashboard at /dashboard/prices). This code upgrades the user's benefits based on those defined benefits.
   * The following code provides an example using `oneTimeCredits`.  Modify the code below according to your specific business logic if you need to upgrade other benefits.
   * 
   * 根据你的业务逻辑，为用户完成权益升级。
   * 我们建议在定价方案的 `benefitsJsonb` 字段中（可在仪表板的 /dashboard/prices 访问）定义权益。此代码会根据定义的权益，为用户完成权益升级。
   * 以下代码以 `oneTimeCredits` 为例。如果你需要升级其他权益，请根据你的具体业务逻辑修改以下代码。
   * 
   * お客様のビジネスロジックに基づいて、ユーザーの特典アップグレードを完了させてください。
   * 特典は、料金プランの `benefitsJsonb` フィールド（ダッシュボードの /dashboard/prices でアクセス可能）で定義することをお勧めします。このコードは、定義された特典に基づいて、ユーザーの特典をアップグレードします。
   * 以下のコードは、`oneTimeCredits` を使用した例です。他の特典をアップグレードする必要がある場合は、お客様のビジネスロジックに従って、以下のコードを修正してください。
   */
  const planDataResults = await db
    .select({ benefitsJsonb: pricingPlansSchema.benefitsJsonb })
    .from(pricingPlansSchema)
    .where(eq(pricingPlansSchema.id, planId))
    .limit(1);
  const planData = planDataResults[0];

  if (!planData) {
    throw new Error(`Could not fetch plan benefits for ${planId}`);
  }

  const creditsToGrant = (planData.benefitsJsonb as any)?.oneTimeCredits || 0;

  if (creditsToGrant && creditsToGrant > 0) {
    let attempts = 0;
    const maxAttempts = 3;
    let lastError: any = null;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        await db.transaction(async (tx) => {
          const updatedUsage = await tx
            .insert(usageSchema)
            .values({
              userId: userId,
              oneTimeCreditsBalance: creditsToGrant,
            })
            .onConflictDoUpdate({
              target: usageSchema.userId,
              set: {
                oneTimeCreditsBalance: sql`${usageSchema.oneTimeCreditsBalance} + ${creditsToGrant}`,
              },
            })
            .returning({
              oneTimeCreditsSnapshot: usageSchema.oneTimeCreditsBalance,
              subscriptionCreditsSnapshot: usageSchema.subscriptionCreditsBalance,
            });

          const balances = updatedUsage[0];
          if (!balances) {
            throw new Error('Failed to update usage and get new balances.');
          }

          await tx.insert(creditLogsSchema).values({
            userId: userId,
            amount: creditsToGrant,
            oneTimeCreditsSnapshot: balances.oneTimeCreditsSnapshot,
            subscriptionCreditsSnapshot: balances.subscriptionCreditsSnapshot,
            type: 'one_time_purchase',
            notes: 'One-time credit purchase',
            relatedOrderId: orderId,
          });
        });
        console.log(`Successfully granted one-time credits for user ${userId} on attempt ${attempts}.`);
        return; // Success, exit the function
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${attempts} failed for grant one-time credits and log for user ${userId}. Retrying in ${attempts}s...`, (lastError as Error).message);
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, attempts * 1000));
        }
      }
    }

    if (lastError) {
      console.error(`Error updating usage (one-time credits, userId: ${userId}, creditsToGrant: ${creditsToGrant}) after ${maxAttempts} attempts:`, lastError);
      throw lastError;
    }
  } else {
    console.log(`No one-time credits defined or amount is zero for plan ${planId}. Skipping credit grant.`);
  }
  // --- End: [custom] Upgrade the user's benefits ---
}

/**
 * Revokes one-time credits for a refunded order.
 * 
 * 为退款订单撤销一次性积分。
 * 
 * 返金された注文のワンタイムクレジットを取り消します。
 * 
 * @param refundAmountCents - The refund amount in cents
 * @param originalOrder - The original order being refunded
 * @param refundOrderId - The refund order's ID
 */
export async function revokeOneTimeCredits(refundAmountCents: number, originalOrder: Order, refundOrderId: string) {
  const db = getDb();

  // --- TODO: [custom] Revoke the user's one time purchase benefits ---
  /**
   * Complete the user's benefit revoke based on your business logic.
   * We recommend defining benefits in the `benefitsJsonb` field within your pricing plans (accessible in the dashboard at /dashboard/prices). This code revokes the user's benefits based on those defined benefits.
   * The following code provides examples using `oneTimeCredits`.  If you need to revoke other benefits, please modify the code below based on your specific business logic.
   * 
   * 根据你的业务逻辑，取消退款用户的付费权益。
   * 我们建议在定价方案的 `benefitsJsonb` 字段中（可在仪表板的 /dashboard/prices 访问）定义权益。此代码会根据定义的权益，取消退款用户的付费权益。
   * 以下代码以 `oneTimeCredits` 为例。如果你需要取消其他权益，请根据你的具体业务逻辑修改以下代码。
   * 
   * お客様のビジネスロジックに基づいて、ユーザーの特典を取消してください。
   * 特典は、料金プランの `benefitsJsonb` フィールド（ダッシュボードの /dashboard/prices でアクセス可能）で定義することをお勧めします。このコードは、定義された特典に基づいて、ユーザーの特典を取消します。
   * 以下のコードは、`oneTimeCredits` を使用した例です。他の特典を取消する必要がある場合は、お客様のビジネスロジックに従って、以下のコードを修正してください。
   */
  const planId = originalOrder.planId as string;
  const userId = originalOrder.userId as string;

  const isFullRefund = refundAmountCents === Math.round(parseFloat(originalOrder.amountTotal!) * 100);

  if (isFullRefund) {
    const planDataResults = await db
      .select({ benefitsJsonb: pricingPlansSchema.benefitsJsonb })
      .from(pricingPlansSchema)
      .where(eq(pricingPlansSchema.id, planId))
      .limit(1);
    const planData = planDataResults[0];

    if (!planData) {
      console.error(`Error fetching plan benefits for planId ${planId} during refund ${refundOrderId}:`);
    } else {
      let oneTimeToRevoke = 0;
      const benefits = planData.benefitsJsonb as any;

      if (benefits?.oneTimeCredits > 0) {
        oneTimeToRevoke = benefits.oneTimeCredits;
      }

      if (oneTimeToRevoke > 0) {
        try {
          await db.transaction(async (tx) => {
            const usageResults = await tx.select().from(usageSchema).where(eq(usageSchema.userId, userId)).for('update');
            const usage = usageResults[0];

            if (!usage) { return; }

            const newOneTimeBalance = Math.max(0, usage.oneTimeCreditsBalance - oneTimeToRevoke);
            const amountRevoked = usage.oneTimeCreditsBalance - newOneTimeBalance;

            if (amountRevoked > 0) {
              await tx.update(usageSchema)
                .set({ oneTimeCreditsBalance: newOneTimeBalance })
                .where(eq(usageSchema.userId, userId));

              await tx.insert(creditLogsSchema).values({
                userId,
                amount: -amountRevoked,
                oneTimeCreditsSnapshot: newOneTimeBalance,
                subscriptionCreditsSnapshot: usage.subscriptionCreditsBalance,
                type: 'refund_revoke',
                notes: `Full refund for order ${originalOrder.id}.`,
                relatedOrderId: originalOrder.id,
              });
            }
          });
          console.log(`Successfully revoked credits for user ${userId} related to refund ${refundOrderId}.`);
        } catch (revokeError) {
          console.error(`Error calling revoke credits and log for user ${userId}, refund ${refundOrderId}:`, revokeError);
        }
      } else {
        console.log(`No credits defined to revoke for plan ${planId}, order type ${originalOrder.orderType} on refund ${refundOrderId}.`);
      }
    }
  } else {
    console.log(`Refund ${refundOrderId} is not a full refund. Skipping credit revocation. Refunded: ${refundAmountCents}, Original Total: ${parseFloat(originalOrder.amountTotal!) * 100}`);
  }
  // --- End: [custom] Revoke the user's one time purchase benefits ---
}

// ============================================================================
// Subscription Credit Operations
// ============================================================================

/**
 * Upgrades subscription credits for a user based on their subscription plan.
 * Handles both monthly and yearly subscription intervals.
 * 
 * 根据用户的订阅计划为用户升级订阅积分。
 * 处理月度和年度订阅间隔。
 * 
 * ユーザーのサブスクリプションプランに基づいて、ユーザーのサブスクリプションクレジットをアップグレードします。
 * 月次および年次のサブスクリプション間隔を処理します。
 * 
 * @param userId - The user's ID
 * @param planId - The plan's ID
 * @param orderId - The order's ID
 * @param currentPeriodStart - The subscription period start time (13-digit timestamp)
 */
interface UpgradeSubscriptionCreditsOptions {
  provider?: PaymentProvider;
  subscriptionId?: string | null;
  periodEnd?: number | string | Date | null;
}

function parseDateInput(value: number | string | Date | null | undefined): Date | null {
  if (value === null || value === undefined) {
    return null;
  }
  const normalizedValue =
    typeof value === 'number' && value > 0 && value < 1_000_000_000_000
      ? value * 1000
      : value;
  const date = normalizedValue instanceof Date ? new Date(normalizedValue) : new Date(normalizedValue);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

function removeYearlyAllocationByOrderId(balanceJsonb: any, orderId: string) {
  const source =
    typeof balanceJsonb === 'object' && balanceJsonb !== null
      ? { ...balanceJsonb }
      : {};

  const next = { ...source };
  const yearlyAllocations =
    typeof next.yearlyAllocations === 'object' && next.yearlyAllocations !== null
      ? { ...next.yearlyAllocations }
      : {};

  delete yearlyAllocations[orderId];
  if (Object.keys(yearlyAllocations).length > 0) {
    next.yearlyAllocations = yearlyAllocations;
  } else {
    delete next.yearlyAllocations;
  }

  if (next.yearlyAllocationDetails?.relatedOrderId === orderId) {
    delete next.yearlyAllocationDetails;
  }

  return next;
}

function removeYearlyAllocationsByOrderIds(balanceJsonb: any, relatedOrderIds: string[]) {
  if (relatedOrderIds.length === 0) {
    return balanceJsonb;
  }

  let next = balanceJsonb;
  for (const orderId of relatedOrderIds) {
    next = removeYearlyAllocationByOrderId(next, orderId);
  }
  return next;
}

export async function upgradeSubscriptionCredits(
  userId: string,
  planId: string,
  orderId: string,
  currentPeriodStart: number,
  options?: UpgradeSubscriptionCreditsOptions,
) {
  const db = getDb();

  // --- TODO: [custom] Upgrade the user's benefits ---
  /**
   * Complete the user's benefit upgrade based on your business logic.
   * We recommend defining benefits in the `benefitsJsonb` field within your pricing plans (accessible in the dashboard at /dashboard/prices). This code upgrades the user's benefits based on those defined benefits.
   * The following code provides an example using `monthlyCredits`.  Modify the code below according to your specific business logic if you need to upgrade other benefits.
   * 
   * 根据你的业务逻辑，为用户完成权益升级。
   * 我们建议在定价方案的 `benefitsJsonb` 字段中（可在仪表板的 /dashboard/prices 访问）定义权益。此代码会根据定义的权益，为用户完成权益升级。
   * 以下代码以 `monthlyCredits` 为例。如果你需要升级其他权益，请根据你的具体业务逻辑修改以下代码。
   * 
   * お客様のビジネスロジックに基づいて、ユーザーの特典アップグレードを完了させてください。
   * 特典は、料金プランの `benefitsJsonb` フィールド（ダッシュボードの /dashboard/prices でアクセス可能）で定義することをお勧めします。このコードは、定義された特典に基づいて、ユーザーの特典をアップグレードします。
   * 以下のコードは、`monthlyCredits` を使用した例です。他の特典をアップグレードする必要がある場合は、お客様のビジネスロジックに従って、以下のコードを修正してください。
   */
  try {
    const planDataResults = await db
      .select({
        recurringInterval: pricingPlansSchema.recurringInterval,
        benefitsJsonb: pricingPlansSchema.benefitsJsonb,
      })
      .from(pricingPlansSchema)
      .where(eq(pricingPlansSchema.id, planId))
      .limit(1);
    const planData = planDataResults[0];

    if (!planData) {
      throw new Error(`Could not fetch plan benefits for ${planId}`);
    }

    const benefits = planData.benefitsJsonb as any;
    const recurringInterval = planData.recurringInterval;
    const creditsToGrant = benefits?.monthlyCredits || 0;

    if (!creditsToGrant || creditsToGrant <= 0) {
      return;
    }

    const provider = options?.provider ?? 'stripe';
    const subscriptionId = options?.subscriptionId ?? `fallback_${orderId}`;
    const periodStart = parseDateInput(currentPeriodStart) ?? new Date();
    const explicitPeriodEnd = parseDateInput(options?.periodEnd);
    const defaultMonthlyEnd = addMonths(periodStart, 1);
    const bucketPeriodEnd = isYearlyInterval(recurringInterval)
      ? defaultMonthlyEnd
      : explicitPeriodEnd && explicitPeriodEnd > periodStart
        ? explicitPeriodEnd
        : defaultMonthlyEnd;

    let attempts = 0;
    const maxAttempts = 3;
    let lastError: any = null;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        await db.transaction(async (tx) => {
          const usageRows = await tx
            .select()
            .from(usageSchema)
            .where(eq(usageSchema.userId, userId))
            .for('update');
          const usage = usageRows[0];

          let nextBalanceJsonb = usage?.balanceJsonb ?? {};
          if (isYearlyInterval(recurringInterval) && benefits?.totalMonths && benefits?.monthlyCredits) {
            const yearlyEntry = buildYearlyAllocationEntry({
              currentPeriodStart,
              monthlyCredits: benefits.monthlyCredits,
              orderId,
              totalMonths: benefits.totalMonths,
            });
            nextBalanceJsonb = mergeYearlyAllocation(nextBalanceJsonb, yearlyEntry);
          }

          await tx
            .insert(subscriptionCreditBucketsSchema)
            .values({
              userId,
              provider,
              subscriptionId,
              periodStart,
              periodEnd: bucketPeriodEnd,
              expiresAt: bucketPeriodEnd,
              creditsTotal: creditsToGrant,
              creditsRemaining: creditsToGrant,
              relatedOrderId: orderId,
            })
            .onConflictDoUpdate({
              target: [
                subscriptionCreditBucketsSchema.provider,
                subscriptionCreditBucketsSchema.subscriptionId,
                subscriptionCreditBucketsSchema.periodStart,
              ],
              set: {
                periodEnd: bucketPeriodEnd,
                expiresAt: bucketPeriodEnd,
                creditsTotal: creditsToGrant,
                creditsRemaining: creditsToGrant,
                relatedOrderId: orderId,
              },
            });

          const now = new Date();
          const activeSubRows = await tx
            .select({
              balance: sql<number>`coalesce(sum(${subscriptionCreditBucketsSchema.creditsRemaining}), 0)`,
            })
            .from(subscriptionCreditBucketsSchema)
            .where(
              and(
                eq(subscriptionCreditBucketsSchema.userId, userId),
                gt(subscriptionCreditBucketsSchema.creditsRemaining, 0),
                gt(subscriptionCreditBucketsSchema.expiresAt, now),
              ),
            );
          const nextSubscriptionBalance = Number(activeSubRows[0]?.balance ?? 0);

          const updatedUsage = usage
            ? await tx
                .update(usageSchema)
                .set({
                  subscriptionCreditsBalance: nextSubscriptionBalance,
                  balanceJsonb: nextBalanceJsonb,
                })
                .where(eq(usageSchema.userId, userId))
                .returning({
                  oneTimeCreditsSnapshot: usageSchema.oneTimeCreditsBalance,
                  subscriptionCreditsSnapshot: usageSchema.subscriptionCreditsBalance,
                })
            : await tx
                .insert(usageSchema)
                .values({
                  userId,
                  oneTimeCreditsBalance: 0,
                  subscriptionCreditsBalance: nextSubscriptionBalance,
                  balanceJsonb: nextBalanceJsonb,
                })
                .returning({
                  oneTimeCreditsSnapshot: usageSchema.oneTimeCreditsBalance,
                  subscriptionCreditsSnapshot: usageSchema.subscriptionCreditsBalance,
                });

          const balances = updatedUsage[0];
          if (!balances) {
            throw new Error('Failed to update usage for subscription grant');
          }

          await tx.insert(creditLogsSchema).values({
            userId,
            amount: creditsToGrant,
            oneTimeCreditsSnapshot: balances.oneTimeCreditsSnapshot,
            subscriptionCreditsSnapshot: balances.subscriptionCreditsSnapshot,
            type: 'subscription_grant',
            notes: 'Subscription credits granted',
            relatedOrderId: orderId,
          });
        });
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, attempts * 1000));
        }
      }
    }

    if (lastError) {
      throw lastError;
    }
  } catch (creditError) {
    console.error(`Error processing credits for user ${userId} (order ${orderId}):`, creditError);
    throw creditError;
  }
  // --- End: [custom] Upgrade the user's benefits ---
}

/**
 * Revokes subscription credits for a refunded subscription order.
 * 
 * 为退款的订阅订单撤销订阅积分。
 * 
 * 返金されたサブスクリプション注文のサブスクリプションクレジットを取り消します。
 * 
 * @param originalOrder - The original subscription order being refunded
 */
export async function revokeSubscriptionCredits(originalOrder: Order) {
  const db = getDb();

  // --- TODO: [custom] Revoke the user's subscription benefits ---
  /**
   * Complete the user's subscription benefit revocation based on your business logic.
   * 
   * 根据你的业务逻辑，取消用户的订阅权益。
   * 
   * お客様のビジネスロジックに基づいて、ユーザーのサブスクリプション特典を取消してください。
   */
  const userId = originalOrder.userId as string;
  const orderId = originalOrder.id;

  try {
    await db.transaction(async (tx) => {
      const usageRows = await tx
        .select()
        .from(usageSchema)
        .where(eq(usageSchema.userId, userId))
        .for('update');
      const usage = usageRows[0];
      if (!usage) {
        return;
      }

      const buckets = await tx
        .select({
          id: subscriptionCreditBucketsSchema.id,
          creditsRemaining: subscriptionCreditBucketsSchema.creditsRemaining,
        })
        .from(subscriptionCreditBucketsSchema)
        .where(
          and(
            eq(subscriptionCreditBucketsSchema.userId, userId),
            eq(subscriptionCreditBucketsSchema.relatedOrderId, orderId),
            gt(subscriptionCreditBucketsSchema.creditsRemaining, 0),
          ),
        )
        .for('update');

      if (buckets.length === 0) {
        return;
      }

      const amountRevoked = buckets.reduce(
        (sum, bucket) => sum + bucket.creditsRemaining,
        0,
      );

      for (const bucket of buckets) {
        await tx
          .update(subscriptionCreditBucketsSchema)
          .set({ creditsRemaining: 0 })
          .where(eq(subscriptionCreditBucketsSchema.id, bucket.id));
      }

      const activeSubRows = await tx
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
      const nextSubscriptionBalance = Number(activeSubRows[0]?.balance ?? 0);
      const nextBalanceJsonb = removeYearlyAllocationByOrderId(usage.balanceJsonb, orderId);

      await tx
        .update(usageSchema)
        .set({
          subscriptionCreditsBalance: nextSubscriptionBalance,
          balanceJsonb: nextBalanceJsonb,
        })
        .where(eq(usageSchema.userId, userId));

      await tx.insert(creditLogsSchema).values({
        userId,
        amount: -amountRevoked,
        oneTimeCreditsSnapshot: usage.oneTimeCreditsBalance,
        subscriptionCreditsSnapshot: nextSubscriptionBalance,
        type: 'refund_revoke',
        notes: `Full refund for subscription order ${orderId}.`,
        relatedOrderId: orderId,
      });
    });
  } catch (error) {
    console.error(`Error during revokeSubscriptionCredits for user ${userId}, order ${orderId}:`, error);
  }
  // --- End: [custom] Revoke the user's subscription benefits ---
}

/**
 * Revokes remaining subscription credits when a subscription ends.
 * 
 * 当订阅结束时撤销剩余的订阅积分。
 * 
 * サブスクリプションが終了したときに、残りのサブスクリプションクレジットを取り消します。
 * 
 * @param provider - The payment provider
 * @param subscriptionId - The subscription ID
 * @param userId - The user's ID
 * @param metadata - Additional metadata
 */
export async function revokeRemainingSubscriptionCreditsOnEnd(provider: PaymentProvider, subscriptionId: string, userId: string, metadata: any) {
  const db = getDb();

  try {
    await db.transaction(async (tx) => {
      const usageRows = await tx
        .select()
        .from(usageSchema)
        .where(eq(usageSchema.userId, userId))
        .for('update');
      const usage = usageRows[0];
      if (!usage) {
        return;
      }

      const buckets = await tx
        .select({
          id: subscriptionCreditBucketsSchema.id,
          creditsRemaining: subscriptionCreditBucketsSchema.creditsRemaining,
          relatedOrderId: subscriptionCreditBucketsSchema.relatedOrderId,
        })
        .from(subscriptionCreditBucketsSchema)
        .where(
          and(
            eq(subscriptionCreditBucketsSchema.userId, userId),
            eq(subscriptionCreditBucketsSchema.provider, provider),
            eq(subscriptionCreditBucketsSchema.subscriptionId, subscriptionId),
            gt(subscriptionCreditBucketsSchema.creditsRemaining, 0),
          ),
        )
        .for('update');

      if (buckets.length === 0) {
        return;
      }

      const amountRevoked = buckets.reduce(
        (sum, bucket) => sum + bucket.creditsRemaining,
        0,
      );
      for (const bucket of buckets) {
        await tx
          .update(subscriptionCreditBucketsSchema)
          .set({ creditsRemaining: 0 })
          .where(eq(subscriptionCreditBucketsSchema.id, bucket.id));
      }

      const activeSubRows = await tx
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
      const nextSubscriptionBalance = Number(activeSubRows[0]?.balance ?? 0);

      const orderIds = buckets
        .map((bucket) => bucket.relatedOrderId)
        .filter((value): value is string => Boolean(value));
      const nextBalanceJsonb = removeYearlyAllocationsByOrderIds(
        usage.balanceJsonb,
        orderIds,
      );

      await tx
        .update(usageSchema)
        .set({
          subscriptionCreditsBalance: nextSubscriptionBalance,
          balanceJsonb: nextBalanceJsonb,
        })
        .where(eq(usageSchema.userId, userId));

      await tx.insert(creditLogsSchema).values({
        userId,
        amount: -amountRevoked,
        oneTimeCreditsSnapshot: usage.oneTimeCreditsBalance,
        subscriptionCreditsSnapshot: nextSubscriptionBalance,
        type: 'subscription_ended_revoke',
        notes: `${provider} subscription ${subscriptionId} ended; remaining credits revoked.`,
        relatedOrderId: null,
      });
    });
  } catch (error) {
    console.error(`Error revoking remaining credits for subscription ${subscriptionId}:`, error);
  }
}

/**
 * 过期积分 导入creditLogsSchema表，这样用户积分流水可以对账成功
 * 暂时不用，防止用户看到投诉
 * Settles expired subscription credit buckets for a user.
 * This is designed for lazy-settlement scenarios (for example, when opening credit history page).
 */
export async function settleExpiredSubscriptionCreditsForUser(userId: string) {
  if (!userId) {
    return { expiredCredits: 0, expiredBuckets: 0 };
  }

  const db = getDb();
  const now = new Date();

  try {
    return await db.transaction(async (tx) => {
      const usageRows = await tx
        .select()
        .from(usageSchema)
        .where(eq(usageSchema.userId, userId))
        .for('update');

      const usage = usageRows[0];
      if (!usage) {
        return { expiredCredits: 0, expiredBuckets: 0 };
      }

      const expiredBuckets = await tx
        .select({
          id: subscriptionCreditBucketsSchema.id,
          creditsRemaining: subscriptionCreditBucketsSchema.creditsRemaining,
          relatedOrderId: subscriptionCreditBucketsSchema.relatedOrderId,
          expiresAt: subscriptionCreditBucketsSchema.expiresAt,
        })
        .from(subscriptionCreditBucketsSchema)
        .where(
          and(
            eq(subscriptionCreditBucketsSchema.userId, userId),
            gt(subscriptionCreditBucketsSchema.creditsRemaining, 0),
            lte(subscriptionCreditBucketsSchema.expiresAt, now),
          ),
        )
        .orderBy(asc(subscriptionCreditBucketsSchema.expiresAt))
        .for('update');

      const expiredCredits = expiredBuckets.reduce(
        (sum, bucket) => sum + bucket.creditsRemaining,
        0,
      );

      const activeSubRows = await tx
        .select({
          balance: sql<number>`coalesce(sum(${subscriptionCreditBucketsSchema.creditsRemaining}), 0)`,
        })
        .from(subscriptionCreditBucketsSchema)
        .where(
          and(
            eq(subscriptionCreditBucketsSchema.userId, userId),
            gt(subscriptionCreditBucketsSchema.creditsRemaining, 0),
            gt(subscriptionCreditBucketsSchema.expiresAt, now),
          ),
        );
      const nextSubscriptionBalance = Number(activeSubRows[0]?.balance ?? 0);

      const runningSnapshotStart =
        nextSubscriptionBalance + expiredCredits;
      let runningSubscriptionSnapshot = runningSnapshotStart;

      for (const bucket of expiredBuckets) {
        await tx
          .update(subscriptionCreditBucketsSchema)
          .set({ creditsRemaining: 0 })
          .where(eq(subscriptionCreditBucketsSchema.id, bucket.id));

        if (bucket.creditsRemaining > 0) {
          runningSubscriptionSnapshot = Math.max(
            0,
            runningSubscriptionSnapshot - bucket.creditsRemaining,
          );

          const orderIdText = bucket.relatedOrderId ?? 'unknown';
          await tx.insert(creditLogsSchema).values({
            userId,
            amount: -bucket.creditsRemaining,
            oneTimeCreditsSnapshot: usage.oneTimeCreditsBalance,
            subscriptionCreditsSnapshot: runningSubscriptionSnapshot,
            type: 'subscription_ended_revoke',
            notes: `Subscription credits expired, orderId=${orderIdText}`,
            relatedOrderId: bucket.relatedOrderId ?? null,
          });
        }
      }

      if (usage.subscriptionCreditsBalance !== nextSubscriptionBalance) {
        await tx
          .update(usageSchema)
          .set({ subscriptionCreditsBalance: nextSubscriptionBalance })
          .where(eq(usageSchema.userId, userId));
      }

      return { expiredCredits, expiredBuckets: expiredBuckets.length };
    });
  } catch (error) {
    console.error(`Error settling expired subscription credits for user ${userId}:`, error);
    return { expiredCredits: 0, expiredBuckets: 0 };
  }
}
