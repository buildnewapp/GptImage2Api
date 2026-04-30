"use server";

import type { ActionResult } from "@/lib/action-response";
import { actionResponse } from "@/lib/action-response";
import { isAdmin } from "@/lib/auth/server";
import { getDb } from "@/lib/db";
import {
  aiStudioGenerations as aiStudioGenerationsSchema,
  creditLogs as creditLogsSchema,
  orders as ordersSchema,
  pricingPlans as pricingPlansSchema,
  session as sessionSchema,
  subscriptions as subscriptionsSchema,
  subscriptionCreditBuckets as subscriptionCreditBucketsSchema,
  usage as usageSchema,
  user as userSchema,
  userSource as userSourceSchema,
} from "@/lib/db/schema";
import { getErrorMessage } from "@/lib/error-utils";
import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

type UserType = typeof userSchema.$inferSelect;

// Extended user type with fields from userSource
export type UserWithSource = UserType & {
  affCode?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  referrer?: string | null;
  countryCode?: string | null;
  browser?: string | null;
  os?: string | null;
  deviceType?: string | null;
  deviceBrand?: string | null;
  deviceModel?: string | null;
  language?: string | null;
  subscriptionCreditsBalance?: number | null;
  oneTimeCreditsBalance?: number | null;
  totalCredits?: number | null;
};

export interface GetUsersResult {
  success: boolean;
  data?: {
    users: UserWithSource[];
    totalCount: number;
  };
  error?: string;
}

export type AdminUserDetails = {
  user: UserWithSource;
  buckets: Array<typeof subscriptionCreditBucketsSchema.$inferSelect>;
  subscriptions: Array<
    typeof subscriptionsSchema.$inferSelect & {
      planTitle: string | null;
    }
  >;
  orders: Array<
    typeof ordersSchema.$inferSelect & {
      planTitle: string | null;
    }
  >;
  generationStats: {
    total: number;
    succeeded: number;
    successRate: number;
  };
  creditStats: {
    consumedCredits: number;
    purchasedCredits: number;
  };
};

export type GetUserDetailsResult = ActionResult<AdminUserDetails>;

const DEFAULT_PAGE_SIZE = 20;

