"use server";

import { VIDEO_MODEL_FAMILIES, findImplementationByModelId } from "@/config/model_config";
import { getDb } from "@/lib/db";
import { user, videoGenerations } from "@/lib/db/schema";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";

interface AdminVideoQuery {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

function resolveSelectedModelName(model: string, inputParams: unknown): string {
  const selection = (inputParams as any)?.selection;
  const modelKey =
    typeof selection?.modelKey === "string" ? selection.modelKey : null;
  const versionKey =
    typeof selection?.versionKey === "string" ? selection.versionKey : null;

  if (modelKey) {
    const family = VIDEO_MODEL_FAMILIES.find((item) => item.modelKey === modelKey);
    if (family) {
      if (versionKey) {
        const version = family.versions.find(
          (item) => item.versionKey === versionKey,
        );
        if (version) return version.displayName;
      }
      return family.displayName;
    }
    return modelKey;
  }

  const resolved = findImplementationByModelId(model);
  if (resolved) {
    return resolved.version.displayName;
  }

  return model.includes("/") ? model.split("/").at(-1) || model : model;
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
    getDb()
      .select({
        id: videoGenerations.id,
        taskId: videoGenerations.taskId,
        userId: videoGenerations.userId,
        userEmail: user.email,
        userName: user.name,
        model: videoGenerations.model,
        status: videoGenerations.status,
        isPublic: videoGenerations.isPublic,
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
    getDb()
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
      selectedModel: resolveSelectedModelName(record.model, record.inputParams),
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
