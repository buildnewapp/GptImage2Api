import { getDb } from "@/lib/db";
import {
  orders as ordersSchema,
  pricingPlans as pricingPlansSchema,
  subscriptions as subscriptionsSchema,
} from "@/lib/db/schema";
import {
  decodePayPalCustomId,
  getPayPalCaptureId,
  getPayPalOrderCustomId,
  mapPayPalOrderStatus,
  mapPayPalSubscriptionStatus,
  parsePayPalAmount,
} from "@/lib/paypal";
import { PayPalClient } from "@/lib/paypal/client";
import type { PayPalOrder, PayPalSubscription } from "@/lib/paypal/types";
import {
  grantConfiguredFirstOrderReward,
} from "@/lib/referrals/first-order";
import {
  revokeRemainingSubscriptionCreditsOnEnd,
  upgradeOneTimeCredits,
  upgradeSubscriptionCredits,
} from "@/lib/payments/credit-manager";
import { ORDER_TYPES } from "@/lib/payments/provider-utils";
import { createOrderWithIdempotency } from "@/lib/payments/webhook-helpers";
import { and, desc, eq, inArray, InferInsertModel } from "drizzle-orm";

function toDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function resolvePayPalPlanId({
  fallbackPlanId,
  paypalPlanId,
}: {
  fallbackPlanId?: string | null;
  paypalPlanId?: string | null;
}): Promise<string | null> {
  if (fallbackPlanId) {
    return fallbackPlanId;
  }

  if (!paypalPlanId) {
    return null;
  }

  const db = getDb();
  const [plan] = await db
    .select({ id: pricingPlansSchema.id })
    .from(pricingPlansSchema)
    .where(
      and(
        eq(pricingPlansSchema.provider, "paypal"),
        eq(pricingPlansSchema.creemProductId, paypalPlanId),
      ),
    )
    .limit(1);

  return plan?.id ?? null;
}

async function resolveExistingSubscriptionContext(subscriptionId: string) {
  const db = getDb();
  const [subscription] = await db
    .select({
      planId: subscriptionsSchema.planId,
      userId: subscriptionsSchema.userId,
    })
    .from(subscriptionsSchema)
    .where(eq(subscriptionsSchema.subscriptionId, subscriptionId))
    .orderBy(desc(subscriptionsSchema.createdAt))
    .limit(1);

  return subscription ?? null;
}

function getSubscriptionCurrentPeriodStart(subscription: PayPalSubscription): number {
  return (
    Date.parse(
      subscription.billing_info?.last_payment?.time ??
        subscription.start_time ??
        subscription.create_time ??
        new Date().toISOString(),
    ) || Date.now()
  );
}

function isEndedPayPalSubscription(status: string | null | undefined): boolean {
  const normalized = mapPayPalSubscriptionStatus(status);
  return ["cancelled", "expired", "suspended"].includes(normalized);
}

export async function syncPayPalSubscriptionData(
  subscriptionId: string,
  initialSubscription?: PayPalSubscription,
): Promise<void> {
  const db = getDb();
  const client = new PayPalClient();
  const subscription =
    initialSubscription ?? (await client.getSubscription(subscriptionId));

  const customId = decodePayPalCustomId(subscription.custom_id);
  const existing = await resolveExistingSubscriptionContext(subscription.id);

  const userId = customId?.userId ?? existing?.userId;
  const planId = await resolvePayPalPlanId({
    fallbackPlanId: customId?.planId ?? existing?.planId ?? null,
    paypalPlanId: subscription.plan_id ?? null,
  });

  if (!userId || !planId) {
    throw new Error(
      `Unable to resolve PayPal subscription context for ${subscription.id}.`,
    );
  }

  const status = mapPayPalSubscriptionStatus(subscription.status);

  const subscriptionData: InferInsertModel<typeof subscriptionsSchema> = {
    userId,
    planId,
    provider: "paypal",
    subscriptionId: subscription.id,
    customerId:
      subscription.subscriber?.payer_id ??
      subscription.subscriber?.email_address ??
      subscription.id,
    productId: subscription.plan_id ?? null,
    priceId: subscription.plan_id ?? null,
    status,
    currentPeriodStart: toDate(
      subscription.start_time ??
        subscription.billing_info?.last_payment?.time ??
        subscription.create_time ??
        null,
    ),
    currentPeriodEnd: toDate(
      subscription.billing_info?.next_billing_time ?? null,
    ),
    cancelAtPeriodEnd: isEndedPayPalSubscription(subscription.status),
    canceledAt: null,
    endedAt: isEndedPayPalSubscription(subscription.status) ? new Date() : null,
    trialStart: null,
    trialEnd: null,
    metadata: {
      planId,
      paypalPlanId: subscription.plan_id ?? null,
      paypalStatus: subscription.status,
      paypalSubscriptionId: subscription.id,
      subscriberEmail: subscription.subscriber?.email_address ?? null,
      userId,
    },
  };

  const { ...updateData } = subscriptionData;

  await db
    .insert(subscriptionsSchema)
    .values(subscriptionData)
    .onConflictDoUpdate({
      target: subscriptionsSchema.subscriptionId,
      set: updateData,
    });

  if (isEndedPayPalSubscription(subscription.status)) {
    await revokeRemainingSubscriptionCreditsOnEnd(
      "paypal",
      subscription.id,
      userId,
      subscriptionData.metadata,
    );
  }
}

