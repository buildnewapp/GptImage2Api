"use server";

import { actionResponse, type ActionResult } from "@/lib/action-response";
import { isAdmin } from "@/lib/auth/server";
import { getDb } from "@/lib/db";
import {
  creditLogs as creditLogsSchema,
  usage as usageSchema,
  user as userSchema,
} from "@/lib/db/schema";
import { getErrorMessage } from "@/lib/error-utils";
import { getAdminUserTotalCredits } from "@/lib/admin/dashboard-users";
import { count, desc, eq } from "drizzle-orm";

export type AdminCreditLog = typeof creditLogsSchema.$inferSelect;
export type AdminCreditHistoryRecord = AdminCreditLog & {
  user: {
    id: string;
    email: string | null;
    name: string | null;
  } | null;
};

export type GetAdminCreditHistoryResult = ActionResult<{
  user: {
    id: string;
    email: string | null;
    name: string | null;
  } | null;
  summary: {
    totalCredits: number;
    subscriptionCreditsBalance: number;
    oneTimeCreditsBalance: number;
  } | null;
  logs: AdminCreditHistoryRecord[];
  count: number;
}>;

export async function getAdminCreditHistory({
  userId,
  pageIndex = 0,
  pageSize = 20,
}: {
  userId?: string;
  pageIndex?: number;
  pageSize?: number;
}): Promise<GetAdminCreditHistoryResult> {
  if (!(await isAdmin())) {
    return actionResponse.forbidden("Admin privileges required.");
  }

  const db = getDb();

  try {
    let matchedUser:
      | {
          id: string;
          email: string | null;
          name: string | null;
          subscriptionCreditsBalance: number | null;
          oneTimeCreditsBalance: number | null;
        }
      | undefined;

    if (userId) {
      const userRows = await db
        .select({
          id: userSchema.id,
          email: userSchema.email,
          name: userSchema.name,
          subscriptionCreditsBalance: usageSchema.subscriptionCreditsBalance,
          oneTimeCreditsBalance: usageSchema.oneTimeCreditsBalance,
        })
        .from(userSchema)
        .leftJoin(usageSchema, eq(userSchema.id, usageSchema.userId))
        .where(eq(userSchema.id, userId))
        .limit(1);

      matchedUser = userRows[0];
      if (!matchedUser) {
        return actionResponse.notFound("User not found.");
      }
    }

    const [logs, totalCountResult] = await Promise.all([
      db
        .select({
          id: creditLogsSchema.id,
          userId: creditLogsSchema.userId,
          amount: creditLogsSchema.amount,
          oneTimeCreditsSnapshot: creditLogsSchema.oneTimeCreditsSnapshot,
          subscriptionCreditsSnapshot: creditLogsSchema.subscriptionCreditsSnapshot,
          type: creditLogsSchema.type,
          notes: creditLogsSchema.notes,
          relatedOrderId: creditLogsSchema.relatedOrderId,
          createdAt: creditLogsSchema.createdAt,
          user: {
            id: userSchema.id,
            email: userSchema.email,
            name: userSchema.name,
          },
        })
        .from(creditLogsSchema)
        .leftJoin(userSchema, eq(creditLogsSchema.userId, userSchema.id))
        .where(userId ? eq(creditLogsSchema.userId, userId) : undefined)
        .orderBy(desc(creditLogsSchema.createdAt))
        .offset(pageIndex * pageSize)
        .limit(pageSize),
      db
        .select({ value: count() })
        .from(creditLogsSchema)
        .where(userId ? eq(creditLogsSchema.userId, userId) : undefined),
    ]);

    const subscriptionCreditsBalance = matchedUser?.subscriptionCreditsBalance ?? 0;
    const oneTimeCreditsBalance = matchedUser?.oneTimeCreditsBalance ?? 0;

    return actionResponse.success({
      user: matchedUser
        ? {
            id: matchedUser.id,
            email: matchedUser.email,
            name: matchedUser.name,
          }
        : null,
      summary: matchedUser
        ? {
            totalCredits: getAdminUserTotalCredits({
              subscriptionCreditsBalance,
              oneTimeCreditsBalance,
            }),
            subscriptionCreditsBalance,
            oneTimeCreditsBalance,
          }
        : null,
      logs,
      count: totalCountResult[0]?.value ?? 0,
    });
  } catch (error) {
    return actionResponse.error(getErrorMessage(error));
  }
}

export async function getAdminUserCreditHistory(args: {
  userId: string;
  pageIndex?: number;
  pageSize?: number;
}) {
  return getAdminCreditHistory(args);
}
