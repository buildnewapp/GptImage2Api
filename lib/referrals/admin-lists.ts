const MIN_ADMIN_LIST_PAGE_SIZE = 20;
const MAX_ADMIN_LIST_PAGE_SIZE = 100;

export const DEFAULT_ADMIN_LIST_PAGE_SIZE = MIN_ADMIN_LIST_PAGE_SIZE;
export const REFERRAL_ADMIN_PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
export const REFERRAL_ADMIN_INVITE_STATUSES = [
  "registered",
  "qualified_first_order",
  "expired",
  "rewarded",
] as const;
export const REFERRAL_ADMIN_REWARD_TYPES = [
  "signup_credit",
  "first_order_cash",
] as const;
export const REFERRAL_ADMIN_REWARD_STATUSES = [
  "granted",
  "locked",
  "claimable",
  "pending_withdraw",
  "paid",
  "revoked",
  "rejected",
] as const;
export const REFERRAL_ADMIN_WITHDRAW_STATUSES = [
  "pending",
  "approved",
  "paid",
  "rejected",
] as const;

export interface ReferralAdminListQueryInput {
  pageIndex?: number;
  pageSize?: number;
  query?: string;
  status?: string;
  rewardType?: string;
}

export interface ReferralAdminListQuery {
  pageIndex: number;
  pageSize: number;
  query: string;
  status: string;
  rewardType: string;
}

export function clampAdminListPageSize(pageSize?: number): number {
  if (!pageSize || Number.isNaN(pageSize)) {
    return DEFAULT_ADMIN_LIST_PAGE_SIZE;
  }

  return Math.min(
    MAX_ADMIN_LIST_PAGE_SIZE,
    Math.max(MIN_ADMIN_LIST_PAGE_SIZE, Math.trunc(pageSize))
  );
}

export function toAdminListOffset(pageIndex: number, pageSize: number): number {
  return Math.max(0, Math.trunc(pageIndex)) * clampAdminListPageSize(pageSize);
}

export function normalizeAdminListQuery(
  input: ReferralAdminListQueryInput
): ReferralAdminListQuery {
  return {
    pageIndex: Math.max(0, Math.trunc(input.pageIndex ?? 0)),
    pageSize: clampAdminListPageSize(input.pageSize),
    query: input.query?.trim() ?? "",
    status: input.status?.trim() ?? "",
    rewardType: input.rewardType?.trim() ?? "",
  };
}
