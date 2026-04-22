import { referralConfig } from "@/config/referral";
import { getDb } from "@/lib/db";
import { user as userSchema } from "@/lib/db/schema";
import { normalizeInviteCode } from "@/lib/referrals/invite-codes";
import { eq } from "drizzle-orm";

export interface ReferralInviteCodeStore {
  lockUser(userId: string): Promise<void>;
  getUserProfile(userId: string): Promise<{
    inviteCode: string | null;
    inviteCodeChangeCount: number;
  } | null>;
  findUserIdByInviteCode(inviteCode: string): Promise<string | null>;
  saveInviteCode(
    userId: string,
    inviteCode: string,
    inviteCodeChangeCount: number
  ): Promise<void>;
}

export type SaveReferralInviteCodeResult =
  | {
      status: "saved";
      inviteCode: string;
      inviteCodeChangeCount: number;
    }
  | { status: "invalid_code" | "too_short" | "duplicate" | "change_limit_reached" };

export async function saveReferralInviteCode({
  store,
  userId,
  inviteCode,
}: {
  store: ReferralInviteCodeStore;
  userId: string;
  inviteCode: string;
}): Promise<SaveReferralInviteCodeResult> {
  const normalizedInviteCode = normalizeInviteCode(inviteCode);

  if (!normalizedInviteCode) {
    return { status: "invalid_code" };
  }

  if (normalizedInviteCode.length < referralConfig.inviteCodeMinLength) {
    return { status: "too_short" };
  }

  await store.lockUser(userId);
  const profile = await store.getUserProfile(userId);
  const currentInviteCode = profile?.inviteCode ?? null;
  const currentChangeCount = profile?.inviteCodeChangeCount ?? 0;

  if (
    currentInviteCode &&
    currentInviteCode !== normalizedInviteCode &&
    currentChangeCount >= referralConfig.inviteCodePostCreationChangeLimit + 1
  ) {
    return { status: "change_limit_reached" };
  }

  const existingOwnerUserId = await store.findUserIdByInviteCode(normalizedInviteCode);
  if (existingOwnerUserId && existingOwnerUserId !== userId) {
    return { status: "duplicate" };
  }

  const nextInviteCodeChangeCount =
    currentInviteCode === normalizedInviteCode
      ? currentChangeCount
      : currentChangeCount + 1;

  await store.saveInviteCode(userId, normalizedInviteCode, nextInviteCodeChangeCount);

  return {
    status: "saved",
    inviteCode: normalizedInviteCode,
    inviteCodeChangeCount: nextInviteCodeChangeCount,
  };
}

type DbClient = ReturnType<typeof getDb>;
type DbTransactionCallback = Parameters<DbClient["transaction"]>[0];
type DbTransaction = Parameters<DbTransactionCallback>[0];

export async function saveConfiguredReferralInviteCode(
  userId: string,
  inviteCode: string
): Promise<SaveReferralInviteCodeResult> {
  const db = getDb();

  return db.transaction(async (tx) => {
    const store = createDrizzleReferralInviteCodeStore(tx);

    return saveReferralInviteCode({
      store,
      userId,
      inviteCode,
    });
  });
}

function createDrizzleReferralInviteCodeStore(
  tx: DbTransaction
): ReferralInviteCodeStore {
  return {
    async lockUser(userId: string) {
      await tx
        .select({ id: userSchema.id })
        .from(userSchema)
        .where(eq(userSchema.id, userId))
        .for("update");
    },

    async getUserProfile(userId: string) {
      const records = await tx
        .select({
          inviteCode: userSchema.inviteCode,
          inviteCodeChangeCount: userSchema.inviteCodeChangeCount,
        })
        .from(userSchema)
        .where(eq(userSchema.id, userId))
        .limit(1);

      return records[0] ?? null;
    },

    async findUserIdByInviteCode(inviteCode: string) {
      const records = await tx
        .select({ userId: userSchema.id })
        .from(userSchema)
        .where(eq(userSchema.inviteCode, inviteCode))
        .limit(1);

      return records[0]?.userId ?? null;
    },

    async saveInviteCode(userId, inviteCode, inviteCodeChangeCount) {
      await tx
        .update(userSchema)
        .set({
          inviteCode,
          inviteCodeChangeCount,
          inviteCodeUpdatedAt: new Date(),
        })
        .where(eq(userSchema.id, userId));
    },
  };
}
