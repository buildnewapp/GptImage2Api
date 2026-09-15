import { getPricingPlanByProviderId } from '@/lib/pricing';
import {
  sendCreditUpgradeFailedEmail,
  sendFraudRefundUserEmail,
  sendFraudWarningAdminEmail,
  sendInvoicePaymentFailedEmail,
  syncSubscriptionData,
} from '@/actions/stripe';
import { getDb } from '@/lib/db';
import {
  orders as ordersSchema,
  user as userSchema,
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
import { isOneTimePurchase, isSubscriptionOrder, ORDER_TYPES } from '@/lib/payments/provider-utils';
import type { Order } from '@/lib/payments/types';
import {
  createOrderWithIdempotency,
  findOriginalOrderForRefund,
  refundOrderExists,
  toCurrencyAmount,
  updateOrderStatusAfterRefund,
} from '@/lib/payments/webhook-helpers';
import { sendPaymentSuccessWeComNotification } from '@/lib/payments/wecom-notification';
import { stripe } from '@/lib/stripe';
import { and, eq, InferInsertModel } from 'drizzle-orm';
import Stripe from 'stripe';

/**
 * Handles the `checkout.session.completed` event from Stripe.
 *
 * - For one-time payments, it creates an order record and grants credits.
 * - For subscriptions, it triggers the initial subscription sync.
 *
 * @param session The Stripe Checkout Session object.
 */
export async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== 'payment' ||
      (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required')) {
    return;
  }

  const userId = session.metadata?.userId;
  const planId = session.metadata?.planId;
  const priceId = session.metadata?.priceId;

  if (!userId || !planId || !priceId) {
    throw new Error(`Missing userId, planId or priceId in checkout session ${session.id}`);
  }

  if (session.mode === 'payment') {
    let paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent : session.payment_intent?.id;

    if (!paymentIntentId) {
      console.error('Payment Intent ID missing from completed checkout session (mode=payment):', session.id);
      // return;
      paymentIntentId = session.id;
    }

    const orderData: InferInsertModel<typeof ordersSchema> = {
      userId: userId,
      provider: 'stripe',
      providerOrderId: paymentIntentId,
      stripePaymentIntentId: paymentIntentId,
      status: 'succeeded',
      orderType: 'one_time_purchase',
      planId: planId,
      priceId: priceId,
      amountSubtotal: toCurrencyAmount(session.amount_subtotal),
      amountDiscount: toCurrencyAmount(session.total_details?.amount_discount) || '0',
      amountTax: toCurrencyAmount(session.total_details?.amount_tax) || '0',
      amountTotal: toCurrencyAmount(session.amount_total) || '0',
      currency: session.currency || process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || 'usd',
      metadata: {
        stripeCheckoutSessionId: session.id,
        ...session.metadata
      }
    };

    const { order: insertedOrder, existed } = await createOrderWithIdempotency(
      'stripe',
      orderData,
      paymentIntentId
    );

    if (!insertedOrder) {
      console.error('Error inserting one-time purchase order');
      throw new Error('Could not insert order');
    }

    // --- [custom] Upgrade the user's benefits ---
    const orderId = insertedOrder.id;
    try {
      const granted = await upgradeOneTimeCredits(userId, planId, orderId);
      await grantConfiguredFirstOrderReward({
        inviteeUserId: userId,
        sourceOrderId: orderId,
        orderAmountUsd: Number(orderData.amountTotal ?? 0),
      });
      if (granted || (granted === undefined && !existed)) {
        await sendPaymentSuccessWeComNotification(orderId);
      }
    } catch (error) {
      console.error(`CRITICAL: Failed to upgrade one-time credits for user ${userId}, order ${orderId}:`, error);
      await sendCreditUpgradeFailedEmail({ userId, orderId, planId, error });
      throw error;
    }
    // --- End: [custom] Upgrade the user's benefits ---
  }
}

/**
 * Handles the `invoice.paid` event from Stripe.
 *
 * - Primarily for subscription renewals/payments.
 * - Creates an order record for the invoice.
 * - Grants/Resets subscription credits in the usage table.
 *
 * @param invoice The Stripe Invoice object.
 */
