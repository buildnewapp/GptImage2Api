import { getDb } from "@/lib/db";
import {
  pricingPlans as pricingPlansSchema,
  subscriptions as subscriptionsSchema,
} from "@/lib/db/schema";
import { isRecurringPaymentType } from "@/lib/payments/provider-utils";
import { and, eq, gt, inArray, or } from "drizzle-orm";

export const RECURRING_PURCHASE_REQUIRES_HIGHER_TIER_ERROR =
  "RECURRING_PURCHASE_REQUIRES_HIGHER_TIER";

function parsePlanPrice(price: string | null | undefined): number {
  const parsed = Number(price ?? 0);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return parsed;
}

export function isHigherTierRecurringPlan(
  targetPrice: string | null | undefined,
  currentPrice: string | null | undefined,
): boolean {
  return parsePlanPrice(targetPrice) > parsePlanPrice(currentPrice);
}

export async function assertRecurringPurchaseIsHigherTier(
  userId: string,
  planId: string,
): Promise<void> {
  const now = new Date();
  const db = getDb();
  const [targetPlan] = await db
    .select({
      id: pricingPlansSchema.id,
      paymentType: pricingPlansSchema.paymentType,
      price: pricingPlansSchema.price,
    })
    .from(pricingPlansSchema)
    .where(eq(pricingPlansSchema.id, planId))
    .limit(1);

  if (!targetPlan) {
    throw new Error(`Plan not found for ${planId}`);
  }

  if (!isRecurringPaymentType(targetPlan.paymentType)) {
    return;
  }

  const existingSubscriptions = await db
    .select({
      price: pricingPlansSchema.price,
    })
    .from(subscriptionsSchema)
    .innerJoin(pricingPlansSchema, eq(subscriptionsSchema.planId, pricingPlansSchema.id))
    .where(
      and(
        eq(subscriptionsSchema.userId, userId),
        or(
          inArray(subscriptionsSchema.status, ["active", "trialing"]),
          and(
            inArray(subscriptionsSchema.status, ["canceled", "cancelled"]),//canceled -> creem , cancelled -> paypal
            gt(subscriptionsSchema.currentPeriodEnd, now),
          ),
        ),
        eq(pricingPlansSchema.paymentType, "recurring"),
      ),
    );

  if (existingSubscriptions.length === 0) {
    return;
  }

  const highestCurrentPrice = existingSubscriptions.reduce((max, item) => {
    return Math.max(max, parsePlanPrice(item.price));
  }, 0);

  if (!isHigherTierRecurringPlan(targetPlan.price, String(highestCurrentPrice))) {
    throw new Error(RECURRING_PURCHASE_REQUIRES_HIGHER_TIER_ERROR);
  }
}
