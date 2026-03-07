export type ReferralRewardMode = "fixed" | "percentage";
export interface ReferralRuntimeConfig {
  enabled: boolean;
  signupInviteCredit: number;
}

export const referralConfig = {
  // 是否启用邀请奖励与邀请页面展示，不影响邀请 cookie 捕获和邀请关系绑定
  enabled: false,
  // 每成功邀请 1 个新用户注册，邀请人立即获得的积分
  signupInviteCredit: 20,
  // 新用户注册后，最多允许在多少天内接受邀请绑定
  inviteAcceptanceWindowDays: 1,
  // 邀请码最少字符数
  inviteCodeMinLength: 4,
  // 用户首次设置邀请码后，还允许再修改多少次
  inviteCodePostCreationChangeLimit: 1,
  // 被邀请用户注册后，多少天内的首个已支付订单可以参与返现
  firstOrderQualificationDays: 30,
  // 首单返现锁定期天数，过期后才可申请提现
  cashRewardLockDays: 30,
  // 首单返现模式：fixed 固定金额，percentage 按订单百分比
  firstOrderRewardMode: "percentage" as ReferralRewardMode,
  // 首单返现为固定金额时的美元数
  firstOrderRewardFixedUsd: 1,
  // 首单返现为百分比时的比例，如 10 表示 10%
  firstOrderRewardPercent: 3,
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

export function shouldEnableReferralRewards(
  config: Pick<ReferralRuntimeConfig, "enabled"> = referralConfig
): boolean {
  return config.enabled;
}

export function resolveReferralSignupCreditAmount(
  config: ReferralRuntimeConfig = referralConfig
): number {
  return shouldEnableReferralRewards(config) ? config.signupInviteCredit : 0;
}
