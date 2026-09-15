import { getPricingPlanById, getPricingPlanByProviderId } from "@/lib/pricing";
import { getDb } from "@/lib/db";
import {
  orders as ordersSchema,
  subscriptionCreditBuckets as subscriptionCreditBucketsSchema,
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
import {
  getInitialPayPalSubscriptionOrderKey,
  getPayPalSubscriptionPaymentEventAction,
  resolvePayPalSubscriptionOrderAmount,
  shouldCreateInitialPayPalSubscriptionOrder,
} from "@/lib/paypal/subscription-orders";
import type { PayPalOrder, PayPalSubscription } from "@/lib/paypal/types";
import {
  grantConfiguredFirstOrderReward,
} from "@/lib/referrals/first-order";
import {
  upgradeOneTimeCredits,
  upgradeSubscriptionCredits,
} from "@/lib/payments/credit-manager";
import { ORDER_TYPES } from "@/lib/payments/provider-utils";
import { createOrderWithIdempotency } from "@/lib/payments/webhook-helpers";
import { sendPaymentSuccessWeComNotification } from "@/lib/payments/wecom-notification";
import { and, asc, desc, eq, InferInsertModel } from "drizzle-orm";

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

  return getPricingPlanByProviderId('paypalPlanId', paypalPlanId)?.id ?? null;
}

async function resolvePayPalPlanPaymentDetails(planId: string) {
  return getPricingPlanById(planId) ?? null;
}

async function resolveExistingSubscriptionContext(subscriptionId: string) {
  const db = getDb();
  const [subscription] = await db
    .select({
      planId: subscriptionsSchema.planId,
      currentPeriodEnd: subscriptionsSchema.currentPeriodEnd,
      userId: subscriptionsSchema.userId,
    })
    .from(subscriptionsSchema)
    .where(eq(subscriptionsSchema.subscriptionId, subscriptionId))
    .orderBy(desc(subscriptionsSchema.createdAt))
    .limit(1);

  return subscription ?? null;
}

async function resolveExistingInitialSubscriptionOrder(subscriptionId: string) {
  const db = getDb();
  const [order] = await db
    .select({
      id: ordersSchema.id,
      providerOrderId: ordersSchema.providerOrderId,
      metadata: ordersSchema.metadata,
      amountTotal: ordersSchema.amountTotal,
      createdAt: ordersSchema.createdAt,
      periodStart: subscriptionCreditBucketsSchema.periodStart,
      periodEnd: subscriptionCreditBucketsSchema.periodEnd,
    })
    .from(ordersSchema)
    .leftJoin(
      subscriptionCreditBucketsSchema,
      eq(subscriptionCreditBucketsSchema.relatedOrderId, ordersSchema.id),
    )
    .where(
      and(
        eq(ordersSchema.provider, "paypal"),
        eq(
          ordersSchema.providerOrderId,
          getInitialPayPalSubscriptionOrderKey(subscriptionId),
        ),
        eq(ordersSchema.subscriptionId, subscriptionId),
        eq(ordersSchema.orderType, ORDER_TYPES.RECURRING),
      ),
    )
    .orderBy(asc(subscriptionCreditBucketsSchema.periodStart))
    .limit(1);

  if (!order) {
    return null;
  }
  const metadata = order.metadata as { paypalPeriodEnd?: string } | null;
  return {
    ...order,
    periodEnd: order.periodEnd ?? toDate(metadata?.paypalPeriodEnd),
  };
}

