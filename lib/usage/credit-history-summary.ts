import type { UserBenefits } from "@/actions/usage/benefits";

export type CreditHistorySummaryKey = "total" | "subscription" | "oneTime";

export interface CreditHistorySummaryItem {
  key: CreditHistorySummaryKey;
  value: number;
}

export function buildCreditHistorySummaryItems(
  benefits: Pick<
    UserBenefits,
    | "totalAvailableCredits"
    | "subscriptionCreditsBalance"
    | "oneTimeCreditsBalance"
  >
): CreditHistorySummaryItem[] {
  return [
    {
      key: "total",
      value: benefits.totalAvailableCredits,
    },
    {
      key: "subscription",
      value: benefits.subscriptionCreditsBalance,
    },
    {
      key: "oneTime",
      value: benefits.oneTimeCreditsBalance,
    },
  ];
}
