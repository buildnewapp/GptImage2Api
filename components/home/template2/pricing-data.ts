import { DEFAULT_LOCALE } from "@/i18n/routing";
import {
  type LocalizedPricingContent,
  type PricingBenefits,
  type PricingFeature,
  pricingPlans,
} from "@/lib/db/seed/pricing-config";

import type {
  HomeTemplate2CheckoutPlan,
  HomeTemplate2CreditPack,
  HomeTemplate2Pricing,
  HomeTemplate2PricingFeature,
  HomeTemplate2PricingPlan,
} from "@/components/home/template2/types";

type PricingEnvironment = "live" | "test";
type SupportedLocale = "en" | "zh" | "ja";

type PricingConfigPlan = (typeof pricingPlans)[number];

const accentByOrder = ["foreground", "primary", "accent"] as const;
const iconByAccent = {
  accent: "rocket",
  foreground: "camera",
  primary: "crown",
} as const;

function resolvePricingEnvironment(environment?: PricingEnvironment): PricingEnvironment {
  if (environment) {
    return environment;
  }

  return process.env.PAY_ENV === "production" ? "live" : "test";
}

function resolveLocale(locale: string): SupportedLocale {
  if (locale === "zh" || locale === "ja") {
    return locale;
  }

  return DEFAULT_LOCALE as SupportedLocale;
}

function getLocalizedPlanContent(
  plan: PricingConfigPlan,
  locale: SupportedLocale,
): LocalizedPricingContent {
  const content = (plan.langJsonb ?? {}) as Record<string, LocalizedPricingContent>;
  return content[locale] ?? content[DEFAULT_LOCALE] ?? {};
}

function formatNumber(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : locale === "zh" ? "zh-CN" : "ja-JP").format(value);
}

function formatCredits(benefits: PricingBenefits | null | undefined, locale: SupportedLocale): string | undefined {
  if (!benefits) {
    return undefined;
  }

  if (typeof benefits.monthlyCredits === "number") {
    const credits = formatNumber(benefits.monthlyCredits, locale);
    if (locale === "zh") {
      return `每月 ${credits} 积分`;
    }
    if (locale === "ja") {
      return `毎月 ${credits} クレジット`;
    }
    return `${credits} credits / month`;
  }

  if (typeof benefits.oneTimeCredits === "number") {
    const credits = formatNumber(benefits.oneTimeCredits, locale);
    if (locale === "zh") {
      return `${credits} 积分`;
    }
    if (locale === "ja") {
      return `${credits} クレジット`;
    }
    return `${credits} credits`;
  }

  return undefined;
}

function formatBilled(plan: PricingConfigPlan, locale: SupportedLocale): string | undefined {
  if (!plan.price) {
    return undefined;
  }

  const amount = `${plan.currency ?? "USD"} ${plan.price}`;

  if (plan.groupSlug === "annual") {
    if (locale === "zh") {
      return `按年计费 ${amount}`;
    }
    if (locale === "ja") {
      return `年額請求 ${amount}`;
    }
    return `Billed yearly at ${amount}`;
  }

  if (plan.groupSlug === "monthly") {
    if (locale === "zh") {
      return `按月计费 ${amount}`;
    }
    if (locale === "ja") {
      return `月額請求 ${amount}`;
    }
    return `Billed monthly at ${amount}`;
  }

  return undefined;
}

function mapFeatures(features: PricingFeature[] | undefined): HomeTemplate2PricingFeature[] {
  return (features ?? [])
    .filter((feature) => feature.included)
    .map((feature) => ({
      highlight: feature.bold,
      text: feature.description,
    }));
}

function buildCheckoutPlan(plan: PricingConfigPlan): HomeTemplate2CheckoutPlan {
  return {
    buttonLink: plan.buttonLink ?? null,
    creemDiscountCode: plan.creemDiscountCode ?? null,
    creemProductId: plan.creemProductId ?? null,
    enableManualInputCoupon: plan.enableManualInputCoupon,
    isHighlighted: plan.isHighlighted,
    provider: plan.provider ?? null,
    stripeCouponId: plan.stripeCouponId ?? null,
    stripePriceId: plan.stripePriceId ?? null,
  };
}

function buildSavingsLabel(
  annualPlans: PricingConfigPlan[],
  monthlyPlans: PricingConfigPlan[],
  locale: SupportedLocale,
  fallback: string,
): string {
  const savings = annualPlans
    .map((annualPlan) => {
      const monthlyPlan = monthlyPlans.find((candidate) => candidate.cardTitle === annualPlan.cardTitle);
      const annualPrice = Number(annualPlan.price);
      const monthlyPrice = Number(monthlyPlan?.price);

      if (!monthlyPlan || !Number.isFinite(annualPrice) || !Number.isFinite(monthlyPrice) || monthlyPrice <= 0) {
        return null;
      }

      return Math.round((1 - annualPrice / (monthlyPrice * 12)) * 100);
    })
    .filter((value): value is number => typeof value === "number" && value > 0);

  if (savings.length === 0) {
    return fallback;
  }

  const highestSaving = Math.max(...savings);

  if (locale === "zh") {
    return `最高省 ${highestSaving}%`;
  }
  if (locale === "ja") {
    return `最大${highestSaving}%お得`;
  }
  return `Save up to ${highestSaving}%`;
}

