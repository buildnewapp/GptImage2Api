export type ReferralRewardMode = "fixed" | "percentage";

export const referralConfig = {
  enabled: true,
  signupInviteCredit: 100,
  inviteAcceptanceWindowDays: 1,
  inviteCodeMinLength: 4,
  inviteCodePostCreationChangeLimit: 1,
  firstOrderQualificationDays: 30,
  cashRewardLockDays: 30,
  firstOrderRewardMode: "fixed" as ReferralRewardMode,
  firstOrderRewardFixedUsd: 5,
  firstOrderRewardPercent: 10,
} as const;

interface CalculateFirstOrderCashRewardParams {
  orderAmountUsd: number;
  rewardMode?: ReferralRewardMode;
  fixedUsd?: number;
  percent?: number;
}

export function calculateFirstOrderCashReward({
  orderAmountUsd,
  rewardMode = referralConfig.firstOrderRewardMode,
  fixedUsd = referralConfig.firstOrderRewardFixedUsd,
  percent = referralConfig.firstOrderRewardPercent,
}: CalculateFirstOrderCashRewardParams): number {
  if (rewardMode === "fixed") {
    return fixedUsd;
  }

  return Number(((orderAmountUsd * percent) / 100).toFixed(2));
}
