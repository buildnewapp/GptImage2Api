import { getDb } from "@/lib/db";
import {
  orders as ordersSchema,
  pricingPlans as pricingPlansSchema,
  subscriptionCreditBuckets as subscriptionCreditBucketsSchema,
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

export function requiresHigherTierRecurringPurchase(
  targetPrice: string | null | undefined,
  currentPrices: Array<string | null | undefined>,
): boolean {
  if (currentPrices.length === 0) {
    return false;
  }

  const highestCurrentPrice = currentPrices.reduce((max, price) => {
    return Math.max(max, parsePlanPrice(price));
  }, 0);

  return !isHigherTierRecurringPlan(targetPrice, String(highestCurrentPrice));
}

export function getActiveRecurringPrices(
  subscriptionPlans: Array<{ price: string | null | undefined }>,
  orderPlans: Array<{
    expiresAt: Date | null | undefined;
    price: string | null | undefined;
  }>,
  now = new Date(),
): Array<string | null | undefined> {
  return [
    ...subscriptionPlans.map((item) => item.price),
    ...orderPlans
      .filter((item) => item.expiresAt && item.expiresAt > now)
      .map((item) => item.price),
  ];
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

  const existingSubscriptionPlans = await db
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

  const existingRecurringOrderPlans = await db
    .select({
      expiresAt: subscriptionCreditBucketsSchema.expiresAt,
      price: pricingPlansSchema.price,
    })
    .from(ordersSchema)
    .innerJoin(pricingPlansSchema, eq(ordersSchema.planId, pricingPlansSchema.id))
    .innerJoin(
      subscriptionCreditBucketsSchema,
      eq(subscriptionCreditBucketsSchema.relatedOrderId, ordersSchema.id),
    )
    .where(
      and(
        eq(ordersSchema.userId, userId),
        eq(ordersSchema.status, "succeeded"),
        eq(pricingPlansSchema.paymentType, "recurring"),
        gt(subscriptionCreditBucketsSchema.expiresAt, now),
      ),
    );

  const currentPrices = getActiveRecurringPrices(
    existingSubscriptionPlans,
    existingRecurringOrderPlans,
    now,
  );

  if (currentPrices.length === 0) {
    return;
  }

  if (requiresHigherTierRecurringPurchase(targetPlan.price, currentPrices)) {
    throw new Error(RECURRING_PURCHASE_REQUIRES_HIGHER_TIER_ERROR);
  }
}
