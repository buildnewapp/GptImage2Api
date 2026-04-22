import { createStripeCheckoutSession } from '@/actions/stripe';
import { apiResponse } from '@/lib/api-response';
import { getSession } from '@/lib/auth/server';
import {
  createCreemCheckoutSession
} from '@/lib/creem/client';
import { getDb } from '@/lib/db';
import { pricingPlans as pricingPlansSchema } from '@/lib/db/schema';
import { getErrorMessage } from '@/lib/error-utils';
import { encodePayPalCustomId, getPayPalApprovalUrl } from '@/lib/paypal';
import { PayPalClient } from '@/lib/paypal/client';
import { isRecurringPaymentType } from '@/lib/payments/provider-utils';
import { assertRecurringPurchaseIsHigherTier } from '@/lib/payments/subscription-purchase';
import { getURL } from '@/lib/url';
import { eq } from 'drizzle-orm';
import { siteConfig } from '@/config/site';

type RequestData = {
  provider?: string;
  stripePriceId?: string;
  creemProductId?: string;
  planId?: string;
  couponCode?: string;
  referral?: string;
};

export async function POST(req: Request) {
  const db = getDb();

  const session = await getSession();
  const user = session?.user;
  if (!user) {
    return apiResponse.unauthorized();
  }

  let requestData: RequestData;
  try {
    requestData = await req.json();
  } catch (error) {
    console.error('Invalid request body:', error);
    return apiResponse.badRequest();
  }

  const provider = requestData.provider;

  try {
    if (provider === 'stripe') {
      const { stripePriceId } = requestData;
      if (!stripePriceId) {
        return apiResponse.badRequest('Missing stripePriceId');
      }
      const result = await createStripeCheckoutSession({
        userId: user.id,
        priceId: stripePriceId,
        couponCode: requestData.couponCode,
        referral: requestData.referral,
      });
      return apiResponse.success(result);
    }

    if (provider === 'creem') {
      const { creemProductId, couponCode } = requestData;
      if (!creemProductId) {
        return apiResponse.badRequest('Missing creemProductId');
      }

      const results = await db
        .select({
          id: pricingPlansSchema.id,
          cardTitle: pricingPlansSchema.cardTitle,
          paymentType: pricingPlansSchema.paymentType,
          trialPeriodDays: pricingPlansSchema.trialPeriodDays,
          creemProductId: pricingPlansSchema.creemProductId,
        })
        .from(pricingPlansSchema)
        .where(eq(pricingPlansSchema.creemProductId, creemProductId))
        .limit(1);

      const plan = results[0];

      if (!plan) {
        return apiResponse.notFound('Plan not found for Creem product ID');
      }

      if (isRecurringPaymentType(plan.paymentType)) {
        await assertRecurringPurchaseIsHigherTier(user.id, plan.id);
      }

      const sessionParams = {
        product_id: creemProductId,
        units: 1,
        discount_code: couponCode,
        customer: {
          // id: customerId,
          email: user.email,
        },
        success_url: getURL(
          'payment/success?provider=creem'
        ),
        metadata: {
          userId: user.id,
          userEmail: user.email,
          planId: plan.id,
          planName: plan.cardTitle,
          productId: plan.creemProductId,
        },
      }

      const sessionPayload = await createCreemCheckoutSession(sessionParams);

      if (!sessionPayload?.id) {
        throw new Error('Creem session creation failed (missing session ID)');
      }

      return apiResponse.success({
        sessionId: sessionPayload.id,
        url: sessionPayload.checkout_url,
      });
    }

    if (provider === 'paypal') {
      const { planId } = requestData;
      if (!planId) {
        return apiResponse.badRequest('Missing planId');
      }

      const [plan] = await db
        .select({
          id: pricingPlansSchema.id,
          cardTitle: pricingPlansSchema.cardTitle,
          creemProductId: pricingPlansSchema.creemProductId,
          currency: pricingPlansSchema.currency,
          paymentType: pricingPlansSchema.paymentType,
          price: pricingPlansSchema.price,
          provider: pricingPlansSchema.provider,
        })
        .from(pricingPlansSchema)
        .where(eq(pricingPlansSchema.id, planId))
        .limit(1);

      console.log('paypal plan', plan)
      if (!plan || plan.provider !== 'paypal') {
        return apiResponse.notFound('Plan not found for PayPal');
      }

      if (isRecurringPaymentType(plan.paymentType)) {
        await assertRecurringPurchaseIsHigherTier(user.id, plan.id);
      }

      const localeHeader = req.headers.get('accept-language') ?? 'en-US';
      const locale = localeHeader.split(',')[0] || 'en-US';
      const customId = encodePayPalCustomId({
        planId: plan.id,
        userId: user.id,
      });
      const client = new PayPalClient();
      const cancelUrl = getURL(process.env.NEXT_PUBLIC_PRICING_PATH ?? 'pricing');
      const returnUrl = getURL('api/paypal/callback');

      if (isRecurringPaymentType(plan.paymentType)) {
        const paypalPlanId = plan.creemProductId?.trim();

        if (!paypalPlanId) {
          return apiResponse.badRequest('Missing PayPal plan ID');
        }

        const subscription = await client.createSubscription({
          application_context: {
            brand_name: process.env.NEXT_PUBLIC_PROJECT_NAME || siteConfig.name,
            locale,
            return_url: returnUrl,
            shipping_preference: 'NO_SHIPPING',
            user_action: 'SUBSCRIBE_NOW',
            cancel_url: cancelUrl,
          },
          custom_id: customId,
          plan_id: paypalPlanId,
        });

        const approvalUrl = getPayPalApprovalUrl(subscription.links);
        if (!approvalUrl) {
          throw new Error('PayPal subscription approval URL not found');
        }

        return apiResponse.success({
          sessionId: subscription.id,
          url: approvalUrl,
        });
      }

      if (!plan.price || !plan.currency) {
        return apiResponse.badRequest('PayPal one-time plan price is incomplete');
      }

      const amount = Number(plan.price);
      if (!Number.isFinite(amount) || amount <= 0) {
        return apiResponse.badRequest('Invalid PayPal plan price');
      }

      const order = await client.createOrder({
        application_context: {
          brand_name: process.env.NEXT_PUBLIC_PROJECT_NAME || siteConfig.name,
          locale,
          return_url: returnUrl,
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
          cancel_url: cancelUrl,
        },
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: plan.currency.toUpperCase(),
              value: amount.toFixed(2),
            },
            custom_id: customId,
            description: plan.cardTitle,
            invoice_id: plan.id,
          },
        ],
      });

      const approvalUrl = getPayPalApprovalUrl(order.links);
      if (!approvalUrl) {
        throw new Error('PayPal order approval URL not found');
      }

      return apiResponse.success({
        sessionId: order.id,
        url: approvalUrl,
      });
    }

    return apiResponse.badRequest(
      `Unsupported payment provider: ${provider}`
    );
  } catch (error) {
    console.error(
      `Error creating ${provider} checkout session:`,
      error
    );
    const errorMessage = getErrorMessage(error);
    return apiResponse.serverError(errorMessage);
  }
}
