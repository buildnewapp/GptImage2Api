import { referralConfig } from "@/config/referral";
import { getDb } from "@/lib/db";
import {
  referralRewards as referralRewardsSchema,
  user as userSchema,
} from "@/lib/db/schema";
import { calculateCashRewardAmount, qualifiesForFirstOrderReward } from "@/lib/referrals/rewards";
import { and, count, eq, ne } from "drizzle-orm";

export interface FirstOrderRewardStore {
  getInviteeProfile(
    inviteeUserId: string
  ): Promise<{ inviterUserId: string | null; createdAt: Date } | null>;
  countPaidOrdersBeforeThisOrder(input: {
    inviteeUserId: string;
    sourceOrderId: string;
  }): Promise<number>;
  hasExistingCashReward(inviteeUserId: string): Promise<boolean>;
  createLockedCashReward(input: {
    inviterUserId: string;
    inviteeUserId: string;
    sourceOrderId: string;
    cashAmountUsd: number;
    availableAt: Date;
  }): Promise<void>;
}

type DbClient = ReturnType<typeof getDb>;
type DbTransactionCallback = Parameters<DbClient["transaction"]>[0];
type DbTransaction = Parameters<DbTransactionCallback>[0];

interface GrantFirstOrderRewardIfEligibleParams {
  store: FirstOrderRewardStore;
  inviteeUserId: string;
  sourceOrderId: string;
  orderAmountUsd: number;
  paidAt: Date;
  qualificationDays: number;
  rewardMode: "fixed" | "percentage";
  fixedUsd: number;
  percent: number;
  lockDays: number;
  rewardsEnabled?: boolean;
}

type FirstOrderRewardStatus =
  | "disabled"
  | "missing_invitee"
  | "not_invited"
  | "reward_exists"
  | "not_first_order"
  | "outside_window"
  | "reward_created";

export async function grantFirstOrderRewardIfEligible({
  store,
  inviteeUserId,
  sourceOrderId,
  orderAmountUsd,
  paidAt,
  qualificationDays,
  rewardMode,
  fixedUsd,
  percent,
  lockDays,
  rewardsEnabled = true,
}: GrantFirstOrderRewardIfEligibleParams): Promise<{ status: FirstOrderRewardStatus }> {
  if (!rewardsEnabled) {
    return { status: "disabled" };
  }

  const inviteeProfile = await store.getInviteeProfile(inviteeUserId);
  if (!inviteeProfile) {
    return { status: "missing_invitee" };
  }

  if (!inviteeProfile.inviterUserId) {
    return { status: "not_invited" };
  }

  if (await store.hasExistingCashReward(inviteeUserId)) {
    return { status: "reward_exists" };
  }

  const paidOrderCountBeforeThisOrder = await store.countPaidOrdersBeforeThisOrder({
    inviteeUserId,
    sourceOrderId,
  });

  const qualified = qualifiesForFirstOrderReward({
    inviteeCreatedAt: inviteeProfile.createdAt,
    orderPaidAt: paidAt,
    qualificationDays,
    paidOrderCountBeforeThisOrder,
    hasExistingCashReward: false,
  });

  if (paidOrderCountBeforeThisOrder > 0) {
    return { status: "not_first_order" };
  }

  if (!qualified) {
    return { status: "outside_window" };
  }

  const cashAmountUsd = calculateCashRewardAmount({
    orderAmountUsd,
    rewardMode,
    fixedUsd,
    percent,
  });

  const availableAt = new Date(paidAt);
  availableAt.setUTCDate(availableAt.getUTCDate() + lockDays);

  await store.createLockedCashReward({
    inviterUserId: inviteeProfile.inviterUserId,
    inviteeUserId,
    sourceOrderId,
    cashAmountUsd,
    availableAt,
  });

  return { status: "reward_created" };
}

export async function grantConfiguredFirstOrderReward(input: {
  inviteeUserId: string;
  sourceOrderId: string;
  orderAmountUsd: number;
  paidAt?: Date;
}): Promise<{ status: FirstOrderRewardStatus }> {
  const db = getDb();

  return db.transaction(async (tx) => {
    const store = createDrizzleFirstOrderRewardStore(tx);

    return grantFirstOrderRewardIfEligible({
      store,
      inviteeUserId: input.inviteeUserId,
      sourceOrderId: input.sourceOrderId,
      orderAmountUsd: input.orderAmountUsd,
      paidAt: input.paidAt ?? new Date(),
      qualificationDays: referralConfig.firstOrderQualificationDays,
      rewardMode: referralConfig.firstOrderRewardMode,
      fixedUsd: referralConfig.firstOrderRewardFixedUsd,
      percent: referralConfig.firstOrderRewardPercent,
      lockDays: referralConfig.cashRewardLockDays,
      rewardsEnabled: referralConfig.enabled,
    });
  });
}

function createDrizzleFirstOrderRewardStore(
  tx: DbTransaction
): FirstOrderRewardStore {
  return {
    async getInviteeProfile(inviteeUserId: string) {
      const invitee = await tx
        .select({
          inviterUserId: userSchema.invitedByUserId,
          createdAt: userSchema.createdAt,
        })
        .from(userSchema)
        .where(eq(userSchema.id, inviteeUserId))
        .limit(1);

      return invitee[0] ?? null;
    },

    async countPaidOrdersBeforeThisOrder({ inviteeUserId, sourceOrderId }) {
      const { orders: ordersSchema } = await import("@/lib/db/schema");
      const result = await tx
        .select({ value: count() })
        .from(ordersSchema)
        .where(
          and(
            eq(ordersSchema.userId, inviteeUserId),
            eq(ordersSchema.status, "succeeded"),
            ne(ordersSchema.id, sourceOrderId)
          )
        );

      return result[0]?.value ?? 0;
    },

    async hasExistingCashReward(inviteeUserId: string) {
      const existingRewards = await tx
        .select({ id: referralRewardsSchema.id })
        .from(referralRewardsSchema)
        .where(
          and(
            eq(referralRewardsSchema.inviteeUserId, inviteeUserId),
            eq(referralRewardsSchema.rewardType, "first_order_cash")
          )
        )
        .limit(1);

      return existingRewards.length > 0;
    },

    async createLockedCashReward({
      inviterUserId,
      inviteeUserId,
      sourceOrderId,
      cashAmountUsd,
      availableAt,
    }) {
      await tx.insert(referralRewardsSchema).values({
        inviterUserId,
        inviteeUserId,
        sourceOrderId,
        rewardType: "first_order_cash",
        status: "locked",
        cashAmountUsd: cashAmountUsd.toFixed(2),
        availableAt,
        grantedAt: new Date(),
        rewardConfigSnapshot: {
          firstOrderRewardMode: referralConfig.firstOrderRewardMode,
          firstOrderRewardFixedUsd: referralConfig.firstOrderRewardFixedUsd,
          firstOrderRewardPercent: referralConfig.firstOrderRewardPercent,
          firstOrderQualificationDays: referralConfig.firstOrderQualificationDays,
          cashRewardLockDays: referralConfig.cashRewardLockDays,
        },
        notes: "Referral first-order cash reward",
      });
    },
  };
}
