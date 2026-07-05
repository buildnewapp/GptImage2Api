'use server';

import { actionResponse, ActionResult } from '@/lib/action-response';
import { isAdmin } from '@/lib/auth/server';
import { getDb } from '@/lib/db';
import {
  aiStudioGenerations as aiStudioGenerationsSchema,
  creditLogs as creditLogsSchema,
  orders as ordersSchema,
  pricingPlans as pricingPlansSchema,
  taskRewardClaims as taskRewardClaimsSchema,
  usage as usageSchema,
  user as userSchema,
} from '@/lib/db/schema';
import { getErrorMessage } from '@/lib/error-utils';
import { ONE_TIME_ORDER_TYPES, SUBSCRIPTION_ORDER_TYPES } from '@/lib/payments/provider-utils';
import { and, count, eq, gte, inArray, lt, sql, type SQL } from 'drizzle-orm';

interface IStats {
  today: number;
  yesterday: number;
  growthRate: number;
  total?: number;
}

interface IOrderStats {
  count: IStats;
  revenue: IStats;
}

interface IOrderStatsResult {
  oneTime: { count: number; revenue: number };
  monthly: { count: number; revenue: number };
  yearly: { count: number; revenue: number };
}

export interface IOverviewStats {
  users: IStats;
  oneTimePayments: IOrderStats;
  monthlySubscriptions: IOrderStats;
  yearlySubscriptions: IOrderStats;
}

export interface IDailyGrowthStats {
  reportDate: string;
  newUsersCount: number;
  newOrdersCount: number;
}

export interface IDailyGenerationStats {
  reportDate: string;
  succeededCount: number;
  failedCount: number;
  consumedCredits: number;
}

export interface IGenerationModelCreditStats {
  modelId: string;
  modelTitle: string;
  generationCount: number;
  consumedCredits: number;
}

export interface IGenerationProviderStats {
  provider: string;
  totalCount: number;
  succeededCount: number;
  failedCount: number;
  consumedCredits: number;
}

export interface IGenerationBreakdownStats {
  models: IGenerationModelCreditStats[];
  providers: IGenerationProviderStats[];
}

export type IUserCreditReportPeriod = 'all' | '1d' | '7d' | '30d' | '90d';

export interface IUserCreditReportRow {
  userId: string;
  email: string | null;
  name: string | null;
  createdAt: string;
  purchasedCredits: number;
  consumedCredits: number;
  taskRewardCredits: number;
  taskRewardClaims: number;
  signupBonusCredits: number;
  referralBonusCredits: number;
  manualGrantCredits: number;
  freeCredits: number;
  currentCredits: number;
  generationCount: number;
  netCredits: number;
  freeToPurchasedRatio: number | null;
  riskLevel: 'high' | 'medium' | 'low';
}

function getUserCreditReportStartDate(
  period: IUserCreditReportPeriod,
): Date | null {
  const now = new Date();

  switch (period) {
    case '1d':
      return new Date(new Date().setDate(now.getDate() - 1));
    case '7d':
      return new Date(new Date().setDate(now.getDate() - 7));
    case '30d':
      return new Date(new Date().setDate(now.getDate() - 30));
    case '90d':
      return new Date(new Date().setDate(now.getDate() - 90));
    case 'all':
    default:
      return null;
  }
}

function calculateGrowthRate(today: number, yesterday: number): number {
  if (yesterday === 0) {
    return today > 0 ? Infinity : 0;
  }
  return ((today - yesterday) / yesterday) * 100;
}

