import { getDb } from "@/lib/db";
import {
  orders as ordersSchema,
  pricingPlans as pricingPlansSchema,
  subscriptions as subscriptionsSchema,
} from "@/lib/db/schema";
import {
  revokeOneTimeCredits,
  revokeSubscriptionCredits,
  upgradeOneTimeCredits,
  upgradeSubscriptionCredits,
} from "@/lib/payments/credit-manager";
import {
  isOneTimePurchase,
  isSubscriptionOrder,
} from "@/lib/payments/provider-utils";
import type { Order } from "@/lib/payments/types";
import {
  createOrderWithIdempotency,
  findOriginalOrderForRefund,
  refundOrderExists,
  toCents,
  updateOrderStatusAfterRefund,
} from "@/lib/payments/webhook-helpers";
import { sendPaymentSuccessWeComNotification } from "@/lib/payments/wecom-notification";
import { grantConfiguredFirstOrderReward } from "@/lib/referrals/first-order";
import {
  getSubotizCheckoutSession,
  getSubotizSubscription,
} from "@/lib/subotiz/client";
import type {
  SubotizInvoice,
  SubotizMetadata,
  SubotizRefund,
  SubotizSubscription,
  SubotizTrade,
  SubotizWebhookEvent,
} from "@/lib/subotiz/types";
import { eq, type InferInsertModel } from "drizzle-orm";

function toDate(value?: string | null): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeSubscriptionStatus(status: string): string {
  return status === "trial" ? "trialing" : status;
}

function getInvoiceMetadata(invoice: SubotizInvoice): SubotizMetadata {
  return {
    ...(invoice.subscription_data?.metadata ?? {}),
    ...(invoice.metadata ?? {}),
  };
}

async function upsertSubotizSubscription(
  subscription: SubotizSubscription,
  eventType: string,
  initialMetadata: SubotizMetadata = {},
) {
  const db = getDb();
  const metadata = {
    ...(subscription.metadata ?? {}),
    ...initialMetadata,
  };

  const [existing] = await db
    .select({
      customerId: subscriptionsSchema.customerId,
      currentPeriodStart: subscriptionsSchema.currentPeriodStart,
      currentPeriodEnd: subscriptionsSchema.currentPeriodEnd,
      metadata: subscriptionsSchema.metadata,
      planId: subscriptionsSchema.planId,
      priceId: subscriptionsSchema.priceId,
      userId: subscriptionsSchema.userId,
    })
    .from(subscriptionsSchema)
    .where(eq(subscriptionsSchema.subscriptionId, subscription.id))
    .limit(1);

  const existingMetadata =
    existing?.metadata && typeof existing.metadata === "object"
      ? (existing.metadata as Record<string, unknown>)
      : {};
  const priceId =
    subscription.price_id ||
    metadata.priceId ||
    existing?.priceId ||
    String(existingMetadata.subotizPriceId ?? "");
  const userId =
    metadata.userId ||
    existing?.userId ||
    String(existingMetadata.userId ?? "");

  let planId =
    metadata.planId ||
    existing?.planId ||
    String(existingMetadata.planId ?? "");

  if (!planId && priceId) {
    const [plan] = await db
      .select({ id: pricingPlansSchema.id })
      .from(pricingPlansSchema)
      .where(eq(pricingPlansSchema.subotizPriceId, priceId))
      .limit(1);
    planId = plan?.id ?? "";
  }

  const customerId = subscription.customer_id || existing?.customerId;
  if (!userId || !planId || !customerId) {
    throw new Error(
      `Unable to resolve Subotiz subscription ownership for ${subscription.id}`,
    );
  }

  const isCancellationRequested =
    eventType === "v2.subscription.cancellation_requested";
  const isCanceled =
    eventType === "v2.subscription.canceled" ||
    subscription.status === "canceled";
  const status = isCanceled
    ? "canceled"
    : normalizeSubscriptionStatus(subscription.status || "active");
  const currentPeriodStart =
    toDate(subscription.current_period_start) ??
    existing?.currentPeriodStart ??
    null;
  const currentPeriodEnd =
    toDate(subscription.current_period_end) ??
    existing?.currentPeriodEnd ??
    null;

  const values: InferInsertModel<typeof subscriptionsSchema> = {
    userId,
    planId,
    provider: "subotiz",
    subscriptionId: subscription.id,
    customerId,
    productId: null,
    priceId: priceId || null,
    status,
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd:
      isCancellationRequested ||
      Boolean(subscription.expected_cancel_at && !isCanceled),
    canceledAt: isCanceled
      ? (toDate(subscription.cancel_at) ?? new Date())
      : null,
    endedAt: isCanceled
      ? (toDate(subscription.end_at) ?? toDate(subscription.cancel_at))
      : null,
    trialStart: status === "trialing" ? currentPeriodStart : null,
    trialEnd: status === "trialing" ? currentPeriodEnd : null,
    metadata: {
      ...existingMetadata,
      ...metadata,
      subotizCustomerId: customerId,
      subotizOrderId: subscription.order_id ?? metadata.subotizOrderId,
      subotizPriceId: priceId || null,
      subotizSubscriptionId: subscription.id,
    },
  };

  await db.insert(subscriptionsSchema).values(values).onConflictDoUpdate({
    target: subscriptionsSchema.subscriptionId,
    set: values,
  });
}

