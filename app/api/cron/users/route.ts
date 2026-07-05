import { siteConfig } from "@/config/site";
import { apiResponse } from "@/lib/api-response";
import { assertCronPassword } from "@/lib/cron/auth";
import { getDb } from "@/lib/db";
import {
  aiStudioGenerations as aiStudioGenerationsSchema,
  orders as ordersSchema,
  user as userSchema,
} from "@/lib/db/schema";
import { sql } from "drizzle-orm";

/**
 curl -X GET "http://localhost:3000/api/cron/users" \
 -H "Authorization: Bearer cron_pwd"

 curl -X GET "http://localhost:3000/api/cron/users?pwd=cron_pwd"

 curl -X GET "http://localhost:3000/api/cron/users?m=show" \
 -H "Authorization: Bearer cron_pwd"
 */

export const dynamic = "force-dynamic";

type UserCronWindowStats = {
  users: number;
  paidOrders: number;
  generations: {
    total: number;
    succeeded: number;
    failed: number;
  };
};

type UserCronResult = {
  checkedAt: string;
  durationMs: number;
  last1Day: UserCronWindowStats;
  last7Days: UserCronWindowStats;
  changes: UserCronChange[];
};

type UserCronChange = {
  label: string;
  previous: number | null;
  current: number;
};

const globalState = globalThis as typeof globalThis & {
  __cronUsersLastResult?: UserCronResult;
};

function toNumber(value: unknown) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function buildWindowStats(row: Record<string, unknown>, prefix: string): UserCronWindowStats {
  return {
    users: toNumber(row[`${prefix}Users`]),
    paidOrders: toNumber(row[`${prefix}PaidOrders`]),
    generations: {
      total: toNumber(row[`${prefix}GenerationsTotal`]),
      succeeded: toNumber(row[`${prefix}GenerationsSucceeded`]),
      failed: toNumber(row[`${prefix}GenerationsFailed`]),
    },
  };
}

function collectStatsChanges(previous: UserCronResult | undefined, current: Omit<UserCronResult, "changes">) {
  const checks: Array<[string, number | null, number]> = [
    ["最近 1 天注册用户", previous?.last1Day.users ?? null, current.last1Day.users],
    ["最近 1 天付费订单", previous?.last1Day.paidOrders ?? null, current.last1Day.paidOrders],
    ["最近 1 天生成总数", previous?.last1Day.generations.total ?? null, current.last1Day.generations.total],
    ["最近 1 天生成成功", previous?.last1Day.generations.succeeded ?? null, current.last1Day.generations.succeeded],
    ["最近 1 天生成失败", previous?.last1Day.generations.failed ?? null, current.last1Day.generations.failed],
    ["最近 7 天注册用户", previous?.last7Days.users ?? null, current.last7Days.users],
    ["最近 7 天付费订单", previous?.last7Days.paidOrders ?? null, current.last7Days.paidOrders],
    ["最近 7 天生成总数", previous?.last7Days.generations.total ?? null, current.last7Days.generations.total],
    ["最近 7 天生成成功", previous?.last7Days.generations.succeeded ?? null, current.last7Days.generations.succeeded],
    ["最近 7 天生成失败", previous?.last7Days.generations.failed ?? null, current.last7Days.generations.failed],
  ];

  return checks
    .filter(([, previousValue, currentValue]) => previousValue === null || previousValue !== currentValue)
    .map(([label, previousValue, currentValue]) => ({
      label,
      previous: previousValue,
      current: currentValue,
    }));
}

function formatShanghaiTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
}

