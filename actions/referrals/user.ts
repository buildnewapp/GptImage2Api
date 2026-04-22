"use server";

import { actionResponse, type ActionResult } from "@/lib/action-response";
import { getSession } from "@/lib/auth/server";
import { getDb } from "@/lib/db";
import {
  referralInvites as referralInvitesSchema,
  referralRewards as referralRewardsSchema,
  referralWithdrawRequests as referralWithdrawRequestsSchema,
  user as userSchema,
} from "@/lib/db/schema";
import { getErrorMessage } from "@/lib/error-utils";
import {
  acceptConfiguredReferralInvite,
  type ReferralBindingStatus,
} from "@/lib/referrals/register";
import {
  saveConfiguredReferralInviteCode,
} from "@/lib/referrals/manage-invite-code";
import {
  createReferralWithdrawalRequest,
  unlockReferralRewardsForUser,
} from "@/lib/referrals/withdrawals";
import { referralConfig } from "@/config/referral";
import { desc, eq } from "drizzle-orm";

export interface ReferralDashboardData {
  inviteCode: string | null;
  inviteLink: string | null;
  inviteCodeChangeCount: number;
  remainingInviteCodeChanges: number;
  summary: {
    invitedCount: number;
    signupCreditsEarned: number;
    lockedCashUsd: number;
    claimableCashUsd: number;
    paidCashUsd: number;
    pendingWithdrawCashUsd: number;
  };
  invites: Array<{
    id: string;
    inviteeEmail: string;
    inviteeName: string | null;
    status: string;
    registeredAt: string;
    qualifiedAt: string | null;
  }>;
  rewards: Array<{
    id: string;
    rewardType: string;
    status: string;
    creditAmount: number | null;
    cashAmountUsd: number | null;
    availableAt: string | null;
    createdAt: string;
    inviteeEmail: string;
  }>;
  withdrawalRequests: Array<{
    id: string;
    amountUsd: number;
    status: string;
    requestedAt: string;
  }>;
}

export async function getReferralDashboardData(): Promise<
  ActionResult<ReferralDashboardData>