export async function handleSubotizTradeSucceeded(
  event: SubotizWebhookEvent<SubotizTrade>,
) {
  const trade = event.data;
  if (
    trade.payment_mode === "subscription" ||
    trade.payment_mode === "recurring_payment"
  ) {
    return;
  }

  let metadata = trade.metadata ?? {};
  if ((!metadata.userId || !metadata.planId) && trade.session_id) {
    const checkoutSession = await getSubotizCheckoutSession(trade.session_id);
    metadata = {
      ...(checkoutSession.metadata ?? {}),
      ...metadata,
    };
  }

  const userId = metadata.userId;
  const planId = metadata.planId;

  if (!userId || !planId) {
    throw new Error(`Missing Subotiz trade metadata for ${trade.trade_id}`);
  }

  const orderData: InferInsertModel<typeof ordersSchema> = {
    userId,
    provider: "subotiz",
    providerOrderId: trade.trade_id,
    orderType: "one_time_purchase",
    status: "succeeded",
    planId,
    priceId: metadata.priceId ?? null,
    productId: null,
    amountSubtotal: trade.amount,
    amountDiscount: "0",
    amountTax: "0",
    amountTotal: trade.amount,
    currency: trade.currency,
    metadata: {
      ...metadata,
      subotizCustomerId: trade.customer_id,
      subotizEventId: event.id,
      subotizOrderId: trade.order_id,
      subotizSessionId: trade.session_id,
      subotizTradeId: trade.trade_id,
    },
  };

  const { order, existed } = await createOrderWithIdempotency(
    "subotiz",
    orderData,
    trade.trade_id,
  );
  if (existed) {
    return;
  }
  if (!order) {
    throw new Error(`Failed to insert Subotiz trade ${trade.trade_id}`);
  }

  await upgradeOneTimeCredits(userId, planId, order.id);
  await grantConfiguredFirstOrderReward({
    inviteeUserId: userId,
    sourceOrderId: order.id,
    orderAmountUsd: Number(trade.amount),
  });
  await sendPaymentSuccessWeComNotification(order.id);
}

