import { creditConfig } from "@/config/credit";
import {
  referralConfig,
  resolveFreeCreditAmountByCountry,
  type FreeCreditCountryPolicy,
} from "@/config/referral";
import { getDb } from "@/lib/db";
import {
  creditLogs as creditLogsSchema,
  rewardApplications as rewardApplicationsSchema,
  usage as usageSchema,
  user as userSchema,
} from "@/lib/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";

export const SIGNUP_BONUS_CREDIT_LOG_TYPE = "welcome_bonus";
export const SIGNUP_BONUS_CREDIT_LOG_NOTES =
  "Welcome bonus for new user registration";

interface SignupBonusEligibilityCounts {
  ip24Hours: number;
  ip7Days: number;
  device30Days: number;
}

export interface SignupBonusStore {
  lockUser(userId: string): Promise<void>;
  lockEligibilityKeys(input: {
    ipHash?: string | null;
    deviceHash?: string | null;
  }): Promise<void>;
  getEligibilityCounts(input: {
    ipHash?: string | null;
    deviceHash?: string | null;
    now: Date;
  }): Promise<SignupBonusEligibilityCounts>;
  hasSignupBonusLog(userId: string): Promise<boolean>;
  applyOneTimeCredits(
    userId: string,
    amount: number,
  ): Promise<{
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
  insertRewardApplication(application: {
    userId: string;
    taskKey: "signup_bonus";
    source: "system";
    status: "approved";
    creditAmount: number;
    ipHash?: string | null;
    deviceHash?: string | null;
  }): Promise<void>;
}

interface GrantSignupBonusCreditsParams {
  store: SignupBonusStore;
  userId: string;
  amount: number;
  email?: string | null;
  countryCode?: string | null;
  countryPolicy?: FreeCreditCountryPolicy;
  blockedEmailKeywords?: readonly string[];
  ipHash?: string | null;
  deviceHash?: string | null;
  maxPerIp24Hours?: number;
  maxPerIp7Days?: number;
  maxPerDevice30Days?: number;
  now?: Date;
  notes?: string;
}

interface ConfiguredSignupBonusParams {
  email?: string | null;
  countryCode?: string | null;
  ipHash?: string | null;
  deviceHash?: string | null;
}

type DbClient = ReturnType<typeof getDb>;
type DbTransactionCallback = Parameters<DbClient["transaction"]>[0];
type DbTransaction = Parameters<DbTransactionCallback>[0];
type EligibilityQueryDb = Pick<DbTransaction, "select">;

export function buildSignupBonusIpEligibilityQuery(
  db: EligibilityQueryDb,
  input: {
    ipHash: string;
    oneDayAgo: Date;
    sevenDaysAgo: Date;
  },
) {
  return db
    .select({
      ip24Hours: sql<number>`count(*) filter (where ${rewardApplicationsSchema.submittedAt} >= ${input.oneDayAgo})::int`,
      ip7Days: sql<number>`count(*)::int`,
    })
    .from(rewardApplicationsSchema)
    .where(
      and(
        eq(rewardApplicationsSchema.taskKey, "signup_bonus"),
        eq(rewardApplicationsSchema.status, "approved"),
        eq(rewardApplicationsSchema.ipHash, input.ipHash),
        gte(rewardApplicationsSchema.submittedAt, input.sevenDaysAgo),
      ),
    );
}

export function buildSignupBonusDeviceEligibilityQuery(
  db: EligibilityQueryDb,
  input: {
    deviceHash: string;
    thirtyDaysAgo: Date;
  },
) {
  return db
    .select({
      device30Days: sql<number>`count(*)::int`,
    })
    .from(rewardApplicationsSchema)
    .where(
      and(
        eq(rewardApplicationsSchema.taskKey, "signup_bonus"),
        eq(rewardApplicationsSchema.status, "approved"),
        eq(rewardApplicationsSchema.deviceHash, input.deviceHash),
        gte(rewardApplicationsSchema.submittedAt, input.thirtyDaysAgo),
      ),
    );
}

export async function grantSignupBonusCredits({
  store,
  userId,
  amount,
  email,
  countryCode,
  countryPolicy = referralConfig.freeCreditCountryPolicy,
  blockedEmailKeywords = creditConfig.signupBonusPolicy.blockedEmailKeywords,
  ipHash,
  deviceHash,
  maxPerIp24Hours = creditConfig.signupBonusPolicy.maxPerIp24Hours,
  maxPerIp7Days = creditConfig.signupBonusPolicy.maxPerIp7Days,
  maxPerDevice30Days = creditConfig.signupBonusPolicy.maxPerDevice30Days,
  now = new Date(),
  notes = SIGNUP_BONUS_CREDIT_LOG_NOTES,
}: GrantSignupBonusCreditsParams): Promise<boolean> {
  const resolvedAmount = resolveFreeCreditAmountByCountry(
    amount,
    countryCode,
    countryPolicy,
  );

  if (resolvedAmount <= 0) {
    return false;
  }

  const normalizedEmail = email?.trim().toLowerCase() ?? "";
  const containsBlockedKeyword = blockedEmailKeywords.some((keyword) => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return (
      normalizedKeyword.length > 0 &&
      normalizedEmail.includes(normalizedKeyword)
    );
  });
  if (containsBlockedKeyword) {
    return false;
  }

