import { DEFAULT_LOCALE } from "@/i18n/routing";

import type {
  VideoTemplateCheckoutPlan,
  VideoTemplateCreditPack,
  VideoTemplatePricing,
  VideoTemplatePricingFeature,
  VideoTemplatePricingPlan,
} from "@/components/home/video/types";

type PricingEnvironment = "live" | "test";
type VideoPricingTemplateValues = Record<string, string | number>;

export type VideoPricingDynamicCopy = {
  billing?: {
    annual?: string;
    monthly?: string;
  };
  creditPackTitle?: string;
  credits?: {
    monthly?: string;
    oneTime?: string;
  };
  pricePer100Credits?: string;
  savings?: string;
};

type PricingFeature = {
  bold?: boolean;
  description: string;
  included: boolean;
};

type LocalizedPricingContent = {
  buttonText?: string;
  cardDescription?: string;
  cardTitle?: string;
  displayPrice?: string;
  features?: PricingFeature[];
  highlightText?: string;
  originalPrice?: string;
  priceSuffix?: string;
};

type PricingBenefits = {
  monthlyCredits?: number;
  oneTimeCredits?: number;
  totalMonths?: number;
};

export type VideoPricingSourcePlan = {
  benefitsJsonb?: unknown;
  buttonLink?: string | null;
  buttonText?: string | null;
  cardDescription?: string | null;
  cardTitle: string;
  creemDiscountCode?: string | null;
  creemProductId?: string | null;
  currency?: string | null;
  displayOrder?: number | null;
  displayPrice?: string | null;
  enableManualInputCoupon?: boolean;
  environment: PricingEnvironment;
  features?: unknown;
  groupSlug?: string | null;
  highlightText?: string | null;
  id?: string | null;
  isActive: boolean;
  isHighlighted: boolean;
  langJsonb?: unknown;
  originalPrice?: string | null;
  paypalPlanId?: string | null;
  paymentType?: string | null;
  price?: string | null;
  priceSuffix?: string | null;
  provider?: string | null;
  stripeCouponId?: string | null;
  stripePriceId?: string | null;
  subotizPriceId?: string | null;
};

const accentByOrder = ["foreground", "primary", "accent"] as const;
const iconByAccent = {
  accent: "rocket",
  foreground: "camera",
  primary: "crown",
} as const;

function resolvePricingEnvironment(
  environment?: PricingEnvironment,
): PricingEnvironment {
  if (environment) {
    return environment;
  }

  return process.env.PAY_ENV === "live" ? "live" : "test";
}

const defaultDynamicCopy = {
  billing: {
    annual: "Billed yearly at {amount}",
    monthly: "Billed monthly at {amount}",
  },
  creditPackTitle: "{credits} Credits",
  credits: {
    monthly: "{credits} credits / month",
    oneTime: "{credits} credits",
  },
  pricePer100Credits: "100 credits = {amount}",
  savings: "Save up to {percent}%",
} as const;

function formatTemplate(template: string, values: VideoPricingTemplateValues) {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    values[key] === undefined ? match : String(values[key]),
  );
}

function getLocalizedPlanContent(
  plan: VideoPricingSourcePlan,
  locale: string,
): LocalizedPricingContent {
  const content = (plan.langJsonb ?? {}) as Record<
    string,
    LocalizedPricingContent
  >;
  return content[locale] ?? content[DEFAULT_LOCALE] ?? {};
}

function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale || DEFAULT_LOCALE).format(value);
}

function formatCredits(
  benefits: PricingBenefits | null | undefined,
  locale: string,
  copy: VideoPricingDynamicCopy,
): string | undefined {
  if (!benefits) {
    return undefined;
  }

  if (typeof benefits.monthlyCredits === "number") {
    const credits = formatNumber(benefits.monthlyCredits, locale);
    return formatTemplate(
      copy.credits?.monthly ?? defaultDynamicCopy.credits.monthly,
      { credits },
    );
  }

  if (typeof benefits.oneTimeCredits === "number") {
    const credits = formatNumber(benefits.oneTimeCredits, locale);
    return formatTemplate(
      copy.credits?.oneTime ?? defaultDynamicCopy.credits.oneTime,
      { credits },
    );
  }

  return undefined;
}