export const getOverviewStats = async (): Promise<ActionResult<IOverviewStats>> => {
  if (!(await isAdmin())) {
    return actionResponse.forbidden('Admin privileges required.');
  }

  const db = getDb();

  try {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const yesterdayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1
    );

    // User stats
    const totalUsersResult = await db.select({ value: count() }).from(userSchema);
    const totalUsers = totalUsersResult[0].value;

    const todayUsersResult = await db
      .select({ value: count() })
      .from(userSchema)
      .where(gte(userSchema.createdAt, todayStart));
    const todayUsers = todayUsersResult[0].value;

    const yesterdayUsersResult = await db
      .select({ value: count() })
      .from(userSchema)
      .where(
        and(
          gte(userSchema.createdAt, yesterdayStart),
          lt(userSchema.createdAt, todayStart)
        )
      );
    const yesterdayUsers = yesterdayUsersResult[0].value;

    // Order stats
    const getOrderStatsForPeriod = async (
      startDate: Date,
      endDate: Date
    ): Promise<IOrderStatsResult> => {
      const result = await db
        .select({
          oneTimeCount:
            sql`COUNT(*) FILTER (WHERE ${ordersSchema.orderType} = 'one_time_purchase')`.mapWith(
              Number
            ),
          oneTimeRevenue:
            sql`COALESCE(SUM(${ordersSchema.amountTotal}) FILTER (WHERE ${ordersSchema.orderType} = 'one_time_purchase'), 0)`.mapWith(
              Number
            ),
          // Note: Must hardcode in SQL FILTER clause (can't use JS variables in SQL)
          // Order types: subscription_initial, subscription_renewal (Stripe), recurring (Creem)
          // Intervals: month (Stripe), every-month (Creem)
          monthlyCount:
            sql`COUNT(*) FILTER (WHERE ${ordersSchema.orderType} IN ('subscription_initial', 'subscription_renewal', 'recurring') AND ${pricingPlansSchema.recurringInterval} IN ('month', 'every-month'))`.mapWith(
              Number
            ),
          monthlyRevenue:
            sql`COALESCE(SUM(${ordersSchema.amountTotal}) FILTER (WHERE ${ordersSchema.orderType} IN ('subscription_initial', 'subscription_renewal', 'recurring') AND ${pricingPlansSchema.recurringInterval} IN ('month', 'every-month')), 0)`.mapWith(
              Number
            ),
          // Note: Must hardcode in SQL FILTER clause (can't use JS variables in SQL)
          // Order types: subscription_initial, subscription_renewal (Stripe), recurring (Creem)
          // Intervals: year (Stripe), every-year (Creem)
          yearlyCount:
            sql`COUNT(*) FILTER (WHERE ${ordersSchema.orderType} IN ('subscription_initial', 'subscription_renewal', 'recurring') AND ${pricingPlansSchema.recurringInterval} IN ('year', 'every-year'))`.mapWith(
              Number
            ),
          yearlyRevenue:
            sql`COALESCE(SUM(${ordersSchema.amountTotal}) FILTER (WHERE ${ordersSchema.orderType} IN ('subscription_initial', 'subscription_renewal', 'recurring') AND ${pricingPlansSchema.recurringInterval} IN ('year', 'every-year')), 0)`.mapWith(
              Number
            ),
        })
        .from(ordersSchema)
        .leftJoin(pricingPlansSchema, eq(ordersSchema.planId, pricingPlansSchema.id))
        .where(
          and(
            gte(ordersSchema.createdAt, startDate),
            lt(ordersSchema.createdAt, endDate),
            inArray(ordersSchema.status, ['succeeded', 'active'])
          )
        )

      const stats = result[0];
      return {
        oneTime: {
          count: stats.oneTimeCount,
          revenue: stats.oneTimeRevenue,
        },
        monthly: {
          count: stats.monthlyCount,
          revenue: stats.monthlyRevenue,
        },
        yearly: {
          count: stats.yearlyCount,
          revenue: stats.yearlyRevenue,
        },
      };
    };

    const todayOrderStats = await getOrderStatsForPeriod(todayStart, now);
    const yesterdayOrderStats = await getOrderStatsForPeriod(
      yesterdayStart,
      todayStart
    );

    const stats: IOverviewStats = {
      users: {
        today: todayUsers,
        yesterday: yesterdayUsers,
        growthRate: calculateGrowthRate(todayUsers, yesterdayUsers),
        total: totalUsers ?? 0,
      },
      oneTimePayments: {
        count: {
          today: todayOrderStats.oneTime.count,
          yesterday: yesterdayOrderStats.oneTime.count,
          growthRate: calculateGrowthRate(
            todayOrderStats.oneTime.count,
            yesterdayOrderStats.oneTime.count
          ),
        },
        revenue: {
          today: todayOrderStats.oneTime.revenue,
          yesterday: yesterdayOrderStats.oneTime.revenue,
          growthRate: calculateGrowthRate(
            todayOrderStats.oneTime.revenue,
            yesterdayOrderStats.oneTime.revenue
          ),
        },
      },
      monthlySubscriptions: {
        count: {
          today: todayOrderStats.monthly.count,
          yesterday: yesterdayOrderStats.monthly.count,
          growthRate: calculateGrowthRate(
            todayOrderStats.monthly.count,
            yesterdayOrderStats.monthly.count
          ),
        },
        revenue: {
          today: todayOrderStats.monthly.revenue,
          yesterday: yesterdayOrderStats.monthly.revenue,
          growthRate: calculateGrowthRate(
            todayOrderStats.monthly.revenue,
            yesterdayOrderStats.monthly.revenue
          ),
        },
      },
      yearlySubscriptions: {
        count: {
          today: todayOrderStats.yearly.count,
          yesterday: yesterdayOrderStats.yearly.count,
          growthRate: calculateGrowthRate(
            todayOrderStats.yearly.count,
            yesterdayOrderStats.yearly.count
          ),
        },
        revenue: {
          today: todayOrderStats.yearly.revenue,
          yesterday: yesterdayOrderStats.yearly.revenue,
          growthRate: calculateGrowthRate(
            todayOrderStats.yearly.revenue,
            yesterdayOrderStats.yearly.revenue
          ),
        },
      },
    };
    return actionResponse.success(stats);
  } catch (error) {
    return actionResponse.error(getErrorMessage(error));
  }
};

