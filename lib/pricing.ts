import { pricingPlans } from '@/lib/db/seed/pricing-config';
import type { PublicPricingPlan } from '@/types/pricing';

export const configuredPricingPlans: PublicPricingPlan[] = pricingPlans.map((plan) => {
  if (!plan.id) {
    throw new Error(`Plan "${plan.cardTitle}" is missing required id field`);
  }

  // Match seed/database defaults so existing pricing components keep the same behavior.
  return {
    id: plan.id,
    environment: plan.environment,
    groupSlug: plan.groupSlug ?? 'default',
    cardTitle: plan.cardTitle,
    cardDescription: plan.cardDescription ?? null,
    provider: plan.provider === undefined ? 'none' : plan.provider,
    stripePriceId: plan.stripePriceId ?? null,
    stripeProductId: plan.stripeProductId ?? null,
    stripeCouponId: plan.stripeCouponId ?? null,
    creemProductId: plan.creemProductId ?? null,
    creemDiscountCode: plan.creemDiscountCode ?? null,
    subotizPriceId: plan.subotizPriceId ?? null,
    paypalProductId: plan.paypalProductId ?? null,
    paypalPlanId: plan.paypalPlanId ?? null,
    enableManualInputCoupon: plan.enableManualInputCoupon ?? false,
    paymentType: plan.paymentType ?? null,
    recurringInterval: plan.recurringInterval ?? null,
    trialPeriodDays: plan.trialPeriodDays ?? null,
    price: plan.price ?? null,
    currency: plan.currency ?? null,
    displayPrice: plan.displayPrice ?? null,
    originalPrice: plan.originalPrice ?? null,
    priceSuffix: plan.priceSuffix ?? null,
    features: plan.features ?? [],
    isHighlighted: plan.isHighlighted ?? false,
    highlightText: plan.highlightText ?? null,
    buttonText: plan.buttonText ?? null,
    buttonLink: plan.buttonLink ?? null,
    displayOrder: plan.displayOrder ?? 0,
    isActive: plan.isActive ?? true,
    langJsonb: plan.langJsonb ?? {},
    benefitsJsonb: plan.benefitsJsonb ?? {},
  };
});

// Historical orders, renewals and refunds must still resolve inactive plans.
export function getPricingPlanById(id: string | null | undefined) {
  return id ? configuredPricingPlans.find((plan) => plan.id === id) : undefined;
}

export function getPricingPlanByProviderId(
  field: 'stripePriceId' | 'creemProductId' | 'paypalPlanId' | 'subotizPriceId',
  id: string | null | undefined,
) {
  return id ? configuredPricingPlans.find((plan) => plan[field] === id) : undefined;
}

export function isActivePricingPlan(
  plan: PublicPricingPlan | null | undefined,
): plan is PublicPricingPlan {
  const environment = process.env.PAY_ENV === 'live' ? 'live' : 'test';
  return Boolean(plan && plan.isActive && plan.environment === environment);
}