export async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const db = getDb();
  // Webhook endpoints can still send the pre-Basil invoice shape.
  const legacyInvoice = invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null };
  const subscriptionRef = invoice.parent?.subscription_details?.subscription ?? legacyInvoice.subscription;
  const subscriptionId = typeof subscriptionRef === 'string' ? subscriptionRef : subscriptionRef?.id;
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  const invoiceId = invoice.id;

  if (invoice.status !== 'paid' || !invoice.billing_reason?.startsWith('subscription')) {
    return;
  }
  if (!subscriptionId || !customerId || !invoiceId) {
    throw new Error(`Missing subscription, customer or invoice ID on paid invoice ${invoiceId}`);
  }
  if (!stripe) {
    throw new Error('Stripe is not initialized');
  }

  const [existingOrder] = await db.select().from(ordersSchema)
    .where(and(eq(ordersSchema.provider, 'stripe'), eq(ordersSchema.providerOrderId, invoiceId)))
    .limit(1);
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const subscriptionItem = subscription.items.data[0];
  const invoiceData = await stripe.invoices.retrieve(invoiceId, { expand: ['payments'] });
  const invoiceLines = invoice.lines?.data.length ? invoice.lines.data : invoiceData.lines?.data ?? [];
  const invoiceLine = invoiceLines.find((line) =>
    line.parent?.type === 'subscription_item_details' ||
    (line as Stripe.InvoiceLineItem & { type?: string }).type === 'subscription',
  );
  const legacyPrice = (invoiceLine as (Stripe.InvoiceLineItem & { price?: Stripe.Price }) | undefined)?.price;
  const priceId = existingOrder?.priceId ?? invoiceLine?.pricing?.price_details?.price ?? legacyPrice?.id ?? subscriptionItem?.price.id;
  const productRef = invoiceLine?.pricing?.price_details?.product ?? legacyPrice?.product ?? subscriptionItem?.price.product;
  const productId = existingOrder?.productId ?? (typeof productRef === 'string' ? productRef : productRef?.id);
  let userId = existingOrder?.userId ?? subscription.metadata?.userId;
  const planId = existingOrder?.planId ??
    (priceId ? getPricingPlanByProviderId('stripePriceId', priceId)?.id : null) ?? subscription.metadata?.planId;

  if (!userId) {
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted) {
      userId = customer.metadata?.userId;
    }
  }
  if (!userId || !planId) {
    throw new Error(`Cannot determine user or plan for paid invoice ${invoiceId}`);
  }

  // A replay must use the paid invoice's period, not the subscription's latest cycle.
  const currentPeriodStart = (invoiceLine?.period.start ?? 0) * 1000;
  const currentPeriodEnd = (invoiceLine?.period.end ?? 0) * 1000;
  if (!Number.isFinite(currentPeriodStart) || currentPeriodStart <= 0 ||
      !Number.isFinite(currentPeriodEnd) || currentPeriodEnd <= currentPeriodStart) {
    throw new Error(`Missing billing period for paid invoice ${invoiceId}`);
  }
  const paymentRef = invoiceData.payments?.data[0]?.payment.payment_intent;
  const paymentIntentId = typeof paymentRef === 'string' ? paymentRef : paymentRef?.id;
  const orderData: InferInsertModel<typeof ordersSchema> = {
    userId,
    provider: 'stripe',
    providerOrderId: invoiceId,
    stripePaymentIntentId: paymentIntentId,
    stripeInvoiceId: invoiceId,
    subscriptionId,
    status: 'succeeded',
    orderType: invoice.billing_reason === 'subscription_create' ? ORDER_TYPES.SUBSCRIPTION_INITIAL : ORDER_TYPES.SUBSCRIPTION_RENEWAL,
    planId,
    priceId,
    productId,
    amountSubtotal: toCurrencyAmount(invoice.subtotal),
    amountDiscount: toCurrencyAmount(invoice.total_discount_amounts?.reduce((sum, disc) => sum + disc.amount, 0) ?? 0),
    amountTax: toCurrencyAmount(invoice.total_taxes?.reduce((sum, tax) => sum + tax.amount, 0) ?? 0),
    amountTotal: toCurrencyAmount(invoice.amount_paid),
    currency: invoice.currency,
    metadata: {
      stripeInvoiceId: invoiceId,
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: customerId,
      billingReason: invoice.billing_reason,
      ...(invoice.metadata || {}),
    },
  };
  const { order, existed } = await createOrderWithIdempotency('stripe', orderData, invoiceId);
  if (!order) {
    throw new Error(`Could not create order for invoice ${invoiceId}`);
  }

  try {
    const granted = await upgradeSubscriptionCredits(userId, planId, order.id, currentPeriodStart, {
      provider: 'stripe',
      subscriptionId,
      periodEnd: currentPeriodEnd,
    });
    await grantConfiguredFirstOrderReward({
      inviteeUserId: userId,
      sourceOrderId: order.id,
      orderAmountUsd: Number(orderData.amountTotal ?? 0),
    });
    if (granted || (granted === undefined && !existed)) {
      await sendPaymentSuccessWeComNotification(order.id);
    }
  } catch (error) {
    console.error(`Failed to grant subscription credits for invoice ${invoiceId}:`, error);
    await sendCreditUpgradeFailedEmail({ userId, orderId: order.id, planId, error });
    throw error;
  }

  // Let the provider retry a failed sync; credit grants are independently idempotent.
  await syncSubscriptionData(subscriptionId, customerId);
}

