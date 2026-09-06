import {
  getPricingPlanById,
  getPricingPlanByProviderId,
  isActivePricingPlan,
} from '@/lib/pricing';
import { createStripeCheckoutSession } from '@/actions/stripe';
import { siteConfig } from '@/config/site';
import { apiResponse } from '@/lib/api-response';
import { getSession } from '@/lib/auth/server';
import { createCreemCheckoutSession } from '@/lib/creem/client';
import { getErrorMessage } from '@/lib/error-utils';
import { encodePayPalCustomId, getPayPalApprovalUrl } from '@/lib/paypal';
import { isPayPalEnabled, PayPalClient } from '@/lib/paypal/client';
import {
  getAvailableCheckoutProviders,
  hasUsableProviderId,
  hasUsablePriceAndCurrency,
  isUsdCurrency,
} from '@/lib/payments/checkout-availability';
import { signPaymentHandoffToken } from '@/lib/payments/handoff';
import { getPaymentPayUrl, getPaymentRequestHost, isMainPaymentSite } from '@/lib/payments/main-site';
import { isRecurringPaymentType } from '@/lib/payments/provider-utils';
import { assertRecurringPurchaseIsHigherTier } from '@/lib/payments/subscription-purchase';
import { createNowpaymentsInvoiceOrder } from '@/lib/nowpayments/service';
import { createSubotizCheckoutSession } from '@/lib/subotiz/client';
import { getURL } from '@/lib/url';
import { randomUUID } from 'node:crypto';

type RequestData = {
  applyCoupon?: boolean;
  provider?: string;
  stripePriceId?: string;
  creemProductId?: string;
  subotizPriceId?: string;
  planId?: string;
  couponCode?: string;
  locale?: string;
  referral?: string;
};

function getSubotizLocale(acceptLanguage: string | null): string {
  const locale = acceptLanguage?.split(',')[0]?.trim().toLowerCase();
  if (locale?.startsWith('zh')) {
    return locale.includes('tw') || locale.includes('hk') ? 'zh-TW' : 'zh-CN';
  }
  if (locale?.startsWith('ja')) {
    return 'ja-JP';
  }
  return 'en-US';
}

function getCheckoutPlan(requestData: RequestData) {
  if (requestData.planId) {
    return getPricingPlanById(requestData.planId);
  }

  if (requestData.provider === 'stripe') {
    return getPricingPlanByProviderId('stripePriceId', requestData.stripePriceId);
  }
  if (requestData.provider === 'creem') {
    return getPricingPlanByProviderId('creemProductId', requestData.creemProductId);
  }
  if (requestData.provider === 'subotiz') {
    return getPricingPlanByProviderId('subotizPriceId', requestData.subotizPriceId);
  }

  return undefined;
}

function getCheckoutCoupon(
  requestData: RequestData,
  configuredCoupon: string | null | undefined,
) {
  const requestedCoupon = requestData.couponCode?.trim();
  if (requestedCoupon) {
    return requestedCoupon;
  }

  if (!requestData.planId || requestData.applyCoupon === false) {
    return undefined;
  }

  return configuredCoupon?.trim() || undefined;
}