export async function handleSubotizInvoicePaid(
  event: SubotizWebhookEvent<SubotizInvoice>,
) {
  const db = getDb();
  const invoice = event.data;
  if (!invoice.subscription_id) {
    return;
  }

  let metadata = getInvoiceMetadata(invoice);
  let remoteSubscription: SubotizSubscription | null = null;
  if (!metadata.userId || !metadata.planId) {
    remoteSubscription = await getSubotizSubscription(invoice.subscription_id);
    metadata = {
      ...(remoteSubscription.metadata ?? {}),
      ...metadata,
    };
  }

  await upsertSubotizSubscription(
    {
      ...(remoteSubscription ?? {}),
      id: invoice.subscription_id,
      customer_id: invoice.customer_id || remoteSubscription?.customer_id || "",
      sub_merchant_id:
        invoice.sub_merchant_id || remoteSubscription?.sub_merchant_id || "",
      status: "active",
      price_id: metadata.priceId ?? remoteSubscription?.price_id ?? "",
      current_period_start:
        invoice.cycle_start ?? remoteSubscription?.current_period_start,
      current_period_end:
        invoice.cycle_end ?? remoteSubscription?.current_period_end,
      order_id: invoice.order_id,
      source_trade_id: invoice.trade_id,
      metadata,
    },
    event.type,
    metadata,
  );

  const [storedSubscription] = await db
    .select({
      planId: subscriptionsSchema.planId,
      priceId: subscriptionsSchema.priceId,
      userId: subscriptionsSchema.userId,
    })
    .from(subscriptionsSchema)
    .where(eq(subscriptionsSchema.subscriptionId, invoice.subscription_id))
    .limit(1);

  if (!storedSubscription) {
    throw new Error(
      `Subotiz subscription ${invoice.subscription_id} was not stored`,
    );
  }

  const providerOrderId = invoice.trade_id || invoice.id;
  const orderData: InferInsertModel<typeof ordersSchema> = {
    userId: storedSubscription.userId,
    provider: "subotiz",
    providerOrderId,
    orderType: "recurring",
    status: "succeeded",
    subscriptionId: invoice.subscription_id,
    planId: storedSubscription.planId,
    priceId: storedSubscription.priceId,
    productId: null,
    amountSubtotal: invoice.amount,
    amountDiscount: "0",
    amountTax: "0",
    amountTotal: invoice.amount,
    currency: invoice.currency,
    metadata: {
      ...metadata,
      subotizCustomerId: invoice.customer_id,
      subotizEventId: event.id,
      subotizInvoiceId: invoice.id,
      subotizInvoiceType: invoice.invoice_type,
      subotizOrderId: invoice.order_id,
      subotizSubscriptionId: invoice.subscription_id,
      subotizTradeId: invoice.trade_id,
    },
  };

  const { order, existed } = await createOrderWithIdempotency(
    "subotiz",
    orderData,
    providerOrderId,
  );
  if (existed) {
    return;
  }
  if (!order) {
    throw new Error(`Failed to insert Subotiz invoice ${invoice.id}`);
  }

  await upgradeSubscriptionCredits(
    storedSubscription.userId,
    storedSubscription.planId,
    order.id,
    toDate(
      invoice.cycle_start ?? invoice.paid_at ?? invoice.created_at,
    )?.getTime() ?? Date.now(),
    {
      provider: "subotiz",
      subscriptionId: invoice.subscription_id,
      periodEnd: invoice.cycle_end,
    },
  );
  await grantConfiguredFirstOrderReward({
    inviteeUserId: storedSubscription.userId,
    sourceOrderId: order.id,
    orderAmountUsd: Number(invoice.amount),
  });
  await sendPaymentSuccessWeComNotification(order.id);
}

export async function handleSubotizSubscriptionUpdated(
  event: SubotizWebhookEvent<SubotizSubscription>,
) {
  await upsertSubotizSubscription(event.data, event.type);
}

export async function handleSubotizRefundSucceeded(
  event: SubotizWebhookEvent<SubotizRefund>,
) {
  const db = getDb();
  const refund = event.data;

  if (await refundOrderExists("subotiz", refund.refund_id)) {
    return;
  }

  const originalOrder = await findOriginalOrderForRefund(
    "subotiz",
    refund.trade_id,
  );
  if (!originalOrder) {
    console.warn(
      `[Subotiz webhook] Original order for trade ${refund.trade_id} was not found`,
    );
    return;
  }

  const refundAmountCents = toCents(refund.refund_amount);
  const originalAmountCents = toCents(originalOrder.amountTotal);
  await updateOrderStatusAfterRefund(
    originalOrder.id,
    refundAmountCents,
    originalAmountCents,
  );

  const [refundOrder] = await db
    .insert(ordersSchema)
    .values({
      userId: originalOrder.userId,
      provider: "subotiz",
      providerOrderId: refund.refund_id,
      orderType: "refund",
      status: "succeeded",
      subscriptionId: originalOrder.subscriptionId,
      planId: originalOrder.planId,
      priceId: originalOrder.priceId,
      productId: originalOrder.productId,
      amountTotal: (-Number(refund.refund_amount)).toFixed(2),
      currency: refund.currency,
      metadata: {
        ...(refund.metadata ?? {}),
        originalOrderId: originalOrder.id,
        subotizEventId: event.id,
        subotizRefundId: refund.refund_id,
        subotizTradeId: refund.trade_id,
      },
    })
    .returning({ id: ordersSchema.id });

  if (!refundOrder) {
    throw new Error(`Failed to insert Subotiz refund ${refund.refund_id}`);
  }

  if (isOneTimePurchase(originalOrder.orderType)) {
    await revokeOneTimeCredits(
      refundAmountCents,
      originalOrder as Order,
      refundOrder.id,
    );
  } else if (
    isSubscriptionOrder(originalOrder.orderType) &&
    refundAmountCents >= originalAmountCents
  ) {
    await revokeSubscriptionCredits(originalOrder as Order);
  }
}