/**
 * Handles subscription update events (`created`, `updated`, `deleted`).
 * Calls syncSubscriptionData to update the central subscription record in `orders`.
 *
 * @param subscription The Stripe Subscription object.
 */
export async function handleSubscriptionUpdate(subscription: Stripe.Subscription, isDeleted: boolean = false) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : null;

  if (!customerId) {
    console.error(`Customer ID missing on subscription object: ${subscription.id}. Cannot sync.`);
    return;
  }

  try {
    await syncSubscriptionData(subscription.id, customerId, subscription.metadata);

    if (isDeleted) {
      console.log(`Subscription ${subscription.id} deleted. Order/subscription state synced.`);
    }
  } catch (error) {
    console.error(`Error syncing subscription ${subscription.id} during update event:`, error);
    throw error;
  }
}

/**
 * Handles the `invoice.payment_failed` event from Stripe.
 * Calls syncSubscriptionData to update the central subscription record in `orders`.
 *
 * @param invoice The Stripe Invoice object.
 */
export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const db = getDb();

  const legacyInvoice = invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null };
  const subscriptionRef = invoice.parent?.subscription_details?.subscription ?? legacyInvoice.subscription;
  const subscriptionId = typeof subscriptionRef === 'string' ? subscriptionRef : subscriptionRef?.id;
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  const invoiceId = invoice.id;

  if (!subscriptionId || !customerId || !invoiceId) {
    console.warn(`Skipping invoice.payment_failed handler for invoice ${invoiceId ?? 'N/A'}: Could not determine subscriptionId (${subscriptionId}) or customerId (${customerId}).`);
    return;
  }

  // Sync the subscription state (likely becomes 'past_due' or 'unpaid')
  try {
    await syncSubscriptionData(subscriptionId, customerId);
  } catch (syncError) {
    console.error(`Error syncing subscription ${subscriptionId} during invoice.payment_failed handling for invoice ${invoiceId}:`, syncError);
    throw syncError;
  }

  // Send notification email
  try {
    await sendInvoicePaymentFailedEmail({
      invoice,
      subscriptionId,
      customerId,
      invoiceId
    });
  } catch (emailError) {
    console.error(`Error sending payment failed email for invoice ${invoiceId}:`, emailError);
  }
}

/**
 * Handles the `charge.refunded` event.
 *
 * - Creates a refund order record.
 * - Implement logic to revoke credits granted by the original purchase.
 *
 * @param charge The Stripe Charge object (specifically the refunded charge).
 */
export async function handleRefund(charge: Stripe.Charge) {
  const db = getDb();

  if (!charge.refunded) {
    return;
  }

  const chargeId = charge.id;
  const paymentIntentId = charge.payment_intent as string | null;
  const customerId = typeof charge.customer === 'string' ? charge.customer : null;

  if (!chargeId || !paymentIntentId) {
    console.error(`Refund ID missing from refunded charge: ${charge.id}. Cannot process refund fully.`);
    return;
  }
  if (!customerId) {
    console.error(`Customer ID missing from refunded charge: ${charge.id}. Cannot process refund fully.`);
    return;
  }

  // Check if refund already processed
  const refundExists = await refundOrderExists('stripe', chargeId);
  if (refundExists) {
    return;
  }

  const originalOrder = await findOriginalOrderForRefund('stripe', paymentIntentId);

  if (!originalOrder) {
    console.error(`Original order for payment intent ${paymentIntentId} not found.`);
    return;
  }

  // Update original order status
  await updateOrderStatusAfterRefund(
    originalOrder.id,
    charge.amount_refunded,
    Math.round(parseFloat(originalOrder.amountTotal!) * 100)
  );

  if (!stripe) {
    console.error('Stripe is not initialized. Please check your environment variables.');
    return;
  }

  let userId: string | null = null;
  const customer = await stripe.customers.retrieve(customerId);
  if (!(customer as Stripe.DeletedCustomer).deleted) {
    userId = (customer as Stripe.Customer).metadata?.userId ?? null;
  }

  if (!userId) {
    console.error(`Customer ID missing from refunded charge: ${charge.id}. Cannot process refund fully.`);
    return;
  }

  const refundData: InferInsertModel<typeof ordersSchema> = {
    userId: originalOrder.userId ?? userId,
    provider: 'stripe',
    providerOrderId: chargeId,
    stripePaymentIntentId: paymentIntentId,
    stripeChargeId: chargeId,
    status: 'succeeded',
    orderType: 'refund',
    planId: originalOrder.planId ?? null,
    priceId: null,
    productId: null,
    amountSubtotal: null,
    amountDiscount: null,
    amountTax: null,
    amountTotal: (-toCurrencyAmount(charge.amount_refunded)).toString(),
    currency: charge.currency,
    subscriptionId: null,
    metadata: {
      stripeChargeId: charge.id,
      stripePaymentIntentId: paymentIntentId,
      originalOrderId: originalOrder?.id ?? null,
      refundReason: charge.refunds?.data[0]?.reason,
      ...(charge.metadata || {}),
    }
  };

  const refundOrderResults = await db
    .insert(ordersSchema)
    .values(refundData)
    .returning({ id: ordersSchema.id });
  const refundOrder = refundOrderResults[0];

  if (!refundOrder) {
    throw new Error(`Error inserting refund order for refund ${chargeId}`);
  }

  const originalTotalCents = Math.round(parseFloat(originalOrder.amountTotal ?? '0') * 100);

  if (isOneTimePurchase(originalOrder.orderType)) {
    await revokeOneTimeCredits(charge.amount_refunded, originalOrder as Order, refundOrder.id);
  } else if (isSubscriptionOrder(originalOrder.orderType)) {
    if (charge.amount_refunded >= originalTotalCents) {
      await revokeSubscriptionCredits(originalOrder as Order);
    } else {
      console.warn(`Stripe partial subscription refund ${chargeId} detected. Skipping subscription credit revocation.`);
    }
  }

  console.log(`Refund ${chargeId} recorded for original order ${originalOrder.id} with credit revocation.`);
}

