"use server";

import {
  getAiStudioStatusesForLegacyVideoFilter,
  mapAiStudioAdminRecordToLegacyAdminVideoRecord,
} from "@/lib/ai-studio/dashboard-videos";
import { isAdmin } from "@/lib/auth/server";
import { getDb } from "@/lib/db";
import { aiStudioGenerations, user } from "@/lib/db/schema";
import { and, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";

type AdminAiStudioVideoQuery = {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
};

export async function getAdminAiStudioVideoGenerations({
  page = 1,
  limit = 20,
  status = "all",
  search = "",
}: AdminAiStudioVideoQuery = {}) {
  if (!(await isAdmin())) {
    return {
      records: [],
      total: 0,
      totalPages: 1,
      page: 1,
    };
  }

  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), 100);
  const statusFilters = getAiStudioStatusesForLegacyVideoFilter(
    status === "pending" || status === "success" || status === "failed"
      ? status
      : "all",
  );
  const conditions: SQL[] = [inArray(aiStudioGenerations.category, ["video", "image"])];

  if (statusFilters) {
    conditions.push(inArray(aiStudioGenerations.status, [...statusFilters]));
  }

  if (search.trim()) {
    const query = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(user.email, query),
        ilike(user.name, query),
        ilike(aiStudioGenerations.titleSnapshot, query),
        ilike(aiStudioGenerations.providerSnapshot, query),
        ilike(aiStudioGenerations.catalogModelId, query),
        ilike(aiStudioGenerations.providerTaskId, query),
        sql`cast(${aiStudioGenerations.id} as text) ilike ${query}`,
      )!,
    );
  }

  const whereClause = and(...conditions);
  const offset = (safePage - 1) * safeLimit;

  const [rows, totalResult] = await Promise.all([
    getDb()
      .select({
        id: aiStudioGenerations.id,
        userId: aiStudioGenerations.userId,
        userEmail: user.email,
        userName: user.name,
        category: aiStudioGenerations.category,
        catalogModelId: aiStudioGenerations.catalogModelId,
        title: aiStudioGenerations.titleSnapshot,
        providerTaskId: aiStudioGenerations.providerTaskId,
        status: aiStudioGenerations.status,
        requestPayload: aiStudioGenerations.requestPayload,
        resultUrls: aiStudioGenerations.resultUrls,
        reservedCredits: aiStudioGenerations.creditsReserved,
        refundedCredits: aiStudioGenerations.creditsRefunded,
        createdAt: aiStudioGenerations.createdAt,
      })
      .from(aiStudioGenerations)
      .leftJoin(user, eq(aiStudioGenerations.userId, user.id))
      .where(whereClause)
      .orderBy(desc(aiStudioGenerations.createdAt))
      .limit(safeLimit)
      .offset(offset),
    getDb()
      .select({ value: count() })
      .from(aiStudioGenerations)
      .leftJoin(user, eq(aiStudioGenerations.userId, user.id))
      .where(whereClause),
  ]);

  const total = Number(totalResult[0]?.value ?? 0);

  return {
    records: rows.map((row) =>
      mapAiStudioAdminRecordToLegacyAdminVideoRecord({
        id: row.id,
        userId: row.userId,
        userEmail: row.userEmail,
        userName: row.userName,
        category: row.category,
        catalogModelId: row.catalogModelId,
        title: row.title,
        providerTaskId: row.providerTaskId,
        status: row.status,
        requestPayload:
          row.requestPayload && typeof row.requestPayload === "object"
            ? (row.requestPayload as Record<string, any>)
            : {},
        resultUrls: Array.isArray(row.resultUrls) ? (row.resultUrls as string[]) : [],
        reservedCredits: row.reservedCredits,
        refundedCredits: row.refundedCredits,
        createdAt: row.createdAt.toISOString(),
      }),
    ),
    total,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    page: safePage,
  };
}
