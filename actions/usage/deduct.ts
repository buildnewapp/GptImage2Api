'use server';

import { actionResponse, ActionResult } from '@/lib/action-response';
import { getSession } from '@/lib/auth/server';
import { getDb } from '@/lib/db';
import {
  creditLogs as creditLogsSchema,
  subscriptionCreditBuckets as subscriptionCreditBucketsSchema,
  usage as usageSchema,
} from '@/lib/db/schema';
import { and, asc, eq, gt } from 'drizzle-orm';
import { getUserBenefits, UserBenefits } from './benefits';

export interface DeductCreditsData {
  message: string;
  updatedBenefits: UserBenefits | null;
}

/**
 * Unified action for deducting credits from a user's account.
 * @param amountToDeduct - The amount of credits to deduct (must be a positive number).
 * @param notes - A description for this deduction, which will be recorded in `credit_logs` (e.g., "AI summary generation").
 * @returns An `ActionResult` containing the operation result and the updated user benefits.
 */
export async function deductCredits(
  amountToDeduct: number,
  notes: string,
): Promise<ActionResult<DeductCreditsData | null>> {
  const session = await getSession()
  const user = session?.user;
  if (!user) return actionResponse.unauthorized();

  const db = getDb();

  if (amountToDeduct <= 0) {
    return actionResponse.badRequest('Amount to deduct must be positive.');
  }

  if (!notes) {
    return actionResponse.badRequest('Deduction notes are required.');
  }

  try {
    await db.transaction(async (tx) => {
      const usageResults = await tx
        .select({
          oneTimeCreditsBalance: usageSchema.oneTimeCreditsBalance,
        })
        .from(usageSchema)
        .where(eq(usageSchema.userId, user.id))
        .for('update');
      const usage = usageResults[0];
      const oneTimeBalance = usage?.oneTimeCreditsBalance ?? 0;

      const now = new Date();
      const buckets = await tx
        .select({
          id: subscriptionCreditBucketsSchema.id,
          creditsRemaining: subscriptionCreditBucketsSchema.creditsRemaining,
        })
        .from(subscriptionCreditBucketsSchema)
        .where(
          and(
            eq(subscriptionCreditBucketsSchema.userId, user.id),
            gt(subscriptionCreditBucketsSchema.creditsRemaining, 0),
            gt(subscriptionCreditBucketsSchema.expiresAt, now),
          ),
        )
        .orderBy(asc(subscriptionCreditBucketsSchema.expiresAt))
        .for('update');

      const availableSubscriptionCredits = buckets.reduce(
        (sum, bucket) => sum + bucket.creditsRemaining,
        0,
      );
      const totalCredits = oneTimeBalance + availableSubscriptionCredits;
      if (totalCredits < amountToDeduct) {
        throw new Error('INSUFFICIENT_CREDITS');
      }

      const deductedFromSub = Math.min(availableSubscriptionCredits, amountToDeduct);
      const deductedFromOneTime = amountToDeduct - deductedFromSub;
      const newSubBalance = availableSubscriptionCredits - deductedFromSub;
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
          .where(eq(usageSchema.userId, user.id));
      } else {
        await tx.insert(usageSchema).values({
          userId: user.id,
          subscriptionCreditsBalance: newSubBalance,
          oneTimeCreditsBalance: newOneTimeBalance,
        });
      }

      await tx.insert(creditLogsSchema)
        .values({
          userId: user.id,
          amount: -amountToDeduct,
          oneTimeCreditsSnapshot: newOneTimeBalance,
          subscriptionCreditsSnapshot: newSubBalance,
          type: 'feature_usage',
          notes: notes,
        });
    });

    const updatedBenefits = await getUserBenefits(user.id);

    return actionResponse.success({
      message: 'Credits deducted successfully.',
      updatedBenefits,
    });

  } catch (e: any) {
    if (e.message === 'INSUFFICIENT_CREDITS') {
      return actionResponse.badRequest('Insufficient credits.');
    }
    console.error(`Unexpected error in deductCredits:`, e);
    return actionResponse.error(e.message || 'An unexpected server error occurred.');
  }
}

export async function getClientUserBenefits(): Promise<ActionResult<UserBenefits | null>> {
  const session = await getSession()
  const user = session?.user;
  if (!user) return actionResponse.unauthorized();
  try {
    const benefits = await getUserBenefits(user.id);
    if (benefits) {
      return actionResponse.success(benefits);
    }
    return actionResponse.notFound('User benefits not found.');
  } catch (error: any) {
    console.error('Error fetching user benefits for client:', error);
    return actionResponse.error(error.message || 'Failed to fetch user benefits.');
  }
}
