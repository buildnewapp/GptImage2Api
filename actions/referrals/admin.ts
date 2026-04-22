"use server";

import { actionResponse, type ActionResult } from "@/lib/action-response";
import { isAdmin } from "@/lib/auth/server";
import { getDb } from "@/lib/db";
import {
  referralInvites as referralInvitesSchema,
  referralRewards as referralRewardsSchema,
  referralWithdrawRequests as referralWithdrawRequestsSchema,
  user as userSchema,
} from "@/lib/db/schema";
import { getErrorMessage } from "@/lib/error-utils";
import {
  DEFAULT_ADMIN_LIST_PAGE_SIZE,
  normalizeAdminListQuery,
  REFERRAL_ADMIN_INVITE_STATUSES,
  REFERRAL_ADMIN_REWARD_STATUSES,
  REFERRAL_ADMIN_REWARD_TYPES,
  REFERRAL_ADMIN_WITHDRAW_STATUSES,
  toAdminListOffset,
  type ReferralAdminListQueryInput,
} from "@/lib/referrals/admin-lists";
import { processReferralWithdrawalRequestById } from "@/lib/referrals/withdrawals";
import { alias } from "drizzle-orm/pg-core";
import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";

const inviterUserSchema = alias(userSchema, "referral_inviter_user");
const inviteeUserSchema = alias(userSchema, "referral_invitee_user");
const requesterUserSchema = alias(userSchema, "referral_requester_user");

export interface ReferralAdminSummaryData {
  invitedCount: number;
  signupCreditsEarned: number;
  lockedCashUsd: number;
  claimableCashUsd: number;
  pendingWithdrawCashUsd: number;
  paidCashUsd: number;
}

export interface ReferralAdminInviteRow {
  id: string;
  inviterEmail: string;
  inviteeEmail: string;
  inviteCode: string | null;
  status: string;
  registeredAt: string;
  qualifiedAt: string | null;
}

export interface ReferralAdminRewardRow {
  id: string;
  inviterEmail: string;
  inviteeEmail: string;
  rewardType: string;
  status: string;
  creditAmount: number | null;
  cashAmountUsd: number | null;
  availableAt: string | null;
  createdAt: string;
}

export interface ReferralAdminWithdrawalRow {
  id: string;
  requesterEmail: string;
  amountUsd: number;
  status: string;
  requestedAt: string;
  processedAt: string | null;
  notes: string | null;
}