export async function getUsers({
  pageIndex = 0,
  pageSize = DEFAULT_PAGE_SIZE,
  filter = "",
}: {
  pageIndex?: number;
  pageSize?: number;
  filter?: string;
}): Promise<GetUsersResult> {
  if (!(await isAdmin())) {
    return actionResponse.forbidden("Admin privileges required.");
  }

  const db = getDb();

  try {
    const conditions = [];
    if (filter) {
      conditions.push(
        or(
          ilike(userSchema.email, `%${filter}%`),
          ilike(userSchema.name, `%${filter}%`),
        ),
      );
    }

    // Query users with left join to userSource for source tracking fields
    const usersQuery = db
      .select({
        // User fields
        id: userSchema.id,
        email: userSchema.email,
        emailVerified: userSchema.emailVerified,
        name: userSchema.name,
        image: userSchema.image,
        role: userSchema.role,
        isAnonymous: userSchema.isAnonymous,
        referral: userSchema.referral,
        stripeCustomerId: userSchema.stripeCustomerId,
        banned: userSchema.banned,
        banReason: userSchema.banReason,
        banExpires: userSchema.banExpires,
        createdAt: userSchema.createdAt,
        updatedAt: userSchema.updatedAt,
        // UserSource fields
        affCode: userSourceSchema.affCode,
        utmSource: userSourceSchema.utmSource,
        utmMedium: userSourceSchema.utmMedium,
        utmCampaign: userSourceSchema.utmCampaign,
        utmTerm: userSourceSchema.utmTerm,
        utmContent: userSourceSchema.utmContent,
        referrer: userSourceSchema.referrer,
        countryCode: userSourceSchema.countryCode,
        browser: userSourceSchema.browser,
        os: userSourceSchema.os,
        deviceType: userSourceSchema.deviceType,
        deviceBrand: userSourceSchema.deviceBrand,
        deviceModel: userSourceSchema.deviceModel,
        language: userSourceSchema.language,
        subscriptionCreditsBalance: usageSchema.subscriptionCreditsBalance,
        oneTimeCreditsBalance: usageSchema.oneTimeCreditsBalance,
        totalCredits: sql<number>`coalesce(${usageSchema.subscriptionCreditsBalance}, 0) + coalesce(${usageSchema.oneTimeCreditsBalance}, 0)`,
      })
      .from(userSchema)
      .leftJoin(userSourceSchema, eq(userSchema.id, userSourceSchema.userId))
      .leftJoin(usageSchema, eq(userSchema.id, usageSchema.userId))
      .where(conditions.length > 0 ? or(...conditions) : undefined)
      .orderBy(desc(userSchema.createdAt))
      .offset(pageIndex * pageSize)
      .limit(pageSize);

    const totalCountQuery = db
      .select({ value: count() })
      .from(userSchema)
      .where(conditions.length > 0 ? or(...conditions) : undefined);

    const [results, totalCountResult] = await Promise.all([
      usersQuery,
      totalCountQuery,
    ]);

    const totalCount = totalCountResult[0].value;

    return actionResponse.success({
      users: (results as UserWithSource[]) || [],
      totalCount: totalCount,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return actionResponse.error(getErrorMessage(error));
  }
}

export async function getUserDetails({
  userId,
}: {
  userId: string;
}): Promise<GetUserDetailsResult> {
  if (!(await isAdmin())) {
    return actionResponse.forbidden("Admin privileges required.");
  }

  const db = getDb();

  try {
    const userResults = await db
      .select({
        id: userSchema.id,
        email: userSchema.email,
        emailVerified: userSchema.emailVerified,
        name: userSchema.name,
        image: userSchema.image,
        role: userSchema.role,
        isAnonymous: userSchema.isAnonymous,
        referral: userSchema.referral,
        stripeCustomerId: userSchema.stripeCustomerId,
        banned: userSchema.banned,
        banReason: userSchema.banReason,
        banExpires: userSchema.banExpires,
        createdAt: userSchema.createdAt,
        updatedAt: userSchema.updatedAt,
        affCode: userSourceSchema.affCode,
        utmSource: userSourceSchema.utmSource,
        utmMedium: userSourceSchema.utmMedium,
        utmCampaign: userSourceSchema.utmCampaign,
        utmTerm: userSourceSchema.utmTerm,
        utmContent: userSourceSchema.utmContent,
        referrer: userSourceSchema.referrer,
        countryCode: userSourceSchema.countryCode,
        browser: userSourceSchema.browser,
        os: userSourceSchema.os,
        deviceType: userSourceSchema.deviceType,
        deviceBrand: userSourceSchema.deviceBrand,
        deviceModel: userSourceSchema.deviceModel,
        language: userSourceSchema.language,
        subscriptionCreditsBalance: usageSchema.subscriptionCreditsBalance,
        oneTimeCreditsBalance: usageSchema.oneTimeCreditsBalance,
        totalCredits: sql<number>`coalesce(${usageSchema.subscriptionCreditsBalance}, 0) + coalesce(${usageSchema.oneTimeCreditsBalance}, 0)`,
      })
      .from(userSchema)
      .leftJoin(userSourceSchema, eq(userSchema.id, userSourceSchema.userId))
      .leftJoin(usageSchema, eq(userSchema.id, usageSchema.userId))
      .where(eq(userSchema.id, userId))
      .limit(1);

    const user = userResults[0] as UserWithSource | undefined;
    if (!user) {
      return actionResponse.notFound("User not found.");
    }

    const [
      buckets,
      subscriptions,
      orders,
      generationStatsResults,
      consumedCreditResults,
      purchasedCreditResults,
    ] = await Promise.all([
      db
        .select()
        .from(subscriptionCreditBucketsSchema)
        .where(eq(subscriptionCreditBucketsSchema.userId, userId))
        .orderBy(desc(subscriptionCreditBucketsSchema.createdAt))
        .limit(10),
      db
        .select({
          id: subscriptionsSchema.id,
          userId: subscriptionsSchema.userId,
          planId: subscriptionsSchema.planId,
          provider: subscriptionsSchema.provider,
          subscriptionId: subscriptionsSchema.subscriptionId,
          customerId: subscriptionsSchema.customerId,
          productId: subscriptionsSchema.productId,
          priceId: subscriptionsSchema.priceId,
          status: subscriptionsSchema.status,
          currentPeriodStart: subscriptionsSchema.currentPeriodStart,
          currentPeriodEnd: subscriptionsSchema.currentPeriodEnd,
          cancelAtPeriodEnd: subscriptionsSchema.cancelAtPeriodEnd,
          canceledAt: subscriptionsSchema.canceledAt,
          endedAt: subscriptionsSchema.endedAt,
          trialStart: subscriptionsSchema.trialStart,
          trialEnd: subscriptionsSchema.trialEnd,
          metadata: subscriptionsSchema.metadata,
          createdAt: subscriptionsSchema.createdAt,
          updatedAt: subscriptionsSchema.updatedAt,
          planTitle: pricingPlansSchema.cardTitle,
        })
        .from(subscriptionsSchema)
        .leftJoin(
          pricingPlansSchema,
          eq(subscriptionsSchema.planId, pricingPlansSchema.id),
        )
        .where(eq(subscriptionsSchema.userId, userId))
        .orderBy(desc(subscriptionsSchema.createdAt))
        .limit(5),
      db
        .select({
          id: ordersSchema.id,
          userId: ordersSchema.userId,
          provider: ordersSchema.provider,
          providerOrderId: ordersSchema.providerOrderId,
          orderType: ordersSchema.orderType,
          status: ordersSchema.status,
          stripePaymentIntentId: ordersSchema.stripePaymentIntentId,
          stripeInvoiceId: ordersSchema.stripeInvoiceId,
          stripeChargeId: ordersSchema.stripeChargeId,
          subscriptionId: ordersSchema.subscriptionId,
          planId: ordersSchema.planId,
          productId: ordersSchema.productId,
          priceId: ordersSchema.priceId,
          amountSubtotal: ordersSchema.amountSubtotal,
          amountDiscount: ordersSchema.amountDiscount,
          amountTax: ordersSchema.amountTax,
          amountTotal: ordersSchema.amountTotal,
          currency: ordersSchema.currency,
          metadata: ordersSchema.metadata,
          createdAt: ordersSchema.createdAt,
          updatedAt: ordersSchema.updatedAt,
          planTitle: pricingPlansSchema.cardTitle,
        })
        .from(ordersSchema)
        .leftJoin(
          pricingPlansSchema,
          eq(ordersSchema.planId, pricingPlansSchema.id),
        )
        .where(eq(ordersSchema.userId, userId))
        .orderBy(desc(ordersSchema.createdAt))
        .limit(5),
      db
        .select({
          total: count(),
          succeeded: sql<number>`coalesce(sum(case when ${aiStudioGenerationsSchema.status} = 'succeeded' then 1 else 0 end), 0)::int`,
        })
        .from(aiStudioGenerationsSchema)
        .where(eq(aiStudioGenerationsSchema.userId, userId)),
      db
        .select({
          consumedCredits: sql<number>`coalesce(sum(${aiStudioGenerationsSchema.creditsCaptured}), 0)::int`,
        })
        .from(aiStudioGenerationsSchema)
        .where(eq(aiStudioGenerationsSchema.userId, userId)),
      db
        .select({
          purchasedCredits: sql<number>`coalesce(sum(${creditLogsSchema.amount}), 0)::int`,
        })
        .from(creditLogsSchema)
        .innerJoin(
          ordersSchema,
          eq(creditLogsSchema.relatedOrderId, ordersSchema.id),
        )
        .where(
          and(
            eq(creditLogsSchema.userId, userId),
            inArray(creditLogsSchema.type, [
              "one_time_purchase",
              "subscription_grant",
            ]),
            inArray(ordersSchema.status, ["succeeded", "active"]),
          ),
        ),
    ]);

    const generationStatsRow = generationStatsResults[0] ?? {
      total: 0,
      succeeded: 0,
    };
    const generationStats = {
      ...generationStatsRow,
      successRate:
        generationStatsRow.total > 0
          ? Math.round(
              (generationStatsRow.succeeded / generationStatsRow.total) * 100,
            )
          : 0,
    };
    const creditStats = {
      consumedCredits: consumedCreditResults[0]?.consumedCredits ?? 0,
      purchasedCredits: purchasedCreditResults[0]?.purchasedCredits ?? 0,
    };

    return actionResponse.success({
      user,
      buckets,
      subscriptions,
      orders,
      generationStats,
      creditStats,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    return actionResponse.error(getErrorMessage(error));
  }
}

export async function banUser({
  userId,
  reason,
}: {
  userId: string;
  reason?: string;
}): Promise<ActionResult> {
  if (!(await isAdmin())) {
    return actionResponse.forbidden("Admin privileges required.");
  }

  const db = getDb();

  try {
    const target = await db
      .select({ id: userSchema.id, role: userSchema.role })
      .from(userSchema)
      .where(eq(userSchema.id, userId))
      .limit(1);

    if (target.length === 0) {
      return actionResponse.notFound("User not found.");
    }

    if (target[0].role === "admin") {
      return actionResponse.forbidden("Cannot ban admin users.");
    }

    await db
      .update(userSchema)
      .set({
        banned: true,
        banReason: reason ?? "Banned by admin",
        banExpires: null,
      })
      .where(eq(userSchema.id, userId));

    // Revoke all sessions for this user to enforce immediate logout
    await db.delete(sessionSchema).where(eq(sessionSchema.userId, userId));

    return actionResponse.success();
  } catch (error: any) {
    return actionResponse.error(getErrorMessage(error));
  }
}

export async function unbanUser({
  userId,
}: {
  userId: string;
}): Promise<ActionResult> {
  if (!(await isAdmin())) {
    return actionResponse.forbidden("Admin privileges required.");
  }

  const db = getDb();

  try {
    const target = await db
      .select({ id: userSchema.id })
      .from(userSchema)
      .where(eq(userSchema.id, userId))
      .limit(1);

    if (target.length === 0) {
      return actionResponse.notFound("User not found.");
    }

    await db
      .update(userSchema)
      .set({ banned: false, banReason: null, banExpires: null })
      .where(eq(userSchema.id, userId));

    return actionResponse.success();
  } catch (error: any) {
    return actionResponse.error(getErrorMessage(error));
  }
}