> {
  if (!referralConfig.enabled) {
    return actionResponse.forbidden("Referral rewards are currently disabled.");
  }

  const session = await getSession();
  const user = session?.user;
  if (!user) return actionResponse.unauthorized();

  const db = getDb();

  try {
    await unlockReferralRewardsForUser(user.id);

    const profile = await db
      .select({
        inviteCode: userSchema.inviteCode,
        inviteCodeChangeCount: userSchema.inviteCodeChangeCount,
      })
      .from(userSchema)
      .where(eq(userSchema.id, user.id))
      .limit(1);

    const invites = await db
      .select({
        id: referralInvitesSchema.id,
        status: referralInvitesSchema.status,
        registeredAt: referralInvitesSchema.registeredAt,
        qualifiedAt: referralInvitesSchema.qualifiedAt,
        inviteeEmail: userSchema.email,
        inviteeName: userSchema.name,
      })
      .from(referralInvitesSchema)
      .innerJoin(userSchema, eq(userSchema.id, referralInvitesSchema.inviteeUserId))
      .where(eq(referralInvitesSchema.inviterUserId, user.id))
      .orderBy(desc(referralInvitesSchema.createdAt));

    const rewards = await db
      .select({
        id: referralRewardsSchema.id,
        rewardType: referralRewardsSchema.rewardType,
        status: referralRewardsSchema.status,
        creditAmount: referralRewardsSchema.creditAmount,
        cashAmountUsd: referralRewardsSchema.cashAmountUsd,
        availableAt: referralRewardsSchema.availableAt,
        createdAt: referralRewardsSchema.createdAt,
        inviteeEmail: userSchema.email,
      })
      .from(referralRewardsSchema)
      .innerJoin(userSchema, eq(userSchema.id, referralRewardsSchema.inviteeUserId))
      .where(eq(referralRewardsSchema.inviterUserId, user.id))
      .orderBy(desc(referralRewardsSchema.createdAt));

    const withdrawalRequests = await db
      .select({
        id: referralWithdrawRequestsSchema.id,
        amountUsd: referralWithdrawRequestsSchema.amountUsd,
        status: referralWithdrawRequestsSchema.status,
        requestedAt: referralWithdrawRequestsSchema.requestedAt,
      })
      .from(referralWithdrawRequestsSchema)
      .where(eq(referralWithdrawRequestsSchema.userId, user.id))
      .orderBy(desc(referralWithdrawRequestsSchema.requestedAt));

    const summary = rewards.reduce(
      (acc, reward) => {
        const cash = reward.cashAmountUsd ? Number(reward.cashAmountUsd) : 0;
        if (reward.rewardType === "signup_credit") {
          acc.signupCreditsEarned += reward.creditAmount ?? 0;
        }
        if (reward.status === "locked") acc.lockedCashUsd += cash;
        if (reward.status === "claimable") acc.claimableCashUsd += cash;
        if (reward.status === "paid") acc.paidCashUsd += cash;
        if (reward.status === "pending_withdraw") acc.pendingWithdrawCashUsd += cash;
        return acc;
      },
      {
        invitedCount: invites.length,
        signupCreditsEarned: 0,
        lockedCashUsd: 0,
        claimableCashUsd: 0,
        paidCashUsd: 0,
        pendingWithdrawCashUsd: 0,
      }
    );

    const inviteCode = profile[0]?.inviteCode ?? null;
    const inviteCodeChangeCount = profile[0]?.inviteCodeChangeCount ?? 0;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

    return actionResponse.success({
      inviteCode,
      inviteLink: inviteCode ? `${siteUrl}/login?invite=${inviteCode}` : null,
      inviteCodeChangeCount,
      remainingInviteCodeChanges: Math.max(
        0,
        referralConfig.inviteCodePostCreationChangeLimit + 1 - inviteCodeChangeCount
      ),
      summary,
      invites: invites.map((item) => ({
        id: item.id,
        inviteeEmail: item.inviteeEmail,
        inviteeName: item.inviteeName,
        status: item.status,
        registeredAt: item.registeredAt.toISOString(),
        qualifiedAt: item.qualifiedAt?.toISOString() ?? null,
      })),
      rewards: rewards.map((item) => ({
        id: item.id,
        rewardType: item.rewardType,
        status: item.status,
        creditAmount: item.creditAmount,
        cashAmountUsd: item.cashAmountUsd ? Number(item.cashAmountUsd) : null,
        availableAt: item.availableAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
        inviteeEmail: item.inviteeEmail,
      })),
      withdrawalRequests: withdrawalRequests.map((item) => ({
        id: item.id,
        amountUsd: Number(item.amountUsd),
        status: item.status,
        requestedAt: item.requestedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error loading referral dashboard", error);
    return actionResponse.error(getErrorMessage(error));
  }
}

export async function saveReferralInviteCodeAction(
  inviteCode: string
): Promise<
  ActionResult<{
    inviteCode: string;
    inviteCodeChangeCount: number;
    remainingInviteCodeChanges: number;
  }>
> {
  const session = await getSession();
  const user = session?.user;
  if (!user) return actionResponse.unauthorized();

  try {
    const result = await saveConfiguredReferralInviteCode(user.id, inviteCode);

    if (result.status === "saved") {
      return actionResponse.success({
        inviteCode: result.inviteCode,
        inviteCodeChangeCount: result.inviteCodeChangeCount,
        remainingInviteCodeChanges: Math.max(
          0,
          referralConfig.inviteCodePostCreationChangeLimit + 1 - result.inviteCodeChangeCount
        ),
      });
    }

    switch (result.status) {
      case "too_short":
        return actionResponse.error(
          `Invite code must be at least ${referralConfig.inviteCodeMinLength} characters.`
        );
      case "duplicate":
        return actionResponse.error("This invite code is already in use.");
      case "change_limit_reached":
        return actionResponse.error("You have already used your invite code change.");
      case "invalid_code":
      default:
        return actionResponse.error("Invite code may only contain letters and numbers.");
    }
  } catch (error) {
    console.error("Error saving referral invite code", error);
    return actionResponse.error(getErrorMessage(error));
  }
}

export async function createReferralWithdrawalRequestAction(): Promise<
  ActionResult<{ message: string }>
> {
  if (!referralConfig.enabled) {
    return actionResponse.error("Referral rewards are currently disabled.");
  }

  const session = await getSession();
  const user = session?.user;
  if (!user) return actionResponse.unauthorized();

  try {
    const result = await createReferralWithdrawalRequest(user.id);
    if (result.status === "no_claimable_rewards") {
      return actionResponse.error("No claimable referral rewards available.");
    }

    return actionResponse.success({
      message: "Withdrawal request created. Please contact the administrator.",
    });
  } catch (error) {
    console.error("Error creating referral withdrawal request", error);
    return actionResponse.error(getErrorMessage(error));
  }
}

export async function acceptReferralInviteAction(
  inviteCode: string | null | undefined
): Promise<ActionResult<{ status: ReferralBindingStatus }>> {
  const session = await getSession();
  const user = session?.user;
  if (!user) return actionResponse.unauthorized();

  try {
    const result = await acceptConfiguredReferralInvite(user.id, inviteCode);
    return actionResponse.success(result);
  } catch (error) {
    console.error("Error accepting referral invite", error);
    return actionResponse.error(getErrorMessage(error));
  }
}