function mapRecurringPlan(
  plan: PricingConfigPlan,
  locale: SupportedLocale,
  matchingMonthlyPlan?: PricingConfigPlan,
): HomeTemplate2PricingPlan {
  const localizedPlan = getLocalizedPlanContent(plan, locale);
  const matchingMonthlyLocalizedPlan = matchingMonthlyPlan
    ? getLocalizedPlanContent(matchingMonthlyPlan, locale)
    : undefined;
  const accent =
    plan.isHighlighted
      ? "primary"
      : accentByOrder[
          Math.min(Math.max((plan.displayOrder ?? 1) - 1, 0), accentByOrder.length - 1)
        ] ?? "foreground";

  return {
    accent,
    billed: formatBilled(plan, locale),
    checkoutPlan: buildCheckoutPlan(plan),
    credits: formatCredits(plan.benefitsJsonb as PricingBenefits | undefined, locale),
    cta: localizedPlan.buttonText ?? plan.buttonText ?? "Subscribe",
    description: localizedPlan.cardDescription ?? plan.cardDescription ?? undefined,
    featured: plan.isHighlighted,
    features: mapFeatures((localizedPlan.features as PricingFeature[] | undefined) ?? (plan.features as PricingFeature[] | undefined)),
    highlightText: localizedPlan.highlightText ?? plan.highlightText ?? undefined,
    icon: iconByAccent[accent],
    name: localizedPlan.cardTitle ?? plan.cardTitle,
    originalPrice:
      plan.groupSlug === "annual"
        ? matchingMonthlyLocalizedPlan?.displayPrice ?? matchingMonthlyPlan?.displayPrice ?? plan.originalPrice ?? undefined
        : plan.originalPrice ?? undefined,
    price: localizedPlan.displayPrice ?? plan.displayPrice ?? "",
    priceSuffix: localizedPlan.priceSuffix ?? plan.priceSuffix ?? undefined,
  };
}

function mapOneTimePlan(plan: PricingConfigPlan, locale: SupportedLocale): HomeTemplate2CreditPack {
  const localizedPlan = getLocalizedPlanContent(plan, locale);
  const benefits = plan.benefitsJsonb as PricingBenefits | undefined;
  const creditTitle =
    typeof benefits?.oneTimeCredits === "number"
      ? `${formatNumber(benefits.oneTimeCredits, locale)} Credits`
      : undefined;

  return {
    checkoutPlan: buildCheckoutPlan(plan),
    cta: localizedPlan.buttonText ?? plan.buttonText ?? "Buy Now",
    description: localizedPlan.cardDescription ?? plan.cardDescription ?? undefined,
    highlightText: localizedPlan.highlightText ?? plan.highlightText ?? undefined,
    price: localizedPlan.displayPrice ?? plan.displayPrice ?? "",
    title: creditTitle ?? localizedPlan.cardTitle ?? plan.cardTitle,
  };
}

export function buildHomeTemplate2PricingSection({
  baseSection,
  environment,
  locale,
}: {
  baseSection: HomeTemplate2Pricing;
  environment?: PricingEnvironment;
  locale: string;
}): HomeTemplate2Pricing {
  const pricingLocale = resolveLocale(locale);
  const pricingEnvironment = resolvePricingEnvironment(environment);
  const activePlans = pricingPlans
    .filter((plan) => plan.environment === pricingEnvironment && plan.isActive)
    .sort((left, right) => (left.displayOrder ?? 0) - (right.displayOrder ?? 0));

  const annualSourcePlans = activePlans.filter((plan) => plan.groupSlug === "annual");
  const monthlySourcePlans = activePlans.filter((plan) => plan.groupSlug === "monthly");
  const oneTimeSourcePlans = activePlans.filter((plan) => plan.groupSlug === "onetime");

  const yearlyPlans = annualSourcePlans.map((plan) =>
    mapRecurringPlan(
      plan,
      pricingLocale,
      monthlySourcePlans.find((candidate) => candidate.cardTitle === plan.cardTitle),
    ),
  );
  const monthlyPlans = monthlySourcePlans.map((plan) => mapRecurringPlan(plan, pricingLocale));
  const creditPacks = oneTimeSourcePlans.map((plan) => mapOneTimePlan(plan, pricingLocale));

  return {
    ...baseSection,
    creditPacks,
    monthlyPlans,
    plans: yearlyPlans,
    saveLabel: buildSavingsLabel(annualSourcePlans, monthlySourcePlans, pricingLocale, baseSection.saveLabel),
    yearlyPlans,
  };
}
