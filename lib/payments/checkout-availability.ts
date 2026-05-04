import {
  isOneTimePaymentType,
  isRecurringPaymentType,
} from "@/lib/payments/provider-utils";

export type CheckoutProvider = "stripe" | "paypal" | "creem" | "nowpayments";

export type CheckoutAvailabilityPlan = {
  creemProductId?: string | null;
  currency?: string | null;
  paypalPlanId?: string | null;
  paymentType?: string | null;
  price?: string | number | null;
  provider?: string | null;
  stripePriceId?: string | null;
};

export type CheckoutAvailabilityEnv = {
  nowpaymentsEnabled?: boolean;
  paypalEnabled?: boolean;
};

const TODO_VALUE_PREFIX = "TODO_";

export function hasUsableProviderId(value: string | null | undefined): boolean {
  const normalized = value?.trim();
  return Boolean(normalized && !normalized.startsWith(TODO_VALUE_PREFIX));
}

export function hasUsablePriceAndCurrency(
  plan: Pick<CheckoutAvailabilityPlan, "currency" | "price">,
): boolean {
  const price = Number(plan.price);
  return Number.isFinite(price) && price > 0 && Boolean(plan.currency?.trim());
}

export function isUsdCurrency(currency: string | null | undefined): boolean {
  return currency?.trim().toUpperCase() === "USD";
}

export function getAvailableCheckoutProviders(
  plan: CheckoutAvailabilityPlan,
  env: CheckoutAvailabilityEnv = {},
): CheckoutProvider[] {
  if (plan.provider && plan.provider !== "all") {
    return [];
  }

  const providers: CheckoutProvider[] = [];

  if (hasUsableProviderId(plan.creemProductId)) {
    providers.push("creem");
  }

  if (env.paypalEnabled) {
    if (
      isRecurringPaymentType(plan.paymentType) &&
      hasUsableProviderId(plan.paypalPlanId)
    ) {
      providers.push("paypal");
    } else if (
      isOneTimePaymentType(plan.paymentType) &&
      hasUsablePriceAndCurrency(plan)
    ) {
      providers.push("paypal");
    }
  }

  if (
    env.nowpaymentsEnabled &&
    hasUsablePriceAndCurrency(plan) &&
    isUsdCurrency(plan.currency)
  ) {
    providers.push("nowpayments");
  }

  if (hasUsableProviderId(plan.stripePriceId)) {
    providers.push("stripe");
  }

  return providers;
}