export interface ReferralAdminListResult<T> {
  rows: T[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
}

async function requireAdminAccess<T>(): Promise<ActionResult<T> | null> {
  if (!(await isAdmin())) {
    return actionResponse.forbidden<T>("Admin privileges required.");
  }

  return null;
}

function toNumericValue(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return 0;
}

function toAdminListPage<T>(
  rows: T[],
  totalCount: number,
  pageIndex: number,
  pageSize: number
): ReferralAdminListResult<T> {
  return {
    rows,
    totalCount,
    pageIndex,
    pageSize,
  };
}

function getInviteStatusFilter(status: string) {
  return REFERRAL_ADMIN_INVITE_STATUSES.includes(
    status as (typeof REFERRAL_ADMIN_INVITE_STATUSES)[number]
  )
    ? (status as (typeof REFERRAL_ADMIN_INVITE_STATUSES)[number])
    : "";
}

function getRewardStatusFilter(status: string) {
  return REFERRAL_ADMIN_REWARD_STATUSES.includes(
    status as (typeof REFERRAL_ADMIN_REWARD_STATUSES)[number]
  )
    ? (status as (typeof REFERRAL_ADMIN_REWARD_STATUSES)[number])
    : "";
}

function getRewardTypeFilter(rewardType: string) {
  return REFERRAL_ADMIN_REWARD_TYPES.includes(
    rewardType as (typeof REFERRAL_ADMIN_REWARD_TYPES)[number]
  )
    ? (rewardType as (typeof REFERRAL_ADMIN_REWARD_TYPES)[number])
    : "";
}

function getWithdrawStatusFilter(status: string) {
  return REFERRAL_ADMIN_WITHDRAW_STATUSES.includes(
    status as (typeof REFERRAL_ADMIN_WITHDRAW_STATUSES)[number]
  )
    ? (status as (typeof REFERRAL_ADMIN_WITHDRAW_STATUSES)[number])
    : "";
}

export async function getReferralAdminOverview(): Promise<
  ActionResult<ReferralAdminSummaryData>
> {
  const accessError = await requireAdminAccess<ReferralAdminSummaryData>();
  if (accessError) {
    return accessError;
  }

  const db = getDb();

  try {
    const [inviteCountResult, rewardSummaryResult] = await Promise.all([
      db.select({ value: count() }).from(referralInvitesSchema),
      db
        .select({
          signupCreditsEarned: sql<number>`coalesce(sum(case when ${referralRewardsSchema.rewardType} = 'signup_credit' then ${referralRewardsSchema.creditAmount} else 0 end), 0)::int`,
          lockedCashUsd: sql<number>`coalesce(sum(case when ${referralRewardsSchema.status} = 'locked' then ${referralRewardsSchema.cashAmountUsd} else 0 end), 0)::float8`,
          claimableCashUsd: sql<number>`coalesce(sum(case when ${referralRewardsSchema.status} = 'claimable' then ${referralRewardsSchema.cashAmountUsd} else 0 end), 0)::float8`,
          pendingWithdrawCashUsd: sql<number>`coalesce(sum(case when ${referralRewardsSchema.status} = 'pending_withdraw' then ${referralRewardsSchema.cashAmountUsd} else 0 end), 0)::float8`,
          paidCashUsd: sql<number>`coalesce(sum(case when ${referralRewardsSchema.status} = 'paid' then ${referralRewardsSchema.cashAmountUsd} else 0 end), 0)::float8`,
        })
        .from(referralRewardsSchema),
    ]);

    const summaryRow = rewardSummaryResult[0];

    return actionResponse.success({
      invitedCount: inviteCountResult[0]?.value ?? 0,
      signupCreditsEarned: toNumericValue(summaryRow?.signupCreditsEarned),
      lockedCashUsd: toNumericValue(summaryRow?.lockedCashUsd),
      claimableCashUsd: toNumericValue(summaryRow?.claimableCashUsd),
      pendingWithdrawCashUsd: toNumericValue(summaryRow?.pendingWithdrawCashUsd),
      paidCashUsd: toNumericValue(summaryRow?.paidCashUsd),
    });
  } catch (error) {
    console.error("Error loading referral admin overview", error);
    return actionResponse.error(getErrorMessage(error));
  }
}

export async function getReferralAdminInvites(
  query: ReferralAdminListQueryInput = {}
): Promise<ActionResult<ReferralAdminListResult<ReferralAdminInviteRow>>> {
  const accessError = await requireAdminAccess<
    ReferralAdminListResult<ReferralAdminInviteRow>
  >();
  if (accessError) {
    return accessError;
  }

  const normalized = normalizeAdminListQuery(query);
  const status = getInviteStatusFilter(normalized.status);
  const conditions: SQL[] = [];

  if (normalized.query) {
    const searchValue = `%${normalized.query}%`;
    conditions.push(
      or(
        ilike(inviterUserSchema.email, searchValue),
        ilike(inviteeUserSchema.email, searchValue),
        ilike(referralInvitesSchema.inviteCodeSnapshot, searchValue)
      )!
    );
  }

  if (status) {
    conditions.push(eq(referralInvitesSchema.status, status));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const db = getDb();

  try {
    const [rows, totalCountResult] = await Promise.all([
      db
        .select({
          id: referralInvitesSchema.id,
          inviterEmail: inviterUserSchema.email,
          inviteeEmail: inviteeUserSchema.email,
          inviteCode: referralInvitesSchema.inviteCodeSnapshot,
          status: referralInvitesSchema.status,
          registeredAt: referralInvitesSchema.registeredAt,
          qualifiedAt: referralInvitesSchema.qualifiedAt,
        })
        .from(referralInvitesSchema)
        .innerJoin(
          inviterUserSchema,
          eq(referralInvitesSchema.inviterUserId, inviterUserSchema.id)
        )
        .innerJoin(
          inviteeUserSchema,
          eq(referralInvitesSchema.inviteeUserId, inviteeUserSchema.id)
        )
        .where(whereClause)
        .orderBy(desc(referralInvitesSchema.registeredAt))
        .offset(toAdminListOffset(normalized.pageIndex, normalized.pageSize))
        .limit(normalized.pageSize),
      db
        .select({ value: count() })
        .from(referralInvitesSchema)
        .innerJoin(
          inviterUserSchema,
          eq(referralInvitesSchema.inviterUserId, inviterUserSchema.id)
        )
        .innerJoin(
          inviteeUserSchema,
          eq(referralInvitesSchema.inviteeUserId, inviteeUserSchema.id)
        )
        .where(whereClause),
    ]);

    return actionResponse.success(
      toAdminListPage(
        rows.map((row) => ({
          id: row.id,
          inviterEmail: row.inviterEmail ?? "-",
          inviteeEmail: row.inviteeEmail ?? "-",
          inviteCode: row.inviteCode,
          status: row.status,
          registeredAt: row.registeredAt.toISOString(),
          qualifiedAt: row.qualifiedAt?.toISOString() ?? null,
        })),
        totalCountResult[0]?.value ?? 0,
        normalized.pageIndex,
        normalized.pageSize
      )
    );
  } catch (error) {
    console.error("Error loading referral admin invites", error);
    return actionResponse.error(getErrorMessage(error));
  }
}

export async function getReferralAdminRewards(
  query: ReferralAdminListQueryInput = {}
): Promise<ActionResult<ReferralAdminListResult<ReferralAdminRewardRow>>> {
  const accessError = await requireAdminAccess<
    ReferralAdminListResult<ReferralAdminRewardRow>
  >();
  if (accessError) {
    return accessError;
  }

  const normalized = normalizeAdminListQuery(query);
  const status = getRewardStatusFilter(normalized.status);
  const rewardType = getRewardTypeFilter(normalized.rewardType);
  const conditions: SQL[] = [];

  if (normalized.query) {
    const searchValue = `%${normalized.query}%`;
    conditions.push(
      or(
        ilike(inviterUserSchema.email, searchValue),
        ilike(inviteeUserSchema.email, searchValue)
      )!
    );
  }

  if (status) {
    conditions.push(eq(referralRewardsSchema.status, status));
  }

  if (rewardType) {
    conditions.push(eq(referralRewardsSchema.rewardType, rewardType));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const db = getDb();

  try {
    const [rows, totalCountResult] = await Promise.all([
      db
        .select({
          id: referralRewardsSchema.id,
          inviterEmail: inviterUserSchema.email,
          inviteeEmail: inviteeUserSchema.email,
          rewardType: referralRewardsSchema.rewardType,
          status: referralRewardsSchema.status,
          creditAmount: referralRewardsSchema.creditAmount,
          cashAmountUsd: referralRewardsSchema.cashAmountUsd,
          availableAt: referralRewardsSchema.availableAt,
          createdAt: referralRewardsSchema.createdAt,
        })
        .from(referralRewardsSchema)
        .innerJoin(
          inviterUserSchema,
          eq(referralRewardsSchema.inviterUserId, inviterUserSchema.id)
        )
        .innerJoin(
          inviteeUserSchema,
          eq(referralRewardsSchema.inviteeUserId, inviteeUserSchema.id)
        )
        .where(whereClause)
        .orderBy(desc(referralRewardsSchema.createdAt))
        .offset(toAdminListOffset(normalized.pageIndex, normalized.pageSize))
        .limit(normalized.pageSize),
      db
        .select({ value: count() })
        .from(referralRewardsSchema)
        .innerJoin(
          inviterUserSchema,
          eq(referralRewardsSchema.inviterUserId, inviterUserSchema.id)
        )
        .innerJoin(
          inviteeUserSchema,
          eq(referralRewardsSchema.inviteeUserId, inviteeUserSchema.id)
        )
        .where(whereClause),
    ]);

    return actionResponse.success(
      toAdminListPage(
        rows.map((row) => ({
          id: row.id,
          inviterEmail: row.inviterEmail ?? "-",
          inviteeEmail: row.inviteeEmail ?? "-",
          rewardType: row.rewardType,
          status: row.status,
          creditAmount: row.creditAmount,
          cashAmountUsd:
            row.cashAmountUsd === null ? null : Number(row.cashAmountUsd),
          availableAt: row.availableAt?.toISOString() ?? null,
          createdAt: row.createdAt.toISOString(),
        })),
        totalCountResult[0]?.value ?? 0,
        normalized.pageIndex,
        normalized.pageSize
      )
    );
  } catch (error) {
    console.error("Error loading referral admin rewards", error);
    return actionResponse.error(getErrorMessage(error));
  }
}

export async function getReferralAdminWithdrawals(
  query: ReferralAdminListQueryInput = {}
): Promise<ActionResult<ReferralAdminListResult<ReferralAdminWithdrawalRow>>> {
  const accessError = await requireAdminAccess<
    ReferralAdminListResult<ReferralAdminWithdrawalRow>
  >();
  if (accessError) {
    return accessError;
  }

  const normalized = normalizeAdminListQuery(query);
  const status = getWithdrawStatusFilter(normalized.status);
  const conditions: SQL[] = [];

  if (normalized.query) {
    conditions.push(ilike(requesterUserSchema.email, `%${normalized.query}%`));
  }

  if (status) {
    conditions.push(eq(referralWithdrawRequestsSchema.status, status));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const db = getDb();

  try {
    const [rows, totalCountResult] = await Promise.all([
      db
        .select({
          id: referralWithdrawRequestsSchema.id,
          requesterEmail: requesterUserSchema.email,
          amountUsd: referralWithdrawRequestsSchema.amountUsd,
          status: referralWithdrawRequestsSchema.status,
          requestedAt: referralWithdrawRequestsSchema.requestedAt,
          processedAt: referralWithdrawRequestsSchema.processedAt,
          notes: referralWithdrawRequestsSchema.notes,
        })
        .from(referralWithdrawRequestsSchema)
        .innerJoin(
          requesterUserSchema,
          eq(referralWithdrawRequestsSchema.userId, requesterUserSchema.id)
        )
        .where(whereClause)
        .orderBy(desc(referralWithdrawRequestsSchema.requestedAt))
        .offset(toAdminListOffset(normalized.pageIndex, normalized.pageSize))
        .limit(normalized.pageSize),
      db
        .select({ value: count() })
        .from(referralWithdrawRequestsSchema)
        .innerJoin(
          requesterUserSchema,
          eq(referralWithdrawRequestsSchema.userId, requesterUserSchema.id)
        )
        .where(whereClause),
    ]);

    return actionResponse.success(
      toAdminListPage(
        rows.map((row) => ({
          id: row.id,
          requesterEmail: row.requesterEmail ?? "-",
          amountUsd: Number(row.amountUsd),
          status: row.status,
          requestedAt: row.requestedAt.toISOString(),
          processedAt: row.processedAt?.toISOString() ?? null,
          notes: row.notes,
        })),
        totalCountResult[0]?.value ?? 0,
        normalized.pageIndex,
        normalized.pageSize
      )
    );
  } catch (error) {
    console.error("Error loading referral admin withdrawals", error);
    return actionResponse.error(getErrorMessage(error));
  }
}

export async function markReferralWithdrawalPaidAction(
  requestId: string
): Promise<ActionResult<{ status: string }>> {
  const accessError = await requireAdminAccess<{ status: string }>();
  if (accessError) {
    return accessError;
  }

  try {
    const result = await processReferralWithdrawalRequestById(requestId, "paid");
    if (result.status === "not_found") {
      return actionResponse.notFound("Withdrawal request not found.");
    }
    if (result.status === "already_processed") {
      return actionResponse.error("Withdrawal request has already been processed.");
    }
    return actionResponse.success({ status: result.status });
  } catch (error) {
    console.error("Error marking referral withdrawal as paid", error);
    return actionResponse.error(getErrorMessage(error));
  }
}

export async function rejectReferralWithdrawalAction(
  requestId: string
): Promise<ActionResult<{ status: string }>> {
  const accessError = await requireAdminAccess<{ status: string }>();
  if (accessError) {
    return accessError;
  }

  try {
    const result = await processReferralWithdrawalRequestById(requestId, "rejected");
    if (result.status === "not_found") {
      return actionResponse.notFound("Withdrawal request not found.");
    }
    if (result.status === "already_processed") {
      return actionResponse.error("Withdrawal request has already been processed.");
    }
    return actionResponse.success({ status: result.status });
  } catch (error) {
    console.error("Error rejecting referral withdrawal", error);
    return actionResponse.error(getErrorMessage(error));
  }
}