  if (!deviceHash) {
    return false;
  }

  await store.lockUser(userId);

  if (await store.hasSignupBonusLog(userId)) {
    return false;
  }

  await store.lockEligibilityKeys({ ipHash, deviceHash });
  const eligibilityCounts = await store.getEligibilityCounts({
    ipHash,
    deviceHash,
    now,
  });

  if (
    ipHash &&
    (eligibilityCounts.ip24Hours >= maxPerIp24Hours ||
      eligibilityCounts.ip7Days >= maxPerIp7Days)
  ) {
    return false;
  }

  if (deviceHash && eligibilityCounts.device30Days >= maxPerDevice30Days) {
    return false;
  }

  const balances = await store.applyOneTimeCredits(userId, resolvedAmount);

  await store.insertCreditLog({
    userId,
    amount: resolvedAmount,
    oneTimeCreditsSnapshot: balances.oneTimeCreditsSnapshot,
    subscriptionCreditsSnapshot: balances.subscriptionCreditsSnapshot,
    type: SIGNUP_BONUS_CREDIT_LOG_TYPE,
    notes,
  });

  await store.insertRewardApplication({
    userId,
    taskKey: "signup_bonus",
    source: "system",
    status: "approved",
    creditAmount: resolvedAmount,
    ipHash,
    deviceHash,
  });

  return true;
}

export async function grantConfiguredSignupBonusCredits(
  userId: string,
  params: ConfiguredSignupBonusParams = {},
): Promise<boolean> {
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
      ...params,
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

    async lockEligibilityKeys({ ipHash, deviceHash }) {
      const lockKeys = [
        ipHash ? `ip:${ipHash}` : null,
        deviceHash ? `device:${deviceHash}` : null,
      ]
        .filter((key): key is string => Boolean(key))
        .sort();

      for (const key of lockKeys) {
        await tx.execute(
          sql`select pg_advisory_xact_lock(73121, hashtext(${key}))`,
        );
      }
    },

    async getEligibilityCounts({ ipHash, deviceHash, now }) {
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const counts: SignupBonusEligibilityCounts = {
        ip24Hours: 0,
        ip7Days: 0,
        device30Days: 0,
      };

      if (ipHash) {
        const ipCounts = await buildSignupBonusIpEligibilityQuery(tx, {
          ipHash,
          oneDayAgo,
          sevenDaysAgo,
        });
        counts.ip24Hours = ipCounts[0]?.ip24Hours ?? 0;
        counts.ip7Days = ipCounts[0]?.ip7Days ?? 0;
      }

      if (deviceHash) {
        const deviceCounts = await buildSignupBonusDeviceEligibilityQuery(tx, {
          deviceHash,
          thirtyDaysAgo,
        });
        counts.device30Days = deviceCounts[0]?.device30Days ?? 0;
      }

      return counts;
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

    async insertRewardApplication(application) {
      await tx.insert(rewardApplicationsSchema).values(application);
    },
  };
}