export const getDailyGrowthStats = async (
  period: '1d' | '7d' | '30d' | '90d'
): Promise<ActionResult<IDailyGrowthStats[]>> => {
  if (!(await isAdmin())) {
    return actionResponse.forbidden('Admin privileges required.');
  }

  const db = getDb();

  try {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '1d':
        startDate = new Date(new Date().setDate(now.getDate() - 1));
        break;
      case '7d':
        startDate = new Date(new Date().setDate(now.getDate() - 7));
        break;
      case '30d':
        startDate = new Date(new Date().setMonth(now.getMonth() - 1));
        break;
      case '90d':
        startDate = new Date(new Date().setMonth(now.getMonth() - 3));
        break;
      default:
        throw new Error('Invalid period specified.');
    }

    const userDateTrunc = sql`date_trunc('day', ${userSchema.createdAt})`

    const dailyUsers = await db
      .select({
        date: userDateTrunc,
        count: count(userSchema.id),
      })
      .from(userSchema)
      .where(gte(userSchema.createdAt, startDate))
      .groupBy(userDateTrunc)

    const orderDateTrunc = sql`date_trunc('day', ${ordersSchema.createdAt})`

    const dailyOrders = await db
      .select({
        date: orderDateTrunc,
        count: count(ordersSchema.id),
      })
      .from(ordersSchema)
      .where(
        and(
          gte(ordersSchema.createdAt, startDate),
          inArray(ordersSchema.status, ['succeeded', 'active']),
          inArray(ordersSchema.orderType, [
            ...ONE_TIME_ORDER_TYPES,
            ...SUBSCRIPTION_ORDER_TYPES,
          ])
        )
      )
      .groupBy(orderDateTrunc)

    const dailyUsersMap = new Map(
      dailyUsers.map((r) => {
        let dateStr: string;
        if (r.date instanceof Date) {
          dateStr = r.date.toISOString().split('T')[0];
        } else {
          dateStr = new Date(r.date as string).toISOString().split('T')[0];
        }
        return [dateStr, r.count];
      })
    );
    const dailyOrdersMap = new Map(
      dailyOrders.map((r) => {
        let dateStr: string;
        if (r.date instanceof Date) {
          dateStr = r.date.toISOString().split('T')[0];
        } else {
          dateStr = new Date(r.date as string).toISOString().split('T')[0];
        }
        return [dateStr, r.count];
      })
    );

    const result: IDailyGrowthStats[] = [];
    const currentDate = new Date(startDate);
    while (currentDate <= now) {
      const dateStr = currentDate.toISOString().split('T')[0];
      result.push({
        reportDate: dateStr,
        newUsersCount: dailyUsersMap.get(dateStr) || 0,
        newOrdersCount: dailyOrdersMap.get(dateStr) || 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return actionResponse.success(result);
  } catch (error) {
    return actionResponse.error(getErrorMessage(error));
  }
};

export const getDailyGenerationStats = async (
  period: '1d' | '7d' | '30d' | '90d'
): Promise<ActionResult<IDailyGenerationStats[]>> => {
  if (!(await isAdmin())) {
    return actionResponse.forbidden('Admin privileges required.');
  }

  const db = getDb();

  try {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '1d':
        startDate = new Date(new Date().setDate(now.getDate() - 1));
        break;
      case '7d':
        startDate = new Date(new Date().setDate(now.getDate() - 7));
        break;
      case '30d':
        startDate = new Date(new Date().setMonth(now.getMonth() - 1));
        break;
      case '90d':
        startDate = new Date(new Date().setMonth(now.getMonth() - 3));
        break;
      default:
        throw new Error('Invalid period specified.');
    }

    const generationDateTrunc = sql`date_trunc('day', ${aiStudioGenerationsSchema.createdAt})`;

    const dailyGenerations = await db
      .select({
        date: generationDateTrunc,
        succeededCount:
          sql<number>`coalesce(sum(case when ${aiStudioGenerationsSchema.status} = 'succeeded' then 1 else 0 end), 0)::int`,
        failedCount:
          sql<number>`coalesce(sum(case when ${aiStudioGenerationsSchema.status} = 'failed' then 1 else 0 end), 0)::int`,
        consumedCredits:
          sql<number>`coalesce(sum(${aiStudioGenerationsSchema.creditsCaptured}), 0)::int`,
      })
      .from(aiStudioGenerationsSchema)
      .where(gte(aiStudioGenerationsSchema.createdAt, startDate))
      .groupBy(generationDateTrunc);

    const dailyGenerationsMap = new Map(
      dailyGenerations.map((r) => {
        let dateStr: string;
        if (r.date instanceof Date) {
          dateStr = r.date.toISOString().split('T')[0];
        } else {
          dateStr = new Date(r.date as string).toISOString().split('T')[0];
        }
        return [
          dateStr,
          {
            succeededCount: r.succeededCount,
            failedCount: r.failedCount,
            consumedCredits: r.consumedCredits,
          },
        ];
      })
    );

    const result: IDailyGenerationStats[] = [];
    const currentDate = new Date(startDate);
    while (currentDate <= now) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const stats = dailyGenerationsMap.get(dateStr);
      result.push({
        reportDate: dateStr,
        succeededCount: stats?.succeededCount ?? 0,
        failedCount: stats?.failedCount ?? 0,
        consumedCredits: stats?.consumedCredits ?? 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return actionResponse.success(result);
  } catch (error) {
    return actionResponse.error(getErrorMessage(error));
  }
};

export const getGenerationBreakdownStats = async (
  period: '1d' | '7d' | '30d' | '90d'
): Promise<ActionResult<IGenerationBreakdownStats>> => {
  if (!(await isAdmin())) {
    return actionResponse.forbidden('Admin privileges required.');
  }

  const db = getDb();

  try {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '1d':
        startDate = new Date(new Date().setDate(now.getDate() - 1));
        break;
      case '7d':
        startDate = new Date(new Date().setDate(now.getDate() - 7));
        break;
      case '30d':
        startDate = new Date(new Date().setMonth(now.getMonth() - 1));
        break;
      case '90d':
        startDate = new Date(new Date().setMonth(now.getMonth() - 3));
        break;
      default:
        throw new Error('Invalid period specified.');
    }

    const [models, providers] = await Promise.all([
      db
        .select({
          modelId: aiStudioGenerationsSchema.catalogModelId,
          modelTitle: sql<string>`max(${aiStudioGenerationsSchema.titleSnapshot})`,
          generationCount: count(aiStudioGenerationsSchema.id),
          consumedCredits:
            sql<number>`coalesce(sum(${aiStudioGenerationsSchema.creditsCaptured}), 0)::int`,
        })
        .from(aiStudioGenerationsSchema)
        .where(gte(aiStudioGenerationsSchema.createdAt, startDate))
        .groupBy(aiStudioGenerationsSchema.catalogModelId)
        .orderBy(sql`coalesce(sum(${aiStudioGenerationsSchema.creditsCaptured}), 0) desc`)
        .limit(10),
      db
        .select({
          provider: aiStudioGenerationsSchema.providerSnapshot,
          totalCount: count(aiStudioGenerationsSchema.id),
          succeededCount:
            sql<number>`coalesce(sum(case when ${aiStudioGenerationsSchema.status} = 'succeeded' then 1 else 0 end), 0)::int`,
          failedCount:
            sql<number>`coalesce(sum(case when ${aiStudioGenerationsSchema.status} = 'failed' then 1 else 0 end), 0)::int`,
          consumedCredits:
            sql<number>`coalesce(sum(${aiStudioGenerationsSchema.creditsCaptured}), 0)::int`,
        })
        .from(aiStudioGenerationsSchema)
        .where(gte(aiStudioGenerationsSchema.createdAt, startDate))
        .groupBy(aiStudioGenerationsSchema.providerSnapshot)
        .orderBy(sql`coalesce(sum(${aiStudioGenerationsSchema.creditsCaptured}), 0) desc`)
        .limit(10),
    ]);

    return actionResponse.success({ models, providers });
  } catch (error) {
    return actionResponse.error(getErrorMessage(error));
  }
};

export const getUserCreditReport = async (
  period: IUserCreditReportPeriod = 'all',
): Promise<
  ActionResult<IUserCreditReportRow[]>
> => {
  if (!(await isAdmin())) {
    return actionResponse.forbidden('Admin privileges required.');
  }

  const db = getDb();

  try {
    const startDate = getUserCreditReportStartDate(period);
    const purchasedConditions: SQL[] = [
      inArray(creditLogsSchema.type, [
        'one_time_purchase',
        'subscription_grant',
      ]),
      inArray(ordersSchema.status, ['succeeded', 'active']),
    ];
    const freeCreditConditions: SQL[] = [
      inArray(creditLogsSchema.type, [
        'task_reward',
        'welcome_bonus',
        'referral_signup_bonus',
        'manual_one_time_grant',
        'manual_subscription_grant',
      ]),
    ];
    const creditUsageConditions: SQL[] = [
      inArray(creditLogsSchema.type, [
        'ai_studio_chat_usage',
        'feature_usage',
        'video_generation',
      ]),
    ];

    if (startDate) {
      purchasedConditions.push(gte(creditLogsSchema.createdAt, startDate));
      freeCreditConditions.push(gte(creditLogsSchema.createdAt, startDate));
      creditUsageConditions.push(gte(creditLogsSchema.createdAt, startDate));
    }

    const [
      purchasedRows,
      freeCreditRows,
      generationUsageRows,
      creditUsageRows,
      taskClaimRows,
    ] = await Promise.all([
      db
        .select({
          userId: creditLogsSchema.userId,
          purchasedCredits:
            sql<number>`coalesce(sum(${creditLogsSchema.amount}), 0)::int`,
        })
        .from(creditLogsSchema)
        .innerJoin(ordersSchema, eq(creditLogsSchema.relatedOrderId, ordersSchema.id))
        .where(and(...purchasedConditions))
        .groupBy(creditLogsSchema.userId),
      db
        .select({
          userId: creditLogsSchema.userId,
          taskRewardCredits:
            sql<number>`coalesce(sum(${creditLogsSchema.amount}) filter (where ${creditLogsSchema.type} = 'task_reward'), 0)::int`,
          signupBonusCredits:
            sql<number>`coalesce(sum(${creditLogsSchema.amount}) filter (where ${creditLogsSchema.type} = 'welcome_bonus'), 0)::int`,
          referralBonusCredits:
            sql<number>`coalesce(sum(${creditLogsSchema.amount}) filter (where ${creditLogsSchema.type} = 'referral_signup_bonus'), 0)::int`,
          manualGrantCredits:
            sql<number>`coalesce(sum(${creditLogsSchema.amount}) filter (where ${creditLogsSchema.type} in ('manual_one_time_grant', 'manual_subscription_grant')), 0)::int`,
          freeCredits:
            sql<number>`coalesce(sum(${creditLogsSchema.amount}), 0)::int`,
        })
        .from(creditLogsSchema)
        .where(and(...freeCreditConditions))
        .groupBy(creditLogsSchema.userId),
      db
        .select({
          userId: aiStudioGenerationsSchema.userId,
          consumedCredits:
            sql<number>`coalesce(sum(${aiStudioGenerationsSchema.creditsCaptured}), 0)::int`,
          generationCount: count(aiStudioGenerationsSchema.id),
        })
        .from(aiStudioGenerationsSchema)
        .where(
          startDate ? gte(aiStudioGenerationsSchema.createdAt, startDate) : undefined,
        )
        .groupBy(aiStudioGenerationsSchema.userId),
      db
        .select({
          userId: creditLogsSchema.userId,
          consumedCredits:
            sql<number>`coalesce(sum(abs(${creditLogsSchema.amount})), 0)::int`,
        })
        .from(creditLogsSchema)
        .where(
          and(...creditUsageConditions),
        )
        .groupBy(creditLogsSchema.userId),
      db
        .select({
          userId: taskRewardClaimsSchema.userId,
          taskRewardClaims: count(taskRewardClaimsSchema.id),
        })
        .from(taskRewardClaimsSchema)
        .where(
          startDate ? gte(taskRewardClaimsSchema.claimedAt, startDate) : undefined,
        )
        .groupBy(taskRewardClaimsSchema.userId),
    ]);

    const userIds = new Set<string>();
    [
      purchasedRows,
      freeCreditRows,
      generationUsageRows,
      creditUsageRows,
      taskClaimRows,
    ].forEach((rows) => rows.forEach((row) => userIds.add(row.userId)));

    if (userIds.size === 0) {
      return actionResponse.success([]);
    }

    const userRows = await db
      .select({
        id: userSchema.id,
        email: userSchema.email,
        name: userSchema.name,
        createdAt: userSchema.createdAt,
        oneTimeCreditsBalance: usageSchema.oneTimeCreditsBalance,
        subscriptionCreditsBalance: usageSchema.subscriptionCreditsBalance,
      })
      .from(userSchema)
      .leftJoin(usageSchema, eq(userSchema.id, usageSchema.userId))
      .where(inArray(userSchema.id, Array.from(userIds)));

    const purchasedMap = new Map(
      purchasedRows.map((row) => [row.userId, row.purchasedCredits]),
    );
    const freeMap = new Map(freeCreditRows.map((row) => [row.userId, row]));
    const generationUsageMap = new Map(
      generationUsageRows.map((row) => [row.userId, row]),
    );
    const creditUsageMap = new Map(
      creditUsageRows.map((row) => [row.userId, row.consumedCredits]),
    );
    const taskClaimMap = new Map(
      taskClaimRows.map((row) => [row.userId, row.taskRewardClaims]),
    );

    const rows = userRows.map((user) => {
      const purchasedCredits = purchasedMap.get(user.id) ?? 0;
      const freeStats = freeMap.get(user.id);
      const generationUsage = generationUsageMap.get(user.id);
      const consumedCredits =
        (generationUsage?.consumedCredits ?? 0) +
        (creditUsageMap.get(user.id) ?? 0);
      const taskRewardCredits = freeStats?.taskRewardCredits ?? 0;
      const signupBonusCredits = freeStats?.signupBonusCredits ?? 0;
      const referralBonusCredits = freeStats?.referralBonusCredits ?? 0;
      const manualGrantCredits = freeStats?.manualGrantCredits ?? 0;
      const freeCredits = freeStats?.freeCredits ?? 0;
      const currentCredits =
        (user.oneTimeCreditsBalance ?? 0) +
        (user.subscriptionCreditsBalance ?? 0);
      const netCredits = purchasedCredits + freeCredits - consumedCredits;
      const freeToPurchasedRatio =
        purchasedCredits > 0
          ? Number((freeCredits / purchasedCredits).toFixed(2))
          : freeCredits > 0
            ? null
            : 0;
      const riskLevel =
        freeCredits >= 100 && purchasedCredits === 0
          ? 'high'
          : taskRewardCredits >= 50 && purchasedCredits === 0
            ? 'high'
            : freeCredits >= 50 && consumedCredits < freeCredits * 0.25
              ? 'medium'
              : taskRewardCredits >= 20 && purchasedCredits === 0
                ? 'medium'
                : 'low';

      return {
        userId: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
        purchasedCredits,
        consumedCredits,
        taskRewardCredits,
        taskRewardClaims: taskClaimMap.get(user.id) ?? 0,
        signupBonusCredits,
        referralBonusCredits,
        manualGrantCredits,
        freeCredits,
        currentCredits,
        generationCount: generationUsage?.generationCount ?? 0,
        netCredits,
        freeToPurchasedRatio,
        riskLevel,
      } satisfies IUserCreditReportRow;
    });

    rows.sort((a, b) => {
      const riskRank = { high: 3, medium: 2, low: 1 };
      return (
        riskRank[b.riskLevel] - riskRank[a.riskLevel] ||
        b.freeCredits - a.freeCredits ||
        b.taskRewardCredits - a.taskRewardCredits ||
        b.netCredits - a.netCredits
      );
    });

    return actionResponse.success(rows.slice(0, 50));
  } catch (error) {
    return actionResponse.error(getErrorMessage(error));
  }
};
