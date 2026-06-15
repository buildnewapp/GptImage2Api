export type ReferralRewardMode = "fixed" | "percentage";

export interface FreeCreditCountryPolicy {
  limited: readonly string[];
  blocked: readonly string[];
}

export interface ReferralRuntimeConfig {
  enabled: boolean;
  signupInviteCredit: number;
  signupInviteDailyRewardLimit: number;
  freeCreditCountryPolicy: FreeCreditCountryPolicy;
}

export const referralConfig = {
  // 是否启用邀请奖励与邀请页面展示，不影响邀请 cookie 捕获和邀请关系绑定
  enabled: true,
  // 每成功邀请 1 个新用户注册，邀请人立即获得的积分
  signupInviteCredit: 10,
  // 每个邀请人每天最多多少个新注册用户可以获得注册邀请积分
  signupInviteDailyRewardLimit: 3,
  // 免费积分地区策略：limited 减半，blocked 为 0，其他国家默认全额
  // 开启 cf 安全： domain -> Security -> Settings -> Bot fight mode : On
  freeCreditCountryPolicy: {
    limited: ["PK", "BD", "NG", "ID", "VN", "PH", "BR"],
    blocked: ["IN"],
  },
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

export function shouldEnableReferralRewards(
  config: Pick<ReferralRuntimeConfig, "enabled"> = referralConfig
): boolean {
  return config.enabled;
}

function normalizeCountryCode(countryCode: string | null | undefined) {
  const normalized = countryCode?.trim().toUpperCase();
  return normalized && /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

export function resolveFreeCreditAmountByCountry(
  amount: number,
  countryCode: string | null | undefined,
  policy: FreeCreditCountryPolicy = referralConfig.freeCreditCountryPolicy
): number {
  const normalizedAmount = Math.max(0, Math.trunc(amount));
  const normalizedCountry = normalizeCountryCode(countryCode);

  if (!normalizedCountry) {
    return normalizedAmount;
  }

  if (policy.blocked.includes(normalizedCountry)) {
    return 0;
  }

  if (policy.limited.includes(normalizedCountry)) {
    return Math.floor(normalizedAmount / 2);
  }

  return normalizedAmount;
}

export function resolveReferralSignupCreditAmount(
  config: ReferralRuntimeConfig = referralConfig,
  countryCode?: string | null,
  countryPolicy: FreeCreditCountryPolicy = config.freeCreditCountryPolicy
): number {
  if (!shouldEnableReferralRewards(config)) {
    return 0;
  }

  return resolveFreeCreditAmountByCountry(
    config.signupInviteCredit,
    countryCode,
    countryPolicy
  );
}