async function sendWeComStatsChange(result: UserCronResult) {
  if (result.changes.length === 0) {
    return;
  }

  const webhookKey = process.env.WECOM_MSG_WEBHOOK_KEY || process.env.WECOM_WARN_WEBHOOK_KEY;
  if (!webhookKey) {
    console.error("WECOM_MSG_WEBHOOK_KEY or WECOM_WARN_WEBHOOK_KEY is not configured");
    return;
  }

  const content = [
    `${siteConfig.name} 用户数据变动通知`,
    `时间: ${formatShanghaiTime(result.checkedAt)}`,
    ...result.changes.map((change) => `${change.label}: ${change.previous ?? "无"} -> ${change.current}`),
    `最近 1 天: 用户 ${result.last1Day.users}, 付费 ${result.last1Day.paidOrders}, 生成 ${result.last1Day.generations.total}/${result.last1Day.generations.succeeded}/${result.last1Day.generations.failed}`,
    `最近 7 天: 用户 ${result.last7Days.users}, 付费 ${result.last7Days.paidOrders}, 生成 ${result.last7Days.generations.total}/${result.last7Days.generations.succeeded}/${result.last7Days.generations.failed}`,
  ].join("\n");

  const response = await fetch(
    `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${webhookKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        msgtype: "text",
        text: {
          content,
        },
      }),
    },
  );
  const body = await response.json().catch(() => ({}));

  if (!response.ok || body?.errcode !== 0) {
    console.error("send wecom users stats change failed:", body);
  }
}

async function runUsersStats(): Promise<UserCronResult> {
  const startTime = Date.now();
  const db = getDb();
  const now = new Date();
  const previousResult = globalState.__cronUsersLastResult;

  const [usersRow, ordersRow, generationsRow] = await Promise.all([
    db
      .select({
        last1DayUsers: sql<number>`count(*) filter (where ${userSchema.createdAt} >= now() - interval '1 day')::int`,
        last7DaysUsers: sql<number>`count(*)::int`,
      })
      .from(userSchema)
      .where(sql`${userSchema.createdAt} >= now() - interval '7 days'`),
    db
      .select({
        last1DayPaidOrders: sql<number>`count(*) filter (where ${ordersSchema.createdAt} >= now() - interval '1 day')::int`,
        last7DaysPaidOrders: sql<number>`count(*)::int`,
      })
      .from(ordersSchema)
      .where(sql`
        ${ordersSchema.createdAt} >= now() - interval '7 days'
        and ${ordersSchema.status} in ('succeeded', 'active')
      `),
    db
      .select({
        last1DayGenerationsTotal: sql<number>`count(*) filter (where ${aiStudioGenerationsSchema.createdAt} >= now() - interval '1 day')::int`,
        last1DayGenerationsSucceeded: sql<number>`count(*) filter (where ${aiStudioGenerationsSchema.createdAt} >= now() - interval '1 day' and ${aiStudioGenerationsSchema.status} = 'succeeded')::int`,
        last1DayGenerationsFailed: sql<number>`count(*) filter (where ${aiStudioGenerationsSchema.createdAt} >= now() - interval '1 day' and ${aiStudioGenerationsSchema.status} = 'failed')::int`,
        last7DaysGenerationsTotal: sql<number>`count(*)::int`,
        last7DaysGenerationsSucceeded: sql<number>`count(*) filter (where ${aiStudioGenerationsSchema.status} = 'succeeded')::int`,
        last7DaysGenerationsFailed: sql<number>`count(*) filter (where ${aiStudioGenerationsSchema.status} = 'failed')::int`,
      })
      .from(aiStudioGenerationsSchema)
      .where(sql`${aiStudioGenerationsSchema.createdAt} >= now() - interval '7 days'`),
  ]);

  const row = {
    ...(usersRow[0] ?? {}),
    ...(ordersRow[0] ?? {}),
    ...(generationsRow[0] ?? {}),
  };
  const baseResult: Omit<UserCronResult, "changes"> = {
    checkedAt: now.toISOString(),
    durationMs: Date.now() - startTime,
    last1Day: buildWindowStats(row, "last1Day"),
    last7Days: buildWindowStats(row, "last7Days"),
  };
  const result: UserCronResult = {
    ...baseResult,
    changes: collectStatsChanges(previousResult, baseResult),
  };

  globalState.__cronUsersLastResult = result;
  await sendWeComStatsChange(result);

  return result;
}

export async function GET(request: Request) {
  const authError = assertCronPassword(request);
  if (authError) {
    return authError;
  }

  const { searchParams } = new URL(request.url);

  if (searchParams.has("show") || searchParams.get("m") === "show") {
    return apiResponse.success({
      result: globalState.__cronUsersLastResult ?? null,
    });
  }

  try {
    const result = await runUsersStats();
    return apiResponse.success(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return apiResponse.serverError(`cron users failed: ${message}`);
  }
}