export async function syncPayPalOrderData(
  order: PayPalOrder,
): Promise<{ existed: boolean; orderId: string | null }> {
  const status = mapPayPalOrderStatus(order.status);
  if (status !== "succeeded") {
    return {
      existed: false,
      orderId: null,
    };
  }

  const customId = decodePayPalCustomId(getPayPalOrderCustomId(order));
  if (!customId) {
    throw new Error(`Missing PayPal custom_id for order ${order.id}`);
  }

  const purchaseUnit = order.purchase_units?.[0];
  const amount = purchaseUnit?.amount;
  const currency = amount?.currency_code?.toLowerCase() ?? "usd";

  const orderData: InferInsertModel<typeof ordersSchema> = {
    userId: customId.userId,
    provider: "paypal",
    providerOrderId: order.id,
    status,
    orderType: ORDER_TYPES.ONE_TIME_PURCHASE,
    planId: customId.planId,
    priceId: null,
    productId: null,
    amountSubtotal: parsePayPalAmount(amount?.value),
    amountDiscount: "0.00",
    amountTax: "0.00",
    amountTotal: parsePayPalAmount(amount?.value),
    currency,
    metadata: {
      paypalCaptureId: getPayPalCaptureId(order),
      paypalOrderId: order.id,
      paypalStatus: order.status,
      planId: customId.planId,
      userId: customId.userId,
    },
  };

  const { order: insertedOrder, existed } = await createOrderWithIdempotency(
    "paypal",
    orderData,
    order.id,
  );

  if (existed) {
    return {
      existed: true,
      orderId: insertedOrder?.id ?? null,
    };
  }

  if (!insertedOrder) {
    throw new Error(`Failed to insert PayPal order ${order.id}`);
  }

  await upgradeOneTimeCredits(customId.userId, customId.planId, insertedOrder.id);
  await grantConfiguredFirstOrderReward({
    inviteeUserId: customId.userId,
    sourceOrderId: insertedOrder.id,
    orderAmountUsd: Number(orderData.amountTotal ?? 0),
  });

  return {
    existed: false,
    orderId: insertedOrder.id,
  };
}

export async function handlePayPalSubscriptionPaymentCompleted(resource: any) {
  const subscriptionId =
    resource?.billing_agreement_id ?? resource?.subscription_id ?? null;

  if (!subscriptionId) {
    throw new Error("Missing PayPal subscription ID in payment completed event.");
  }

  const client = new PayPalClient();
  const subscription = await client.getSubscription(subscriptionId);
  await syncPayPalSubscriptionData(subscriptionId, subscription);

  const customId = decodePayPalCustomId(subscription.custom_id);
  const existing = await resolveExistingSubscriptionContext(subscriptionId);

  const userId = customId?.userId ?? existing?.userId;
  const planId = await resolvePayPalPlanId({
    fallbackPlanId: customId?.planId ?? existing?.planId ?? null,
    paypalPlanId: subscription.plan_id ?? null,
  });

  if (!userId || !planId) {
    throw new Error(
      `Unable to resolve PayPal subscription payment context for ${subscriptionId}.`,
    );
  }

  const db = getDb();
  const [existingOrder] = await db
    .select({ id: ordersSchema.id })
    .from(ordersSchema)
    .where(
      and(
        eq(ordersSchema.provider, "paypal"),
        eq(ordersSchema.subscriptionId, subscriptionId),
        inArray(ordersSchema.orderType, [
          ORDER_TYPES.SUBSCRIPTION_INITIAL,
          ORDER_TYPES.SUBSCRIPTION_RENEWAL,
        ]),
      ),
    )
    .limit(1);

  const amount = resource?.amount ?? resource?.amount_with_breakdown?.gross_amount;
  const orderData: InferInsertModel<typeof ordersSchema> = {
    userId,
    provider: "paypal",
    providerOrderId: resource.id,
    status: mapPayPalOrderStatus(resource.status ?? "COMPLETED"),
    orderType: existingOrder
      ? ORDER_TYPES.SUBSCRIPTION_RENEWAL
      : ORDER_TYPES.SUBSCRIPTION_INITIAL,
    planId,
    priceId: subscription.plan_id ?? null,
    productId: subscription.plan_id ?? null,
    subscriptionId,
    amountSubtotal: parsePayPalAmount(amount?.value),
    amountDiscount: "0.00",
    amountTax: "0.00",
    amountTotal: parsePayPalAmount(amount?.value),
    currency: amount?.currency_code?.toLowerCase() ?? "usd",
    metadata: {
      paypalPaymentId: resource.id,
      paypalPaymentStatus: resource.status ?? null,
      paypalPlanId: subscription.plan_id ?? null,
      paypalSubscriptionId: subscriptionId,
      planId,
      userId,
    },
  };

  const { order: insertedOrder, existed } = await createOrderWithIdempotency(
    "paypal",
    orderData,
    resource.id,
  );

  if (existed || !insertedOrder) {
    return;
  }

  await upgradeSubscriptionCredits(
    userId,
    planId,
    insertedOrder.id,
    getSubscriptionCurrentPeriodStart(subscription),
  );

  await grantConfiguredFirstOrderReward({
    inviteeUserId: userId,
    sourceOrderId: insertedOrder.id,
    orderAmountUsd: Number(orderData.amountTotal ?? 0),
  });
}
