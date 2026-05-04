import { apiResponse } from "@/lib/api-response";
import { assertCronAdminApiKey } from "@/lib/cron/auth";
import { getDb } from "@/lib/db";
import {
  aiStudioGenerations as aiStudioGenerationsSchema,
  orders as ordersSchema,
  user as userSchema,
} from "@/lib/db/schema";
import { sql } from "drizzle-orm";

/**
 curl -X GET "http://localhost:3000/api/cron/users" \
 -H "Authorization: Bearer sk_xxx"

 curl -X GET "http://localhost:3000/api/cron/users?key=sk_xxx"

 curl -X GET "http://localhost:3000/api/cron/users?m=show" \
 -H "Authorization: Bearer sk_xxx"
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

async function runUsersStats(): Promise<UserCronResult> {
  const startTime = Date.now();
  const db = getDb();
  const now = new Date();

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
  const result: UserCronResult = {
    checkedAt: now.toISOString(),
    durationMs: Date.now() - startTime,
    last1Day: buildWindowStats(row, "last1Day"),
    last7Days: buildWindowStats(row, "last7Days"),
  };

  globalState.__cronUsersLastResult = result;

  return result;
}

export async function GET(request: Request) {
  const authError = await assertCronAdminApiKey(request);
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