function formatBilled(
  plan: VideoPricingSourcePlan,
  copy: VideoPricingDynamicCopy,
): string | undefined {
  if (!plan.price) {
    return undefined;
  }

  const amount = `${plan.currency ?? "USD"} ${plan.price}`;

  if (plan.groupSlug === "annual") {
    return formatTemplate(
      copy.billing?.annual ?? defaultDynamicCopy.billing.annual,
      { amount },
    );
  }

  if (plan.groupSlug === "monthly") {
    return formatTemplate(
      copy.billing?.monthly ?? defaultDynamicCopy.billing.monthly,
      { amount },
    );
  }

  return undefined;
}

function mapFeatures(
  features: PricingFeature[] | undefined,
): VideoTemplatePricingFeature[] {
  return (features ?? [])
    .filter((feature) => feature.included)
    .map((feature) => ({
      highlight: feature.bold,
      text: feature.description,
    }));
}

function buildCheckoutPlan(
  plan: VideoPricingSourcePlan,
): VideoTemplateCheckoutPlan {
  return {
    buttonLink: plan.buttonLink ?? null,
    creemDiscountCode: plan.creemDiscountCode ?? null,
    creemProductId: plan.creemProductId ?? null,
    enableManualInputCoupon: plan.enableManualInputCoupon ?? false,
    isHighlighted: plan.isHighlighted,
    planId: plan.id ?? null,
    provider: plan.provider ?? null,
    stripeCouponId: plan.stripeCouponId ?? null,
    stripePriceId: plan.stripePriceId ?? null,
    subotizPriceId: plan.subotizPriceId ?? null,
  };
}

function buildSavingsLabel(
  annualPlans: VideoPricingSourcePlan[],
  monthlyPlans: VideoPricingSourcePlan[],
  copy: VideoPricingDynamicCopy,
  fallback: string,
): string {
  const savings = annualPlans
    .map((annualPlan) => {
      const monthlyPlan = monthlyPlans.find(
        (candidate) => candidate.cardTitle === annualPlan.cardTitle,
      );
      const annualPrice = Number(annualPlan.price);
      const monthlyPrice = Number(monthlyPlan?.price);

      if (
        !monthlyPlan ||
        !Number.isFinite(annualPrice) ||
        !Number.isFinite(monthlyPrice) ||
        monthlyPrice <= 0
      ) {
        return null;
      }

      return Math.round((1 - annualPrice / (monthlyPrice * 12)) * 100);
    })
    .filter((value): value is number => typeof value === "number" && value > 0);

  if (savings.length === 0) {
    return fallback;
  }

  const highestSaving = Math.max(...savings);

  return formatTemplate(copy.savings ?? defaultDynamicCopy.savings, {
    percent: highestSaving,
  });
}

function mapRecurringPlan(
  plan: VideoPricingSourcePlan,
  locale: string,
  copy: VideoPricingDynamicCopy,
  matchingMonthlyPlan?: VideoPricingSourcePlan,
): VideoTemplatePricingPlan {
  const localizedPlan = getLocalizedPlanContent(plan, locale);
  const benefits = plan.benefitsJsonb as PricingBenefits | undefined;
  const priceNumber = Number(plan.price);
  const totalMonths =
    typeof benefits?.totalMonths === "number" && benefits.totalMonths > 0
      ? benefits.totalMonths
      : 1;
  const pricePer100Credits =
    typeof benefits?.monthlyCredits === "number" &&
    benefits.monthlyCredits > 0 &&
    Number.isFinite(priceNumber) &&
    priceNumber > 0
      ? formatTemplate(
          copy.pricePer100Credits ?? defaultDynamicCopy.pricePer100Credits,
          {
            amount: `$${(
              (priceNumber / (benefits.monthlyCredits * totalMonths)) *
              100
            ).toFixed(2)}`,
          },
        )
      : undefined;
  const matchingMonthlyLocalizedPlan = matchingMonthlyPlan
    ? getLocalizedPlanContent(matchingMonthlyPlan, locale)
    : undefined;
  const accent = plan.isHighlighted
    ? "primary"
    : (accentByOrder[
        Math.min(
          Math.max((plan.displayOrder ?? 1) - 1, 0),
          accentByOrder.length - 1,
        )
      ] ?? "foreground");

  return {
    accent,
    billed: formatBilled(plan, copy),
    checkoutPlan: buildCheckoutPlan(plan),
    currency: plan.currency ?? undefined,
    credits: formatCredits(benefits, locale, copy),
    cta: localizedPlan.buttonText ?? plan.buttonText ?? "Subscribe",
    description:
      localizedPlan.cardDescription ?? plan.cardDescription ?? undefined,
    featured: plan.isHighlighted,
    features: mapFeatures(
      (localizedPlan.features as PricingFeature[] | undefined) ??
        (plan.features as PricingFeature[] | undefined),
    ),
    highlightText:
      localizedPlan.highlightText ?? plan.highlightText ?? undefined,
    icon: iconByAccent[accent],
    name: localizedPlan.cardTitle ?? plan.cardTitle,
    offerPrice: plan.price ?? undefined,
    originalPrice:
      plan.groupSlug === "annual"
        ? (matchingMonthlyLocalizedPlan?.displayPrice ??
          matchingMonthlyPlan?.displayPrice ??
          plan.originalPrice ??
          undefined)
        : (plan.originalPrice ?? undefined),
    price: localizedPlan.displayPrice ?? plan.displayPrice ?? "",
    pricePer100Credits,
    priceSuffix: localizedPlan.priceSuffix ?? plan.priceSuffix ?? undefined,
  };
}

