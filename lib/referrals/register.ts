import { referralConfig } from "@/config/referral";
import { getDb } from "@/lib/db";
import {
  creditLogs as creditLogsSchema,
  referralInvites as referralInvitesSchema,
  referralRewards as referralRewardsSchema,
  usage as usageSchema,
  user as userSchema,
} from "@/lib/db/schema";
import { normalizeInviteCode } from "@/lib/referrals/invite-codes";
import { and, eq, sql } from "drizzle-orm";

export const REFERRAL_SIGNUP_CREDIT_LOG_TYPE = "referral_signup_bonus";

export interface ReferralRegistrationStore {
  lockInvitee(inviteeUserId: string): Promise<void>;
  getInviterByInviteCode(
    inviteCode: string
  ): Promise<{ userId: string; inviteCode: string } | null>;
  getInviteeProfile(inviteeUserId: string): Promise<{
    invitedByUserId: string | null;
    createdAt: Date;
  } | null>;
  hasSignupRewardForInvitee(inviteeUserId: string): Promise<boolean>;
  bindInviteeToInviter(input: {
    inviterUserId: string;
    inviteeUserId: string;
    inviteCode: string;
  }): Promise<void>;
  grantInviterCredits(inviterUserId: string, amount: number): Promise<void>;
  createSignupReward(input: {
    inviterUserId: string;
    inviteeUserId: string;
    creditAmount: number;
  }): Promise<void>;
}

type DbClient = ReturnType<typeof getDb>;
type DbTransactionCallback = Parameters<DbClient["transaction"]>[0];
type DbTransaction = Parameters<DbTransactionCallback>[0];

interface BindReferralOnRegistrationParams {
  store: ReferralRegistrationStore;
  inviteeUserId: string;
  inviteCode: string | null | undefined;
  signupCreditAmount: number;
}

export type ReferralBindingStatus =
  | "no_code"
  | "missing_inviter"
  | "self_invite"
  | "expired"
  | "already_bound"
  | "already_rewarded"
  | "bound";

export async function bindReferralOnRegistration({
  store,
  inviteeUserId,
  inviteCode,
  signupCreditAmount,
}: BindReferralOnRegistrationParams): Promise<{ status: ReferralBindingStatus }> {
  const normalizedInviteCode = normalizeInviteCode(inviteCode ?? "");
  const now = new Date();

  if (!normalizedInviteCode) {
    return { status: "no_code" };
  }

  await store.lockInvitee(inviteeUserId);
  const invitee = await store.getInviteeProfile(inviteeUserId);

  if (!invitee) {
    return { status: "missing_inviter" };
  }

  const inviter = await store.getInviterByInviteCode(normalizedInviteCode);
  if (!inviter) {
    return { status: "missing_inviter" };
  }

  if (inviter.userId === inviteeUserId) {
    return { status: "self_invite" };
  }

  const acceptanceWindowEndsAt = new Date(invitee.createdAt);
  acceptanceWindowEndsAt.setDate(
    acceptanceWindowEndsAt.getDate() + referralConfig.inviteAcceptanceWindowDays
  );

  if (now > acceptanceWindowEndsAt) {
    return { status: "expired" };
  }

  if (invitee.invitedByUserId) {
    return { status: "already_bound" };
  }

  if (await store.hasSignupRewardForInvitee(inviteeUserId)) {
    return { status: "already_rewarded" };
  }

  await store.bindInviteeToInviter({
    inviterUserId: inviter.userId,
    inviteeUserId,
    inviteCode: inviter.inviteCode,
  });

  if (signupCreditAmount > 0) {
    await store.grantInviterCredits(inviter.userId, signupCreditAmount);
    await store.createSignupReward({
      inviterUserId: inviter.userId,
      inviteeUserId,
      creditAmount: signupCreditAmount,
    });
  }

  return { status: "bound" };
}

export async function acceptConfiguredReferralInvite(
  inviteeUserId: string,
  inviteCode: string | null | undefined
): Promise<{ status: ReferralBindingStatus }> {
  const db = getDb();

  return db.transaction(async (tx) => {
    const store = createDrizzleReferralRegistrationStore(tx);

    return bindReferralOnRegistration({
      store,
      inviteeUserId,
      inviteCode,
      signupCreditAmount: referralConfig.signupInviteCredit,
    });
  });
}

