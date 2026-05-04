"use server";

import type { ActionResult } from "@/lib/action-response";
import { actionResponse } from "@/lib/action-response";
import { isAdmin } from "@/lib/auth/server";
import { getDb } from "@/lib/db";
import {
  getManualOrderTypeForPlan,
  isRecurringManualBenefitPlan,
} from "@/lib/admin/dashboard-users";
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
import { randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, gt, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";

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
  manualBenefitPlans: AdminManualBenefitPlan[];
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

export type AdminManualBenefitPlan = {
  id: string;
  cardTitle: string;
  provider: string | null;
  paymentType: string | null;
  recurringInterval: string | null;
  price: string | null;
  currency: string | null;
  displayPrice: string | null;
  benefitsJsonb: unknown;
};

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
      manualBenefitPlans,
      buckets,
      subscriptions,
      orders,
      generationStatsResults,
      consumedCreditResults,
      purchasedCreditResults,
    ] = await Promise.all([
      db
        .select({
          id: pricingPlansSchema.id,
          cardTitle: pricingPlansSchema.cardTitle,
          provider: pricingPlansSchema.provider,
          paymentType: pricingPlansSchema.paymentType,
          recurringInterval: pricingPlansSchema.recurringInterval,
          price: pricingPlansSchema.price,
          currency: pricingPlansSchema.currency,
          displayPrice: pricingPlansSchema.displayPrice,
          benefitsJsonb: pricingPlansSchema.benefitsJsonb,
        })
        .from(pricingPlansSchema)
        .where(
          and(
            eq(pricingPlansSchema.isActive, true),
            eq(pricingPlansSchema.environment, "live"),
          ),
        )
        .orderBy(
          asc(pricingPlansSchema.environment),
          asc(pricingPlansSchema.displayOrder),
          asc(pricingPlansSchema.cardTitle),
        ),
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
      manualBenefitPlans,
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

const ManualGrantSchema = z.object({
  userId: z.string().uuid(),
  planId: z.string().uuid().nullable().optional(),
  subscriptionPeriodEnd: z.string().nullable().optional(),
  creditType: z.enum(["none", "one_time", "subscription"]),
  creditAmount: z.coerce.number().int().min(0).default(0),
  creditExpiresAt: z.string().nullable().optional(),
  notes: z.string().trim().max(500).optional(),
});

function parseManualDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getManualPlanPriceValue(value: string | null | undefined) {
  return value && Number.isFinite(Number(value)) ? value : "0";
}

export async function grantManualUserBenefits(
  input: z.infer<typeof ManualGrantSchema>,
): Promise<ActionResult<{ orderId: string | null; subscriptionId: string | null }>> {
  if (!(await isAdmin())) {
    return actionResponse.forbidden("Admin privileges required.");
  }

  const parsed = ManualGrantSchema.safeParse(input);
  if (!parsed.success) {
    return actionResponse.badRequest(parsed.error.issues[0]?.message || "Invalid input.");
  }

  const {
    userId,
    planId,
    subscriptionPeriodEnd,
    creditType,
    creditAmount,
    creditExpiresAt,
    notes,
  } = parsed.data;

  if (!planId && creditType === "none") {
    return actionResponse.badRequest("请选择产品或填写积分调整。");
  }

  if (creditType !== "none" && creditAmount <= 0) {
    return actionResponse.badRequest("积分数量必须大于 0。");
  }

  const now = new Date();
  const db = getDb();

  try {
    const [targetUser] = await db
      .select({ id: userSchema.id })
      .from(userSchema)
      .where(eq(userSchema.id, userId))
      .limit(1);

    if (!targetUser) {
      return actionResponse.notFound("User not found.");
    }

    const planRows = planId
      ? await db
          .select()
          .from(pricingPlansSchema)
          .where(eq(pricingPlansSchema.id, planId))
          .limit(1)
      : [];
    const plan = planRows[0] ?? null;

    if (planId && !plan) {
      return actionResponse.notFound("Pricing plan not found.");
    }

    const shouldCreateSubscription = plan
      ? isRecurringManualBenefitPlan(plan)
      : false;
    const periodEnd = shouldCreateSubscription
      ? parseManualDate(subscriptionPeriodEnd)
      : null;

    if (shouldCreateSubscription && (!periodEnd || periodEnd <= now)) {
      return actionResponse.badRequest("会员结束时间必须晚于当前时间。");
    }

    const subscriptionCreditEnd =
      creditType === "subscription" ? parseManualDate(creditExpiresAt) : null;
    if (creditType === "subscription" && (!subscriptionCreditEnd || subscriptionCreditEnd <= now)) {
      return actionResponse.badRequest("订阅积分结束时间必须晚于当前时间。");
    }

    const manualId = randomUUID();
    let createdOrderId: string | null = null;
    let createdSubscriptionId: string | null = null;

    await db.transaction(async (tx) => {
      if (plan) {
        const orderType = getManualOrderTypeForPlan(plan);
        const manualSubscriptionId = shouldCreateSubscription
          ? `manual:${manualId}:subscription`
          : null;

        const [insertedOrder] = await tx
          .insert(ordersSchema)
          .values({
            userId,
            provider: "manual",
            providerOrderId: `manual:${manualId}:order`,
            orderType,
            status: shouldCreateSubscription ? "active" : "succeeded",
            subscriptionId: manualSubscriptionId,
            planId: plan.id,
            productId: plan.stripeProductId ?? plan.creemProductId ?? null,
            priceId: plan.stripePriceId ?? null,
            amountSubtotal: getManualPlanPriceValue(plan.price),
            amountDiscount: "0",
            amountTax: "0",
            amountTotal: getManualPlanPriceValue(plan.price),
            currency: plan.currency ?? "USD",
            metadata: {
              source: "manual_admin_grant",
              notes: notes || null,
              paymentType: plan.paymentType,
              recurringInterval: plan.recurringInterval,
            },
          })
          .returning({ id: ordersSchema.id });

        createdOrderId = insertedOrder?.id ?? null;

        if (shouldCreateSubscription && periodEnd && manualSubscriptionId) {
          await tx.insert(subscriptionsSchema).values({
            userId,
            planId: plan.id,
            provider: "none",
            subscriptionId: manualSubscriptionId,
            customerId: `manual:${userId}`,
            productId: plan.stripeProductId ?? plan.creemProductId ?? null,
            priceId: plan.stripePriceId ?? null,
            status: "active",
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
            metadata: {
              source: "manual_admin_grant",
              relatedOrderId: createdOrderId,
              notes: notes || null,
            },
          });
          createdSubscriptionId = manualSubscriptionId;
        }
      }

      if (creditType === "one_time" && creditAmount > 0) {
        const updatedUsage = await tx
          .insert(usageSchema)
          .values({
            userId,
            oneTimeCreditsBalance: creditAmount,
          })
          .onConflictDoUpdate({
            target: usageSchema.userId,
            set: {
              oneTimeCreditsBalance: sql`${usageSchema.oneTimeCreditsBalance} + ${creditAmount}`,
            },
          })
          .returning({
            oneTimeCreditsSnapshot: usageSchema.oneTimeCreditsBalance,
            subscriptionCreditsSnapshot: usageSchema.subscriptionCreditsBalance,
          });

        const balances = updatedUsage[0];
        if (!balances) {
          throw new Error("Failed to update one-time credits.");
        }

        await tx.insert(creditLogsSchema).values({
          userId,
          amount: creditAmount,
          oneTimeCreditsSnapshot: balances.oneTimeCreditsSnapshot,
          subscriptionCreditsSnapshot: balances.subscriptionCreditsSnapshot,
          type: "manual_one_time_grant",
          notes: notes || "Manual one-time credit grant",
          relatedOrderId: createdOrderId,
        });
      }

      if (creditType === "subscription" && creditAmount > 0 && subscriptionCreditEnd) {
        const creditSubscriptionId =
          createdSubscriptionId ?? `manual:${manualId}:credits`;

        await tx.insert(subscriptionCreditBucketsSchema).values({
          userId,
          provider: "none",
          subscriptionId: creditSubscriptionId,
          periodStart: now,
          periodEnd: subscriptionCreditEnd,
          expiresAt: subscriptionCreditEnd,
          creditsTotal: creditAmount,
          creditsRemaining: creditAmount,
          relatedOrderId: createdOrderId,
        });

        const activeSubRows = await tx
          .select({
            balance: sql<number>`coalesce(sum(${subscriptionCreditBucketsSchema.creditsRemaining}), 0)`,
          })
          .from(subscriptionCreditBucketsSchema)
          .where(
            and(
              eq(subscriptionCreditBucketsSchema.userId, userId),
              gt(subscriptionCreditBucketsSchema.creditsRemaining, 0),
              gt(subscriptionCreditBucketsSchema.expiresAt, now),
            ),
          );
        const nextSubscriptionBalance = Number(activeSubRows[0]?.balance ?? 0);

        const updatedUsage = await tx
          .insert(usageSchema)
          .values({
            userId,
            oneTimeCreditsBalance: 0,
            subscriptionCreditsBalance: nextSubscriptionBalance,
          })
          .onConflictDoUpdate({
            target: usageSchema.userId,
            set: {
              subscriptionCreditsBalance: nextSubscriptionBalance,
            },
          })
          .returning({
            oneTimeCreditsSnapshot: usageSchema.oneTimeCreditsBalance,
            subscriptionCreditsSnapshot: usageSchema.subscriptionCreditsBalance,
          });

        const balances = updatedUsage[0];
        if (!balances) {
          throw new Error("Failed to update subscription credits.");
        }

        await tx.insert(creditLogsSchema).values({
          userId,
          amount: creditAmount,
          oneTimeCreditsSnapshot: balances.oneTimeCreditsSnapshot,
          subscriptionCreditsSnapshot: balances.subscriptionCreditsSnapshot,
          type: "manual_subscription_grant",
          notes: notes || "Manual subscription credit grant",
          relatedOrderId: createdOrderId,
        });
      }
    });

    return actionResponse.success({
      orderId: createdOrderId,
      subscriptionId: createdSubscriptionId,
    });
  } catch (error) {
    console.error("Error granting manual user benefits:", error);
    return actionResponse.error(getErrorMessage(error));
  }
}