/**
 * Handles the `radar.early_fraud_warning.created` event.
 * Initiates a refund for the fraudulent charge.
 *
 * @param warning The Stripe Radar Early Fraud Warning object.
 */
export async function handleEarlyFraudWarningCreated(warning: Stripe.Radar.EarlyFraudWarning) {
  const db = getDb();

  const chargeId = warning.charge;
  if (typeof chargeId !== 'string') {
    console.error('Charge ID missing from early fraud warning:', warning.id);
    return;
  }

  if (!stripe) {
    console.error('Stripe is not initialized. Please check your environment variables.');
    return;
  }

  // Get the configuration from environment variable
  const fraudWarningType = process.env.STRIPE_RADAR_EARLY_FRAUD_WARNING_TYPE?.toLowerCase() || '';
  const actions = fraudWarningType.split(',').map(action => action.trim());

  const shouldRefund = actions.includes('refund');
  const shouldSendEmail = actions.includes('email');

  if (!shouldRefund && !shouldSendEmail) {
    console.warn(`Fraud warning ${warning.id} for charge ${chargeId} detected, but no automatic actions configured. Set STRIPE_RADAR_EARLY_FRAUD_WARNING_TYPE to enable automatic responses.`);
    return;
  }

  try {
    const charge = (await stripe.charges.retrieve(chargeId)) as any;

    if (shouldRefund) {
      if (!charge.refunded) {
        await stripe.refunds.create({
          charge: chargeId,
          reason: 'fraudulent',
        });
        console.log(`Refund for charge ${chargeId}.`);

        // if the charge is a subscription, delete the latest subscription
        if (charge.description?.includes('Subscription')) {
          const customerId = charge.customer as string;
          const subscription = await stripe.subscriptions.list({
            customer: customerId,
            limit: 1,
          });
          const latestSubscription = subscription.data[0] || null;
          if (latestSubscription?.id) {
            await stripe.subscriptions.cancel(latestSubscription.id as string);
            console.log(`Cancelled subscription ${latestSubscription.id} due to fraudulent charge.`);
          }
        }
      } else {
        console.log(`Charge ${chargeId} already refunded.`);
      }
    }

    if (shouldSendEmail) {
      // Send email to admin about fraudulent charge
      const actionsTaken: string[] = [];
      if (shouldRefund) {
        actionsTaken.push('Automatic refund initiated');
        if (charge.description?.includes('Subscription')) {
          actionsTaken.push('Associated subscription cancelled');
        }
      }
      actionsTaken.push('Fraud warning email sent to administrators');

      try {
        await sendFraudWarningAdminEmail({
          warningId: warning.id,
          chargeId: chargeId,
          customerId: charge.customer as string,
          amount: charge.amount / 100,
          currency: charge.currency,
          fraudType: 'Early Fraud Warning',
          chargeDescription: charge.description || undefined,
          actionsTaken,
        });
      } catch (adminEmailError) {
        console.error(`Failed to send fraud warning admin email for charge ${chargeId}:`, adminEmailError);
      }

      // Send email to user about refund (only if refund was processed)
      if (shouldRefund && !charge.refunded) {
        try {
          await sendFraudRefundUserEmail({
            charge,
            refundAmount: charge.amount,
          });
        } catch (userEmailError) {
          console.error(`Failed to send fraud refund user email for charge ${chargeId}:`, userEmailError);
        }
      }
    }
  } catch (error) {
    console.error(`Error handling early fraud warning ${warning.id} for charge ${chargeId}:`, error);
    throw error;
  }
}
