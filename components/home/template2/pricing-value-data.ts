import { DEFAULT_LOCALE } from "@/i18n/routing";
import {
  type LocalizedPricingContent,
  type PricingBenefits,
  pricingPlans,
} from "@/lib/db/seed/pricing-config";

type PricingEnvironment = "live" | "test";
type SupportedLocale = "en" | "zh" | "ja";
type SupportedGroupSlug = "annual" | "monthly" | "onetime";
type PricingConfigPlan = (typeof pricingPlans)[number];
type SupportedPricingConfigPlan = PricingConfigPlan & { groupSlug: SupportedGroupSlug };
const groupOrder: Record<SupportedGroupSlug, number> = {
  annual: 0,
  monthly: 1,
  onetime: 2,
};

export interface PricingValueRow {
  credits: number;
  creditsPerDollar: string;
  dollarsPerCredit: string;
  plan: string;
  price: string;
  purchaseNote: string;
}

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

function isSupportedGroupSlug(value: string | null | undefined): value is SupportedGroupSlug {
  return value === "annual" || value === "monthly" || value === "onetime";
}

function isSupportedPricingPlan(plan: PricingConfigPlan): plan is SupportedPricingConfigPlan {
  return isSupportedGroupSlug(plan.groupSlug);
}

function buildPlanLabel(plan: PricingConfigPlan, locale: SupportedLocale): string {
  const localizedPlan = getLocalizedPlanContent(plan, locale);
  const planTitle = localizedPlan.cardTitle ?? plan.cardTitle ?? "";

  if (plan.groupSlug === "annual") {
    if (locale === "zh") {
      return `年付 ${planTitle}`;
    }
    if (locale === "ja") {
      return `年額 ${planTitle}`;
    }
    return `Annual ${planTitle}`;
  }

  if (plan.groupSlug === "monthly") {
    if (locale === "zh") {
      return `月付 ${planTitle}`;
    }
    if (locale === "ja") {
      return `月額 ${planTitle}`;
    }
    return `Monthly ${planTitle}`;
  }

  return planTitle;
}

function getPlanCredits(benefits: PricingBenefits | null | undefined): number | null {
  if (!benefits) {
    return null;
  }

  if (typeof benefits.oneTimeCredits === "number" && benefits.oneTimeCredits > 0) {
    return benefits.oneTimeCredits;
  }

  if (typeof benefits.monthlyCredits === "number" && benefits.monthlyCredits > 0) {
    const totalMonths = typeof benefits.totalMonths === "number" && benefits.totalMonths > 0
      ? benefits.totalMonths
      : 1;
    return benefits.monthlyCredits * totalMonths;
  }

  return null;
}

function getPurchaseNote(groupSlug: SupportedGroupSlug, locale: SupportedLocale): string {
  if (groupSlug === "onetime") {
    if (locale === "zh") {
      return "可重复购买";
    }
    if (locale === "ja") {
      return "繰り返し購入可";
    }
    return "Repeat purchase";
  }

  if (locale === "zh") {
    return "仅可购买一次";
  }
  if (locale === "ja") {
    return "1回のみ購入可";
  }
  return "Purchase once";
}

export function buildPricingValueRows({
  environment,
  locale,
}: {
  environment?: PricingEnvironment;
  locale: string;
}): PricingValueRow[] {
  const pricingEnvironment = resolvePricingEnvironment(environment);
  const pricingLocale = resolveLocale(locale);

  const supportedPlans = pricingPlans
    .filter((plan) => plan.environment === pricingEnvironment && plan.isActive)
    .filter(isSupportedPricingPlan)
    .sort((left, right) => {
      const leftOrder = groupOrder[left.groupSlug];
      const rightOrder = groupOrder[right.groupSlug];

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return (left.displayOrder ?? 0) - (right.displayOrder ?? 0);
    });

  return supportedPlans
    .map((plan) => {
      const credits = getPlanCredits(plan.benefitsJsonb as PricingBenefits | undefined);
      const priceNumber = Number(plan.price);

      if (!credits || !Number.isFinite(priceNumber) || priceNumber <= 0) {
        return null;
      }

      return {
        credits,
        creditsPerDollar: (credits / priceNumber).toFixed(4),
        dollarsPerCredit: (priceNumber / credits).toFixed(6),
        plan: buildPlanLabel(plan, pricingLocale),
        price: `$${priceNumber.toFixed(2)}`,
        purchaseNote: getPurchaseNote(plan.groupSlug, pricingLocale),
      } satisfies PricingValueRow;
    })
    .filter((row): row is PricingValueRow => row !== null);
}