async function createInitialPayPalSubscriptionOrder(subscription: PayPalSubscription, {
  planId,
  userId,
}: {
  planId: string;
  userId: string;
}) {
  const existingInitialOrder = await resolveExistingInitialSubscriptionOrder(
    subscription.id,
  );

  if (
    !existingInitialOrder && !shouldCreateInitialPayPalSubscriptionOrder({
      hasInitialOrder: Boolean(existingInitialOrder),
      status: subscription.status,
    })
  ) {
    return null;
  }

  const planPaymentDetails = await resolvePayPalPlanPaymentDetails(planId);
  const lastPayment = subscription.billing_info?.last_payment;
  const amountTotal = existingInitialOrder?.amountTotal ?? resolvePayPalSubscriptionOrderAmount({
    lastPaymentAmount: lastPayment?.amount?.value,
    planPrice: planPaymentDetails?.price?.toString() ?? null,
  });
  const currency =
    lastPayment?.amount?.currency_code?.toLowerCase() ??
    planPaymentDetails?.currency?.toLowerCase() ??
    "usd";
  const initialMetadata = existingInitialOrder?.metadata as {
    paypalPeriodStart?: string;
    paypalPeriodEnd?: string;
  } | null;
  // Keep the original period when recovering a failed grant after a later renewal.
  const periodStart = existingInitialOrder
    ? (existingInitialOrder.periodStart ?? toDate(initialMetadata?.paypalPeriodStart) ?? existingInitialOrder.createdAt).getTime()
    : getSubscriptionCurrentPeriodStart(subscription);
  const periodEnd = existingInitialOrder
    ? (existingInitialOrder.periodEnd ?? toDate(initialMetadata?.paypalPeriodEnd))?.getTime() ?? null
    : getSubscriptionCurrentPeriodEnd(subscription);

  const orderData: InferInsertModel<typeof ordersSchema> = {
    userId,
    provider: "paypal",
    providerOrderId: getInitialPayPalSubscriptionOrderKey(subscription.id),
    status: "succeeded",
    orderType: ORDER_TYPES.RECURRING,
    planId,
    priceId: subscription.plan_id ?? null,
    productId: subscription.plan_id ?? null,
    subscriptionId: subscription.id,
    amountSubtotal: amountTotal,
    amountDiscount: "0.00",
    amountTax: "0.00",
    amountTotal,
    currency,
    metadata: {
      paypalOrderStage: "initial",
      paypalPaymentId: null,
      paypalPaymentStatus: lastPayment?.status ?? null,
      paypalPeriodStart: new Date(periodStart).toISOString(),
      paypalPeriodEnd: periodEnd ? new Date(periodEnd).toISOString() : null,
      paypalPlanId: subscription.plan_id ?? null,
      paypalStatus: subscription.status,
      paypalSubscriptionId: subscription.id,
      planId,
      subscriberEmail: subscription.subscriber?.email_address ?? null,
      userId,
    },
  };

  const { order: insertedOrder, existed } = await createOrderWithIdempotency(
    "paypal",
    orderData,
    getInitialPayPalSubscriptionOrderKey(subscription.id),
  );

  if (!insertedOrder) {
    throw new Error(`Failed to insert initial PayPal order ${subscription.id}`);
  }

  const granted = await upgradeSubscriptionCredits(
    userId,
    planId,
    insertedOrder.id,
    periodStart,
    {
      provider: "paypal",
      subscriptionId: subscription.id,
      periodEnd,
    },
  );

  await grantConfiguredFirstOrderReward({
    inviteeUserId: userId,
    sourceOrderId: insertedOrder.id,
    orderAmountUsd: Number(orderData.amountTotal ?? 0),
  });
  if (granted || (granted === undefined && !existed)) {
    await sendPaymentSuccessWeComNotification(insertedOrder.id);
  }

  return insertedOrder.id;
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

function getSubscriptionCurrentPeriodEnd(subscription: PayPalSubscription): number | null {
  const nextBillingTime = subscription.billing_info?.next_billing_time;
  if (!nextBillingTime) {
    return null;
  }
  const parsed = Date.parse(nextBillingTime);
  return Number.isNaN(parsed) ? null : parsed;
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
  const isCanceled = isEndedPayPalSubscription(subscription.status);

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
      subscription.billing_info?.last_payment?.time ??
        subscription.start_time ??
        subscription.create_time ??
        null,
    ),
    currentPeriodEnd: isCanceled
      ? (existing?.currentPeriodEnd ?? toDate(subscription.billing_info?.next_billing_time ?? null))
      : toDate(subscription.billing_info?.next_billing_time ?? null),
    cancelAtPeriodEnd: isCanceled,
    canceledAt: isCanceled ? new Date() : null,
    endedAt: isCanceled ? new Date() : null,
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

  await createInitialPayPalSubscriptionOrder(subscription, {
    planId,
    userId,
  });

  if (isEndedPayPalSubscription(subscription.status)) {
    console.log(
      `[PayPal] Subscription ${subscription.id} ended. Order/subscription state synced.`,
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

  if (!insertedOrder) {
    throw new Error(`Failed to insert PayPal order ${order.id}`);
  }

  const granted = await upgradeOneTimeCredits(customId.userId, customId.planId, insertedOrder.id);
  await grantConfiguredFirstOrderReward({
    inviteeUserId: customId.userId,
    sourceOrderId: insertedOrder.id,
    orderAmountUsd: Number(orderData.amountTotal ?? 0),
  });
  if (granted || (granted === undefined && !existed)) {
    await sendPaymentSuccessWeComNotification(insertedOrder.id);
  }

  return {
    existed,
    orderId: insertedOrder.id,
  };
}

export async function handlePayPalSubscriptionPaymentCompleted(resource: any) {
  const subscriptionId =
    resource?.billing_agreement_id ?? resource?.subscription_id ?? null;

  if (!subscriptionId) {
    throw new Error("Missing PayPal subscription ID in payment completed event.");
  }

  const paymentStatus = resource.status ?? resource.state ?? "COMPLETED";
  if (mapPayPalOrderStatus(paymentStatus) !== "succeeded") {
    throw new Error("PayPal subscription payment is not completed.");
  }
  const paymentTime = toDate(resource.create_time);
  if (!resource.id || !paymentTime) {
    throw new Error("Missing PayPal payment ID or payment time.");
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
  const existingInitialOrder = await resolveExistingInitialSubscriptionOrder(
    subscriptionId,
  );
  const initialOrderMetadata = (existingInitialOrder?.metadata ?? null) as
    | { paypalPaymentId?: string | null }
    | null;
  const action = getPayPalSubscriptionPaymentEventAction({
    existingInitialOrder: existingInitialOrder
      ? {
          paymentId: initialOrderMetadata?.paypalPaymentId ?? null,
          periodEnd: existingInitialOrder.periodEnd,
        }
      : null,
    paymentEventId: resource.id,
    paymentEventTime: resource.create_time,
  });

  if (action === "attach_to_initial" && existingInitialOrder) {
    await db
      .update(ordersSchema)
      .set({
        metadata: {
          ...(existingInitialOrder.metadata as Record<string, unknown> | null),
          paypalPaymentId: resource.id,
          paypalPaymentStatus: paymentStatus,
        },
      })
      .where(eq(ordersSchema.id, existingInitialOrder.id));
    return;
  }

  if (action === "noop") {
    return;
  }

  const amount = resource?.amount ?? resource?.amount_with_breakdown?.gross_amount;
  const amountTotal = parsePayPalAmount(amount?.value ?? amount?.total);
  const periodStart = paymentTime.getTime();
  // The subscription API describes its latest cycle, which may differ on replay.
  const periodEnd = periodStart === toDate(subscription.billing_info?.last_payment?.time)?.getTime()
    ? getSubscriptionCurrentPeriodEnd(subscription)
    : null;
  const orderData: InferInsertModel<typeof ordersSchema> = {
    userId,
    provider: "paypal",
    providerOrderId: resource.id,
    status: mapPayPalOrderStatus(paymentStatus),
    orderType: ORDER_TYPES.RECURRING,
    planId,
    priceId: subscription.plan_id ?? null,
    productId: subscription.plan_id ?? null,
    subscriptionId,
    amountSubtotal: amountTotal,
    amountDiscount: "0.00",
    amountTax: "0.00",
    amountTotal,
    currency: (amount?.currency_code ?? amount?.currency)?.toLowerCase() ?? "usd",
    metadata: {
      paypalOrderStage:
        action === "create_initial" ? "initial" : "renewal",
      paypalPaymentId: resource.id,
      paypalPaymentStatus: paymentStatus,
      paypalPeriodStart: paymentTime.toISOString(),
      paypalPeriodEnd: periodEnd ? new Date(periodEnd).toISOString() : null,
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

  if (!insertedOrder) {
    throw new Error(`Failed to insert PayPal payment ${resource.id}`);
  }

  const [savedOrder] = await db.select({ metadata: ordersSchema.metadata })
    .from(ordersSchema).where(eq(ordersSchema.id, insertedOrder.id)).limit(1);
  const savedMetadata = savedOrder?.metadata as {
    paypalPeriodStart?: string;
    paypalPeriodEnd?: string | null;
  } | null;
  const granted = await upgradeSubscriptionCredits(
    userId,
    planId,
    insertedOrder.id,
    toDate(savedMetadata?.paypalPeriodStart)?.getTime() ?? periodStart,
    {
      provider: "paypal",
      subscriptionId,
      periodEnd: savedMetadata?.paypalPeriodEnd !== undefined
        ? toDate(savedMetadata.paypalPeriodEnd)?.getTime() ?? null
        : periodEnd,
    },
  );

  await grantConfiguredFirstOrderReward({
    inviteeUserId: userId,
    sourceOrderId: insertedOrder.id,
    orderAmountUsd: Number(orderData.amountTotal ?? 0),
  });
  if (granted || (granted === undefined && !existed)) {
    await sendPaymentSuccessWeComNotification(insertedOrder.id);
  }
}
