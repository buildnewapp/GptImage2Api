import { getPricingPlanByProviderId } from '@/lib/pricing';
import { syncCreemSubscriptionData } from '@/actions/creem';
import {
  CreemCheckoutCompletedEvent,
  CreemRefundCreatedEvent,
  CreemSubscriptionActiveEvent,
  CreemSubscriptionCanceledEvent,
  CreemSubscriptionExpiredEvent,
  CreemSubscriptionPaidEvent,
  CreemSubscriptionUpdateEvent,
} from '@/lib/creem/types';
import { retrieveCreemTransaction } from '@/lib/creem/client';
import { getDb } from '@/lib/db';
import {
  orders as ordersSchema,
  subscriptions as subscriptionsSchema
} from '@/lib/db/schema';
import {
  grantConfiguredFirstOrderReward,
} from '@/lib/referrals/first-order';
import {
  revokeOneTimeCredits,
  revokeSubscriptionCredits,
  upgradeOneTimeCredits,
  upgradeSubscriptionCredits,
} from '@/lib/payments/credit-manager';
import { isOneTimePurchase, isSubscriptionOrder } from '@/lib/payments/provider-utils';
import type { Order } from '@/lib/payments/types';
import {
  createOrderWithIdempotency,
  findOriginalOrderForRefund,
  refundOrderExists,
  toCurrencyAmount,
  updateOrderStatusAfterRefund,
} from '@/lib/payments/webhook-helpers';
import { sendPaymentSuccessWeComNotification } from '@/lib/payments/wecom-notification';
import { eq, InferInsertModel } from 'drizzle-orm';

export async function handleCreemPaymentSucceeded(
  payload: CreemCheckoutCompletedEvent
) {
  const payment = payload.object;

  const metadata = payment.metadata ?? {};
  const order = payment.order;

  const userId = metadata.userId
  const planId = metadata.planId
  const productId = metadata.productId || payment.product?.id

  if (order.type !== 'onetime' || payment.status !== 'completed') {
    return;
  }

  if (!userId || !planId) {
    throw new Error(`[Creem webhook] Missing userId or planId on checkout ${payment.id}`);
  }

  const orderData: InferInsertModel<typeof ordersSchema> = {
    userId,
    provider: 'creem',
    providerOrderId: order.id,
    status: payment.status === 'completed' ? 'succeeded' : payment.status,
    orderType: 'one_time_purchase', // onetime order
    planId: planId ?? null,
    priceId: null,
    productId: productId ?? null,
    amountSubtotal: toCurrencyAmount(order.sub_total ?? 0),
    amountDiscount: toCurrencyAmount(order.discount_amount ?? 0),
    amountTax: toCurrencyAmount(order.tax_amount ?? 0),
    amountTotal: toCurrencyAmount(order.amount_paid ?? 0),
    currency: order.currency,
    metadata: {
      creemPaymentId: payment.id,
      creemOrderId: order.id,
      creemCustomerId: order.customer,
      creemProductId: order.product,
      productId: productId,
      ...(metadata || {}),
    },
  };

  const { order: insertedOrder, existed } = await createOrderWithIdempotency(
    'creem',
    orderData,
    order.id
  );

  if (!insertedOrder) {
    throw new Error('Failed to insert Creem payment order');
  }

  try {
    // --- [custom] Upgrade the user's benefits---
    const granted = await upgradeOneTimeCredits(userId, planId, insertedOrder.id);
    await grantConfiguredFirstOrderReward({
      inviteeUserId: userId,
      sourceOrderId: insertedOrder.id,
      orderAmountUsd: Number(orderData.amountTotal ?? 0),
    });
    if (granted || (granted === undefined && !existed)) {
      await sendPaymentSuccessWeComNotification(insertedOrder.id);
    }
    // --- End: [custom] Upgrade the user's benefits ---
  } catch (error) {
    console.error(
      `[Creem webhook] Failed to upgrade credits for user ${userId}, order ${insertedOrder.id}`,
      error
    );
    throw error;
  }
}