function mapOneTimePlan(
  plan: VideoPricingSourcePlan,
  locale: string,
  copy: VideoPricingDynamicCopy,
): VideoTemplateCreditPack {
  const localizedPlan = getLocalizedPlanContent(plan, locale);
  const benefits = plan.benefitsJsonb as PricingBenefits | undefined;
  const creditTitle =
    typeof benefits?.oneTimeCredits === "number"
      ? formatTemplate(
          copy.creditPackTitle ?? defaultDynamicCopy.creditPackTitle,
          {
            credits: formatNumber(benefits.oneTimeCredits, locale),
          },
        )
      : undefined;

  return {
    checkoutPlan: buildCheckoutPlan(plan),
    currency: plan.currency ?? undefined,
    cta: localizedPlan.buttonText ?? plan.buttonText ?? "Buy Now",
    description:
      localizedPlan.cardDescription ?? plan.cardDescription ?? undefined,
    highlightText:
      localizedPlan.highlightText ?? plan.highlightText ?? undefined,
    offerPrice: plan.price ?? undefined,
    price: localizedPlan.displayPrice ?? plan.displayPrice ?? "",
    title: creditTitle ?? localizedPlan.cardTitle ?? plan.cardTitle,
  };
}

export function buildVideoTemplatePricingSection({
  baseSection,
  copy = defaultDynamicCopy,
  environment,
  locale,
  plans,
}: {
  baseSection: VideoTemplatePricing;
  copy?: VideoPricingDynamicCopy;
  environment?: PricingEnvironment;
  locale: string;
  plans: VideoPricingSourcePlan[];
}): VideoTemplatePricing {
  const pricingEnvironment = resolvePricingEnvironment(environment);
  const activePlans = plans
    .filter((plan) => plan.environment === pricingEnvironment && plan.isActive)
    .sort(
      (left, right) => (left.displayOrder ?? 0) - (right.displayOrder ?? 0),
    );

  const annualSourcePlans = activePlans.filter(
    (plan) => plan.groupSlug === "annual",
  );
  const monthlySourcePlans = activePlans.filter(
    (plan) => plan.groupSlug === "monthly",
  );
  const oneTimeSourcePlans = activePlans.filter(
    (plan) => plan.groupSlug === "onetime",
  );

  const yearlyPlans = annualSourcePlans.map((plan) =>
    mapRecurringPlan(
      plan,
      locale,
      copy,
      monthlySourcePlans.find(
        (candidate) => candidate.cardTitle === plan.cardTitle,
      ),
    ),
  );
  const monthlyPlans = monthlySourcePlans.map((plan) =>
    mapRecurringPlan(plan, locale, copy),
  );
  const creditPacks = oneTimeSourcePlans.map((plan) =>
    mapOneTimePlan(plan, locale, copy),
  );

  return {
    ...baseSection,
    creditPacks,
    monthlyPlans,
    plans: yearlyPlans,
    saveLabel: buildSavingsLabel(
      annualSourcePlans,
      monthlySourcePlans,
      copy,
      baseSection.saveLabel,
    ),
    yearlyPlans,
  };
}
