import { calculateFirstOrderCashReward } from "@/config/referral";
import type { ReferralRewardMode } from "@/lib/referrals/types";

interface CalculateCashRewardAmountParams {
  orderAmountUsd: number;
  rewardMode: ReferralRewardMode;
  fixedUsd: number;
  percent: number;
}

interface QualifiesForFirstOrderRewardParams {
  inviteeCreatedAt: Date;
  orderPaidAt: Date;
  qualificationDays: number;
  paidOrderCountBeforeThisOrder: number;
  hasExistingCashReward: boolean;
}

export function calculateCashRewardAmount({
  orderAmountUsd,
  rewardMode,
  fixedUsd,
  percent,
}: CalculateCashRewardAmountParams): number {
  return calculateFirstOrderCashReward({
    orderAmountUsd,
    rewardMode,
    fixedUsd,
    percent,
  });
}

export function qualifiesForFirstOrderReward({
  inviteeCreatedAt,
  orderPaidAt,
  qualificationDays,
  paidOrderCountBeforeThisOrder,
  hasExistingCashReward,
}: QualifiesForFirstOrderRewardParams): boolean {
  if (hasExistingCashReward || paidOrderCountBeforeThisOrder > 0) {
    return false;
  }

  const qualificationDeadline = new Date(inviteeCreatedAt);
  qualificationDeadline.setUTCDate(
    qualificationDeadline.getUTCDate() + qualificationDays
  );

  return orderPaidAt <= qualificationDeadline;
}