function createDrizzleReferralRegistrationStore(
  tx: DbTransaction
): ReferralRegistrationStore {
  return {
    async lockInvitee(inviteeUserId: string) {
      await tx
        .select({ id: userSchema.id })
        .from(userSchema)
        .where(eq(userSchema.id, inviteeUserId))
        .for("update");
    },

    async getInviterByInviteCode(inviteCode: string) {
      const inviter = await tx
        .select({
          userId: userSchema.id,
          inviteCode: userSchema.inviteCode,
        })
        .from(userSchema)
        .where(eq(userSchema.inviteCode, inviteCode))
        .limit(1);

      const inviterRecord = inviter[0];
      if (!inviterRecord?.inviteCode) {
        return null;
      }

      return {
        userId: inviterRecord.userId,
        inviteCode: inviterRecord.inviteCode,
      };
    },

    async getInviteeProfile(inviteeUserId: string) {
      const invitee = await tx
        .select({
          invitedByUserId: userSchema.invitedByUserId,
          createdAt: userSchema.createdAt,
        })
        .from(userSchema)
        .where(eq(userSchema.id, inviteeUserId))
        .limit(1);

      const inviteeRecord = invitee[0];
      if (!inviteeRecord) {
        return null;
      }

      return {
        invitedByUserId: inviteeRecord.invitedByUserId ?? null,
        createdAt: inviteeRecord.createdAt,
      };
    },

    async hasSignupRewardForInvitee(inviteeUserId: string) {
      const rewards = await tx
        .select({ id: referralRewardsSchema.id })
        .from(referralRewardsSchema)
        .where(
          and(
            eq(referralRewardsSchema.inviteeUserId, inviteeUserId),
            eq(referralRewardsSchema.rewardType, "signup_credit")
          )
        )
        .limit(1);

      return rewards.length > 0;
    },

    async bindInviteeToInviter({ inviterUserId, inviteeUserId, inviteCode }) {
      await tx
        .update(userSchema)
        .set({
          invitedByUserId: inviterUserId,
        })
        .where(eq(userSchema.id, inviteeUserId));

      await tx.insert(referralInvitesSchema).values({
        inviterUserId,
        inviteeUserId,
        inviteCodeSnapshot: inviteCode,
      });
    },

    async grantInviterCredits(inviterUserId: string, amount: number) {
      const updatedUsage = await tx
        .insert(usageSchema)
        .values({
          userId: inviterUserId,
          oneTimeCreditsBalance: amount,
        })
        .onConflictDoUpdate({
          target: usageSchema.userId,
          set: {
            oneTimeCreditsBalance: sql`${usageSchema.oneTimeCreditsBalance} + ${amount}`,
          },
        })
        .returning({
          oneTimeCreditsSnapshot: usageSchema.oneTimeCreditsBalance,
          subscriptionCreditsSnapshot: usageSchema.subscriptionCreditsBalance,
        });

      const balances = updatedUsage[0];
      if (!balances) {
        throw new Error("Failed to update inviter credit balance");
      }

      await tx.insert(creditLogsSchema).values({
        userId: inviterUserId,
        amount,
        oneTimeCreditsSnapshot: balances.oneTimeCreditsSnapshot,
        subscriptionCreditsSnapshot: balances.subscriptionCreditsSnapshot,
        type: REFERRAL_SIGNUP_CREDIT_LOG_TYPE,
        notes: "Referral signup reward credits granted",
      });
    },

    async createSignupReward({ inviterUserId, inviteeUserId, creditAmount }) {
      await tx.insert(referralRewardsSchema).values({
        inviterUserId,
        inviteeUserId,
        rewardType: "signup_credit",
        status: "granted",
        creditAmount,
        grantedAt: new Date(),
        rewardConfigSnapshot: {
          signupInviteCredit: referralConfig.signupInviteCredit,
        },
        notes: "Referral signup reward",
      });
    },
  };
}
