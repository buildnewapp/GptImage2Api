import { creditConfig } from "@/config/credit";
import { getDb } from "@/lib/db";
import {
  creditLogs as creditLogsSchema,
  usage as usageSchema,
  user as userSchema,
} from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";

export const SIGNUP_BONUS_CREDIT_LOG_TYPE = "welcome_bonus";
export const SIGNUP_BONUS_CREDIT_LOG_NOTES = "Welcome bonus for new user registration";

export interface SignupBonusStore {
  lockUser(userId: string): Promise<void>;
  hasSignupBonusLog(userId: string): Promise<boolean>;
  applyOneTimeCredits(userId: string, amount: number): Promise<{
    oneTimeCreditsSnapshot: number;
    subscriptionCreditsSnapshot: number;
  }>;
  insertCreditLog(log: {
    userId: string;
    amount: number;
    oneTimeCreditsSnapshot: number;
    subscriptionCreditsSnapshot: number;
    type: string;
    notes: string;
  }): Promise<void>;
}

interface GrantSignupBonusCreditsParams {
  store: SignupBonusStore;
  userId: string;
  amount: number;
  notes?: string;
}

type DbClient = ReturnType<typeof getDb>;
type DbTransactionCallback = Parameters<DbClient["transaction"]>[0];
type DbTransaction = Parameters<DbTransactionCallback>[0];

export async function grantSignupBonusCredits({
  store,
  userId,
  amount,
  notes = SIGNUP_BONUS_CREDIT_LOG_NOTES,
}: GrantSignupBonusCreditsParams): Promise<boolean> {
  if (amount <= 0) {
    return false;
  }

  await store.lockUser(userId);

  if (await store.hasSignupBonusLog(userId)) {
    return false;
  }

  const balances = await store.applyOneTimeCredits(userId, amount);

  await store.insertCreditLog({
    userId,
    amount,
    oneTimeCreditsSnapshot: balances.oneTimeCreditsSnapshot,
    subscriptionCreditsSnapshot: balances.subscriptionCreditsSnapshot,
    type: SIGNUP_BONUS_CREDIT_LOG_TYPE,
    notes,
  });

  return true;
}

export async function grantConfiguredSignupBonusCredits(userId: string): Promise<boolean> {
  const amount = creditConfig.signupBonusCredits;

  if (amount <= 0) {
    return false;
  }

  const db = getDb();

  return db.transaction(async (tx) => {
    const store = createDrizzleSignupBonusStore(tx);

    return grantSignupBonusCredits({
      store,
      userId,
      amount,
    });
  });
}

function createDrizzleSignupBonusStore(tx: DbTransaction): SignupBonusStore {
  return {
    async lockUser(userId: string) {
      await tx
        .select({ id: userSchema.id })
        .from(userSchema)
        .where(eq(userSchema.id, userId))
        .for("update");
    },

    async hasSignupBonusLog(userId: string) {
      const existingLog = await tx
        .select({ id: creditLogsSchema.id })
        .from(creditLogsSchema)
        .where(
          and(
            eq(creditLogsSchema.userId, userId),
            eq(creditLogsSchema.type, SIGNUP_BONUS_CREDIT_LOG_TYPE),
          ),
        )
        .limit(1);

      return existingLog.length > 0;
    },

    async applyOneTimeCredits(userId: string, amount: number) {
      const updatedUsage = await tx
        .insert(usageSchema)
        .values({
          userId,
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
        throw new Error("Failed to update usage for signup bonus credits");
      }

      return balances;
    },

    async insertCreditLog(log) {
      await tx.insert(creditLogsSchema).values(log);
    },
  };
}
