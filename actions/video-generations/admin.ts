"use server";

import { db } from "@/lib/db";
import { user, videoGenerations } from "@/lib/db/schema";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";

interface AdminVideoQuery {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export async function getAdminVideoGenerations({
  page = 1,
  limit = 20,
  status,
  search,
}: AdminVideoQuery = {}) {
  const offset = (page - 1) * limit;

  const conditions = [];

  if (status && status !== "all") {
    conditions.push(eq(videoGenerations.status, status as any));
  }

  if (search) {
    conditions.push(
      or(
        ilike(user.email, `%${search}%`),
        ilike(videoGenerations.taskId, `%${search}%`)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [records, countResult] = await Promise.all([
    db
      .select({
        id: videoGenerations.id,
        taskId: videoGenerations.taskId,
        userId: videoGenerations.userId,
        userEmail: user.email,
        userName: user.name,
        model: videoGenerations.model,
        status: videoGenerations.status,
        creditsUsed: videoGenerations.creditsUsed,
        creditsRefunded: videoGenerations.creditsRefunded,
        inputParams: videoGenerations.inputParams,
        resultUrls: videoGenerations.resultUrls,
        createdAt: videoGenerations.createdAt,
      })
      .from(videoGenerations)
      .leftJoin(user, eq(videoGenerations.userId, user.id))
      .where(whereClause)
      .orderBy(desc(videoGenerations.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(videoGenerations)
      .leftJoin(user, eq(videoGenerations.userId, user.id))
      .where(whereClause),
  ]);

  const total = Number(countResult[0]?.count || 0);

  const formattedRecords = records.map((record) => {
    const inputPayload = (record.inputParams as any)?.input || {};
    const prompt = inputPayload.prompt || inputPayload.text || null;
    const resultUrls = record.resultUrls as string[] | null;

    return {
      ...record,
      prompt,
      resultUrl: Array.isArray(resultUrls) && resultUrls.length > 0 ? resultUrls[0] : null,
      createdAt: record.createdAt.toISOString(),
    };
  });

  return {
    records: formattedRecords,
    total,
    totalPages: Math.ceil(total / limit),
    page,
  };
}