export async function handleCreemInvoicePaid(
  payload: CreemSubscriptionPaidEvent
) {
  const subscription = payload.object;
  const metadata = subscription.metadata ?? {};

  const subscriptionId = subscription.id;
  const customerId = subscription.customer.id;
  const productId = subscription.product.id;
  const transactionId = subscription.last_transaction_id ?? subscription.last_transaction?.id;
  if (!transactionId) {
    throw new Error(`Missing transaction ID for Creem subscription ${subscriptionId}`);
  }
  const lastTransaction = subscription.last_transaction?.id === transactionId
    ? subscription.last_transaction
    : await retrieveCreemTransaction(transactionId);
  if (lastTransaction.id !== transactionId ||
      (lastTransaction.subscription && lastTransaction.subscription !== subscriptionId) ||
      (lastTransaction.customer && lastTransaction.customer !== customerId)) {
    throw new Error(`Creem transaction ${transactionId} does not match subscription ${subscriptionId}`);
  }
  if (lastTransaction.status !== 'paid' || !lastTransaction.order ||
      !Number.isFinite(lastTransaction.period_start) || lastTransaction.period_start <= 0 ||
      !Number.isFinite(lastTransaction.period_end) || lastTransaction.period_end <= lastTransaction.period_start) {
    throw new Error(`Creem transaction ${transactionId} is not a valid paid subscription transaction`);
  }
  const orderId = lastTransaction.order;

  let userId = metadata.userId
  let planId = metadata.planId

  if (!userId) {
    throw new Error("User ID is required for subscription payment");
  }

  if (!planId) {
    const plan = getPricingPlanByProviderId('creemProductId', productId);
    planId = plan?.id ?? null;
  }

  if (!planId) {
    throw new Error(
      `Unable to determine plan for Creem subscription ${subscription.id}`
    );
  }

  const orderData: InferInsertModel<typeof ordersSchema> = {
    userId,
    provider: 'creem',
    providerOrderId: orderId,
    status: lastTransaction.status === 'paid' ? 'succeeded' : lastTransaction.status,
    orderType: subscription.product.billing_type, // recurring
    planId: planId,
    priceId: productId,
    subscriptionId,
    amountSubtotal: toCurrencyAmount(lastTransaction.amount),
    amountDiscount: toCurrencyAmount(lastTransaction.discount_amount),
    amountTax: toCurrencyAmount(lastTransaction.tax_amount),
    amountTotal: toCurrencyAmount(lastTransaction.amount_paid),
    currency: lastTransaction.currency,
    metadata: {
      creemOrderId: orderId,
      creemTransactionId: transactionId,
      creemSubscriptionId: subscriptionId,
      creemCustomerId: customerId,
      productId: productId,
      ...(metadata || {}),
    },
  };

  const { order: insertedOrder, existed } = await createOrderWithIdempotency(
    'creem',
    orderData,
    orderId
  );

  if (!insertedOrder) {
    console.warn(
      `[Creem webhook] Skipping credit grant for subscription ${subscriptionId}`
    );
    throw new Error(
      `[Creem webhook] Failed to insert order for subscription ${subscriptionId}`
    );
  }


  try {
    // [custom] Upgrade the user's benefits
    const granted = await upgradeSubscriptionCredits(
      userId,
      planId,
      insertedOrder.id,
      lastTransaction.period_start,
      {
        provider: 'creem',
        subscriptionId,
        periodEnd: lastTransaction.period_end,
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
    // --- End: [custom] Upgrade the user's benefits ---
  } catch (error) {
    console.error(
      `[Creem webhook] Failed to upgrade subscription credits for user ${userId}, order ${insertedOrder.id}`,
      error
    );
    throw error;
  }

  try {
    await syncCreemSubscriptionData(subscriptionId, subscription?.metadata);
  } catch (error) {
    console.error(
      `[Creem webhook] Failed to sync subscription ${subscriptionId}`,
      error
    );
    throw error;
  }
}

export async function handleCreemSubscriptionUpdated(
  payload: CreemSubscriptionUpdateEvent | CreemSubscriptionActiveEvent | CreemSubscriptionExpiredEvent | CreemSubscriptionCanceledEvent,
  isDeleted: boolean = false
) {
  const subscription = payload.object
  const subscriptionId = subscription?.id;

  try {
    await syncCreemSubscriptionData(subscriptionId, subscription?.metadata);
    if (isDeleted) {
      console.log(`[Creem webhook] Subscription ${subscriptionId} deleted. Order/subscription state synced.`);
    }
  } catch (error) {
    console.error(
      `[Creem webhook] Failed to sync subscription ${subscriptionId}`,
      error
    );
    throw error;
  }
}

export async function handleCreemPaymentRefunded(
  payload: CreemRefundCreatedEvent
) {
  const db = getDb();

  const refund = payload.object;
  const refundId = refund.id;
  const orderId = refund.order.id;

  // Check if refund already processed
  const refundExists = await refundOrderExists('creem', refundId);
  if (refundExists) {
    return;
  }

  const originalOrder = await findOriginalOrderForRefund('creem', orderId);

  if (!originalOrder) {
    console.error(
      `[Creem webhook] Refund received for unknown order ${orderId}`
    );
    return;
  }

  const refundAmountCents = Math.abs(refund.refund_amount);
  const paidAmountCents = refund.transaction.amount_paid;

  // Update original order status
  await updateOrderStatusAfterRefund(
    originalOrder.id,
    refundAmountCents,
    paidAmountCents
  );

  const refundData: InferInsertModel<typeof ordersSchema> = {
    userId: originalOrder.userId,
    provider: 'creem',
    providerOrderId: `${refundId}`,
    status: refund.status,
    orderType: 'refund',
    planId: originalOrder.planId,
    productId: originalOrder.productId,
    amountTotal: (-refundAmountCents / 100).toString(),
    currency: originalOrder.currency,
    metadata: {
      creemRefundId: refund.id,
      creemOrderId: refund.order.id,
      ...(refund.checkout.metadata ?? {}),
    },
  };

  const [refundOrder] = await db
    .insert(ordersSchema)
    .values(refundData)
    .returning({ id: ordersSchema.id });

  if (!refundOrder) {
    throw new Error(
      `[Creem webhook] Failed to insert refund order for payment ${refundId}`
    );
  }

  if (isOneTimePurchase(originalOrder.orderType)) {
    await revokeOneTimeCredits(refundAmountCents, originalOrder as Order, refundOrder.id);
  } else if (isSubscriptionOrder(originalOrder.orderType)) {
    if (refundAmountCents >= paidAmountCents) {
      await revokeSubscriptionCredits(originalOrder as Order);
    } else {
      console.warn(`[Creem webhook] Partial subscription refund ${refundId} detected. Skipping subscription credit revocation.`);
    }
  }

  console.log(
    `[Creem webhook] Refund ${refundId} recorded for original order ${originalOrder.id} with credit revocation`
  );
}
