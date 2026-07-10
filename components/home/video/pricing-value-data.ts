import { DEFAULT_LOCALE } from "@/i18n/routing";
import type { VideoPricingSourcePlan } from "@/components/home/video/pricing-data";

type PricingEnvironment = "live" | "test";
type SupportedGroupSlug = "annual" | "monthly" | "onetime";
type SupportedPricingPlan = VideoPricingSourcePlan & { groupSlug: SupportedGroupSlug };
type LocalizedPricingContent = {
  cardTitle?: string;
};
export type PricingValueCopy = {
  planLabels?: {
    annual?: string;
    monthly?: string;
  };
  purchaseNotes?: {
    onetime?: string;
    recurring?: string;
  };
};
type PricingBenefits = {
  monthlyCredits?: number;
  oneTimeCredits?: number;
  totalMonths?: number;
};
const groupOrder: Record<SupportedGroupSlug, number> = {
  annual: 0,
  monthly: 1,
  onetime: 2,
};
const defaultCopy = {
  planLabels: {
    annual: "Annual {planTitle}",
    monthly: "Monthly {planTitle}",
  },
  purchaseNotes: {
    onetime: "Repeat purchase",
    recurring: "Purchase once",
  },
} as const;

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

  return process.env.PAY_ENV === "live" ? "live" : "test";
}

function formatTemplate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    values[key] === undefined ? match : String(values[key]),
  );
}

function getLocalizedPlanContent(
  plan: VideoPricingSourcePlan,
  locale: string,
): LocalizedPricingContent {
  const content = (plan.langJsonb ?? {}) as Record<string, LocalizedPricingContent>;
  return content[locale] ?? content[DEFAULT_LOCALE] ?? {};
}

function isSupportedGroupSlug(value: string | null | undefined): value is SupportedGroupSlug {
  return value === "annual" || value === "monthly" || value === "onetime";
}

function isSupportedPricingPlan(plan: VideoPricingSourcePlan): plan is SupportedPricingPlan {
  return isSupportedGroupSlug(plan.groupSlug);
}

function buildPlanLabel(
  plan: VideoPricingSourcePlan,
  locale: string,
  copy: PricingValueCopy,
): string {
  const localizedPlan = getLocalizedPlanContent(plan, locale);
  const planTitle = localizedPlan.cardTitle ?? plan.cardTitle ?? "";

  if (plan.groupSlug === "annual") {
    return formatTemplate(copy.planLabels?.annual ?? defaultCopy.planLabels.annual, {
      planTitle,
    });
  }

  if (plan.groupSlug === "monthly") {
    return formatTemplate(copy.planLabels?.monthly ?? defaultCopy.planLabels.monthly, {
      planTitle,
    });
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

function getPurchaseNote(
  groupSlug: SupportedGroupSlug,
  copy: PricingValueCopy,
): string {
  if (groupSlug === "onetime") {
    return copy.purchaseNotes?.onetime ?? defaultCopy.purchaseNotes.onetime;
  }

  return copy.purchaseNotes?.recurring ?? defaultCopy.purchaseNotes.recurring;
}

export function buildPricingValueRows({
  copy = defaultCopy,
  environment,
  locale,
  plans,
}: {
  copy?: PricingValueCopy;
  environment?: PricingEnvironment;
  locale: string;
  plans: VideoPricingSourcePlan[];
}): PricingValueRow[] {
  const pricingEnvironment = resolvePricingEnvironment(environment);

  const supportedPlans = plans
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
        plan: buildPlanLabel(plan, locale, copy),
        price: `$${priceNumber.toFixed(2)}`,
        purchaseNote: getPurchaseNote(plan.groupSlug, copy),
      } satisfies PricingValueRow;
    })
    .filter((row): row is PricingValueRow => row !== null);
}