export async function POST(req: Request) {
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
  const nowpaymentsEnabled = Boolean(process.env.NOWPAYMENTS_API_KEY);

  if (!isMainPaymentSite()) {
    if (!provider) {
      return apiResponse.badRequest('Unsupported payment handoff provider');
    }

    const token = signPaymentHandoffToken({
      payload: {
        checkout: requestData,
        sourceHost: getPaymentRequestHost(req),
        userId: user.id,
      },
    });

    return apiResponse.success({ url: getPaymentPayUrl(token) });
  }

  try {
    const plan = getCheckoutPlan(requestData);

    if (provider === 'stripe') {
      if (!isActivePricingPlan(plan) || (plan.provider !== 'stripe' && plan.provider !== 'all')) {
        return apiResponse.notFound('Plan not found for Stripe');
      }

      const stripePriceId = plan.stripePriceId?.trim();
      if (!hasUsableProviderId(stripePriceId)) {
        return apiResponse.badRequest('Missing stripePriceId');
      }
      const validStripePriceId = stripePriceId!;
      const result = await createStripeCheckoutSession({
        userId: user.id,
        priceId: validStripePriceId,
        couponCode: getCheckoutCoupon(requestData, plan.stripeCouponId),
        referral: requestData.referral,
      });
      return apiResponse.success(result);
    }

    if (provider === 'creem') {
      if (!isActivePricingPlan(plan) || (plan.provider !== 'creem' && plan.provider !== 'all')) {
        return apiResponse.notFound('Plan not found for Creem');
      }

      const creemProductId = plan.creemProductId?.trim();
      const couponCode = getCheckoutCoupon(requestData, plan.creemDiscountCode);
      if (!hasUsableProviderId(creemProductId)) {
        return apiResponse.badRequest('Missing creemProductId');
      }
      const validCreemProductId = creemProductId!;

      if (isRecurringPaymentType(plan.paymentType)) {
        await assertRecurringPurchaseIsHigherTier(user.id, plan.id);
      }

      const sessionParams = {
        product_id: validCreemProductId,
        units: 1,
        discount_code: couponCode,
        customer: {
          // id: customerId,
          email: user.email,
        },
        success_url: getURL('payment/success?provider=creem'),
        metadata: {
          userId: user.id,
          userEmail: user.email,
          planId: plan.id,
          planName: plan.cardTitle,
          productId: plan.creemProductId,
        },
      };

      const sessionPayload = await createCreemCheckoutSession(sessionParams);

      if (!sessionPayload?.id) {
        throw new Error('Creem session creation failed (missing session ID)');
      }

      return apiResponse.success({
        sessionId: sessionPayload.id,
        url: sessionPayload.checkout_url,
      });
    }

    if (provider === 'subotiz') {
      if (!isActivePricingPlan(plan) || (plan.provider !== 'subotiz' && plan.provider !== 'all')) {
        return apiResponse.notFound('Plan not found for Subotiz');
      }

      const subotizPriceId = plan.subotizPriceId?.trim();
      if (!hasUsableProviderId(subotizPriceId)) {
        return apiResponse.badRequest('Missing subotizPriceId');
      }

      const isRecurring = isRecurringPaymentType(plan.paymentType);
      if (isRecurring) {
        await assertRecurringPurchaseIsHigherTier(user.id, plan.id);
      }

      const orderId = randomUUID();
      const metadata = {
        planId: plan.id,
        planName: plan.cardTitle,
        priceId: subotizPriceId!,
        userEmail: user.email,
        userId: user.id,
      };
      const checkout = await createSubotizCheckoutSession({
        order_id: orderId,
        line_items: [
          {
            price_id: subotizPriceId!,
            quantity: '1',
          },
        ],
        email: user.email,
        payer_id: user.id,
        return_url: getURL(`payment/success?provider=subotiz&order_id=${encodeURIComponent(orderId)}`),
        cancel_url: getURL(process.env.NEXT_PUBLIC_PRICING_PATH ?? 'pricing'),
        locale: getSubotizLocale(req.headers.get('accept-language')),
        mode: 'checkout',
        integration_method: 'hosted',
        payment_mode: isRecurring ? 'subscription' : 'onetime_payment',
        metadata,
        ...(isRecurring
          ? {
              subscription_data: { metadata },
            }
          : {}),
      });

      return apiResponse.success({
        sessionId: checkout.session_id,
        url: checkout.session_url,
      });
    }

    if (provider === 'nowpayments') {
      if (!isActivePricingPlan(plan) || plan.provider !== 'all') {
        return apiResponse.notFound('Plan not found for NOWPayments');
      }
      if (
        !nowpaymentsEnabled ||
        !hasUsablePriceAndCurrency(plan) ||
        !isUsdCurrency(plan.currency)
      ) {
        return apiResponse.badRequest('NOWPayments is not available for this plan');
      }

      if (isRecurringPaymentType(plan.paymentType)) {
        await assertRecurringPurchaseIsHigherTier(user.id, plan.id);
      }

      const result = await createNowpaymentsInvoiceOrder({
        locale: requestData.locale,
        planId: plan.id,
        user,
      });

      return apiResponse.success({
        orderNo: result.orderNo,
        sessionId: result.sessionId,
        url: result.url,
      });
    }

    if (provider === 'paypal') {
      if (!isActivePricingPlan(plan) || (plan.provider !== 'paypal' && plan.provider !== 'all')) {
        return apiResponse.notFound('Plan not found for PayPal');
      }

      if (!isPayPalEnabled) {
        return apiResponse.badRequest('PayPal is not configured');
      }

      if (isRecurringPaymentType(plan.paymentType)) {
        if (!hasUsableProviderId(plan.paypalPlanId)) {
          return apiResponse.badRequest('Missing PayPal plan ID');
        }

        await assertRecurringPurchaseIsHigherTier(user.id, plan.id);
      } else if (!hasUsablePriceAndCurrency(plan)) {
        return apiResponse.badRequest('PayPal one-time plan price is incomplete');
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
        const paypalPlanId = plan.paypalPlanId?.trim();

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

    if (provider === 'all') {
      if (!isActivePricingPlan(plan) || plan.provider !== 'all') {
        return apiResponse.notFound('Plan not found for payment selection');
      }

      const availableProviders = getAvailableCheckoutProviders(plan, {
        subotizEnabled: Boolean(
          process.env.SUBOTIZ_API_KEY && process.env.SUBOTIZ_ACCESS_NO && process.env.SUBOTIZ_MERCHANT_ID,
        ),
        nowpaymentsEnabled,
        paypalEnabled: isPayPalEnabled,
      });

      return apiResponse.success({ providers: availableProviders });
    }

    return apiResponse.badRequest(`Unsupported payment provider: ${provider}`);
  } catch (error) {
    console.error(`Error creating ${provider} checkout session:`, error);
    const errorMessage = getErrorMessage(error);
    return apiResponse.serverError(errorMessage);
  }
}
