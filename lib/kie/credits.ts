/**
 * Video Generation Credit Operations
 *
 * 视频生成相关的积分扣除和退还操作。
 * 复用现有的 usage 和 creditLogs 表。
 */

import { getDb } from "@/lib/db";
import {
  creditLogs as creditLogsSchema,
  subscriptionCreditBuckets as subscriptionCreditBucketsSchema,
  usage as usageSchema,
} from "@/lib/db/schema";
import { and, asc, eq, gt, sql } from "drizzle-orm";

/**
 * 扣除视频生成积分。
 * 优先扣 subscription 积分，不足部分扣 one-time 积分。
 *
 * @throws Error("INSUFFICIENT_CREDITS") 余额不足
 */
export async function deductCreditsForGeneration(
    userId: string,
    amount: number,
    notes: string,
): Promise<void> {
  await getDb().transaction(async (tx) => {
    const usageResults = await tx
        .select({
          oneTimeCreditsBalance: usageSchema.oneTimeCreditsBalance,
        })
        .from(usageSchema)
        .where(eq(usageSchema.userId, userId))
        .for("update");

    const usage = usageResults[0];
    const oneTimeBalance = usage?.oneTimeCreditsBalance ?? 0;

    const buckets = await tx
      .select({
        id: subscriptionCreditBucketsSchema.id,
        creditsRemaining: subscriptionCreditBucketsSchema.creditsRemaining,
      })
      .from(subscriptionCreditBucketsSchema)
      .where(
        and(
          eq(subscriptionCreditBucketsSchema.userId, userId),
          gt(subscriptionCreditBucketsSchema.creditsRemaining, 0),
          gt(subscriptionCreditBucketsSchema.expiresAt, new Date()),
        ),
      )
      .orderBy(asc(subscriptionCreditBucketsSchema.expiresAt))
      .for("update");

    const subBalance = buckets.reduce(
      (sum, bucket) => sum + bucket.creditsRemaining,
      0,
    );

    const totalCredits =
        oneTimeBalance + subBalance;
    if (totalCredits < amount) {
      throw new Error("INSUFFICIENT_CREDITS");
    }

    const deductedFromSub = Math.min(
        subBalance,
        amount,
    );
    const deductedFromOneTime = amount - deductedFromSub;

    const newSubBalance = subBalance - deductedFromSub;
    const newOneTimeBalance = oneTimeBalance - deductedFromOneTime;

    let remainingSubToDeduct = deductedFromSub;
    for (const bucket of buckets) {
      if (remainingSubToDeduct <= 0) {
        break;
      }
      const deduction = Math.min(bucket.creditsRemaining, remainingSubToDeduct);
      remainingSubToDeduct -= deduction;
      await tx
        .update(subscriptionCreditBucketsSchema)
        .set({
          creditsRemaining: bucket.creditsRemaining - deduction,
        })
        .where(eq(subscriptionCreditBucketsSchema.id, bucket.id));
    }

    if (usage) {
      await tx
        .update(usageSchema)
        .set({
          subscriptionCreditsBalance: newSubBalance,
          oneTimeCreditsBalance: newOneTimeBalance,
        })
        .where(eq(usageSchema.userId, userId));
    } else {
      await tx.insert(usageSchema).values({
        userId,
        subscriptionCreditsBalance: newSubBalance,
        oneTimeCreditsBalance: newOneTimeBalance,
      });
    }

    await tx.insert(creditLogsSchema).values({
      userId,
      amount: -amount,
      oneTimeCreditsSnapshot: newOneTimeBalance,
      subscriptionCreditsSnapshot: newSubBalance,
      type: "video_generation",
      notes,
    });
  });
}

/**
 * 退还视频生成积分（失败退款）。
 * 退还到 one-time 积分。
 */
export async function refundCreditsForGeneration(
    userId: string,
    amount: number,
    notes: string,
): Promise<void> {
  await getDb().transaction(async (tx) => {
    const updatedUsage = await tx
        .insert(usageSchema)
        .values({
          userId,
          oneTimeCreditsBalance: amount,
        })
        .onConflictDoUpdate({
          target: usageSchema.userId,
          set: {
            oneTimeCreditsBalance: sql`${usageSchema.oneTimeCreditsBalance} + ${amount}`,
          },
        })
        .returning({
          oneTimeCreditsSnapshot: usageSchema.oneTimeCreditsBalance,
          subscriptionCreditsSnapshot: usageSchema.subscriptionCreditsBalance,
        });

    const balances = updatedUsage[0];
    if (!balances) {
      throw new Error("Failed to update usage for credit refund");
    }

    await tx.insert(creditLogsSchema).values({
      userId,
      amount,
      oneTimeCreditsSnapshot: balances.oneTimeCreditsSnapshot,
      subscriptionCreditsSnapshot: balances.subscriptionCreditsSnapshot,
      type: "video_generation_refund",
      notes,
    });
  });
}
