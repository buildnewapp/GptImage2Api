"use server";

import {
  buildAiStudioAdminSummary,
  canAdminMarkGenerationFailed,
  formatAdminFailureReason,
} from "@/lib/ai-studio/admin";
import { forceFailAiStudioGeneration } from "@/lib/ai-studio/generations";
import { actionResponse, type ActionResult } from "@/lib/action-response";
import { isAdmin } from "@/lib/auth/server";
import { getDb } from "@/lib/db";
import { aiStudioGenerations, user } from "@/lib/db/schema";
import { getErrorMessage } from "@/lib/error-utils";
import {
  and,
  count,
  desc,
  eq,
  ilike,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { z } from "zod";

type AdminAiStudioQuery = {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  search?: string;
  userId?: string;
};

const ADMIN_AI_STUDIO_CATEGORIES = ["video", "image", "music", "chat"] as const;

function buildAdminAiStudioWhereClause({
  status = "all",
  category = "all",
  search = "",
  userId,
}: Pick<AdminAiStudioQuery, "status" | "category" | "search" | "userId">) {
  const conditions: SQL[] = [];

  if (userId) {
    conditions.push(eq(aiStudioGenerations.userId, userId));
  }

  if (status && status !== "all") {
    conditions.push(eq(aiStudioGenerations.status, status as any));
  }

  if (category && category !== "all") {
    conditions.push(eq(aiStudioGenerations.category, category));
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

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function getAdminAiStudioGenerations({
  page = 1,
  limit = 20,
  status = "all",
  category = "all",
  search = "",
  userId,
}: AdminAiStudioQuery = {}) {
  if (!(await isAdmin())) {
    return {
      records: [],
      total: 0,
      totalPages: 1,
      page: 1,
      availableCategories: [...ADMIN_AI_STUDIO_CATEGORIES],
      summary: buildAiStudioAdminSummary([]),
    };
  }

  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), 100);
  const offset = (safePage - 1) * safeLimit;
  const whereClause = buildAdminAiStudioWhereClause({ status, category, search, userId });

  const db = getDb();
  const [rows, totalResult, summaryResult] = await Promise.all([
    db
      .select({
        id: aiStudioGenerations.id,
        userId: aiStudioGenerations.userId,
        userEmail: user.email,
        userName: user.name,
        catalogModelId: aiStudioGenerations.catalogModelId,
        category: aiStudioGenerations.category,
        title: aiStudioGenerations.titleSnapshot,
        provider: aiStudioGenerations.providerSnapshot,
        endpoint: aiStudioGenerations.endpointSnapshot,
        method: aiStudioGenerations.methodSnapshot,
        providerTaskId: aiStudioGenerations.providerTaskId,
        status: aiStudioGenerations.status,
        providerState: aiStudioGenerations.providerState,
        statusReason: aiStudioGenerations.statusReason,
        requestPayload: aiStudioGenerations.requestPayload,
        responsePayload: aiStudioGenerations.responsePayload,
        callbackPayload: aiStudioGenerations.callbackPayload,
        officialPricingSnapshot: aiStudioGenerations.officialPricingSnapshot,
        resultUrls: aiStudioGenerations.resultUrls,
        reservedCredits: aiStudioGenerations.creditsReserved,
        capturedCredits: aiStudioGenerations.creditsCaptured,
        refundedCredits: aiStudioGenerations.creditsRefunded,
        createdAt: aiStudioGenerations.createdAt,
        completedAt: aiStudioGenerations.completedAt,
        failedAt: aiStudioGenerations.failedAt,
      })
      .from(aiStudioGenerations)
      .leftJoin(user, eq(aiStudioGenerations.userId, user.id))
      .where(whereClause)
      .orderBy(desc(aiStudioGenerations.createdAt))
      .offset(offset)
      .limit(safeLimit),
    db
      .select({ value: count() })
      .from(aiStudioGenerations)
      .leftJoin(user, eq(aiStudioGenerations.userId, user.id))
      .where(whereClause),
    db
      .select({
        total: count(),
        active: sql<number>`coalesce(sum(case when ${aiStudioGenerations.status} in ('created', 'submitted', 'queued', 'running') then 1 else 0 end), 0)::int`,
        succeeded: sql<number>`coalesce(sum(case when ${aiStudioGenerations.status} = 'succeeded' then 1 else 0 end), 0)::int`,
        failed: sql<number>`coalesce(sum(case when ${aiStudioGenerations.status} = 'failed' then 1 else 0 end), 0)::int`,
        reservedCredits: sql<number>`coalesce(sum(${aiStudioGenerations.creditsReserved}), 0)::int`,
        refundedCredits: sql<number>`coalesce(sum(${aiStudioGenerations.creditsRefunded}), 0)::int`,
      })
      .from(aiStudioGenerations)
      .leftJoin(user, eq(aiStudioGenerations.userId, user.id))
      .where(whereClause),
  ]);

  const total = totalResult[0]?.value ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const summaryRow = summaryResult[0];

  return {
    records: rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      completedAt: row.completedAt?.toISOString() ?? null,
      failedAt: row.failedAt?.toISOString() ?? null,
      resultUrls: Array.isArray(row.resultUrls) ? (row.resultUrls as string[]) : [],
    })),
    total,
    totalPages,
    page: safePage,
    availableCategories: [...ADMIN_AI_STUDIO_CATEGORIES],
    summary: summaryRow
      ? {
          total: summaryRow.total,
          active: summaryRow.active,
          succeeded: summaryRow.succeeded,
          failed: summaryRow.failed,
          reservedCredits: summaryRow.reservedCredits,
          refundedCredits: summaryRow.refundedCredits,
        }
      : buildAiStudioAdminSummary([]),
  };
}

const MarkFailedSchema = z.object({
  generationId: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
});

export async function markAiStudioGenerationFailedByAdmin(
  input: z.infer<typeof MarkFailedSchema>,
): Promise<
  ActionResult<{
    id: string;
    status: string;
    refundedCredits: number;
  }>
> {
  if (!(await isAdmin())) {
    return actionResponse.forbidden("Admin privileges required.");
  }

  try {
    const parsed = MarkFailedSchema.parse(input);
    const existing = await getDb()
      .select({
        id: aiStudioGenerations.id,
        status: aiStudioGenerations.status,
        statusReason: aiStudioGenerations.statusReason,
        responsePayload: aiStudioGenerations.responsePayload,
        creditsRefunded: aiStudioGenerations.creditsRefunded,
      })
      .from(aiStudioGenerations)
      .where(eq(aiStudioGenerations.id, parsed.generationId))
      .limit(1);

    const generation = existing[0];
    if (!generation) {
      return actionResponse.notFound("Generation record not found.");
    }

    if (!canAdminMarkGenerationFailed(generation.status)) {
      return actionResponse.conflict("This generation is already marked as failed.");
    }

    const reason = formatAdminFailureReason(parsed.reason, generation.statusReason);
    const raw =
      generation.responsePayload && typeof generation.responsePayload === "object"
        ? {
            ...(generation.responsePayload as Record<string, unknown>),
            adminOverride: {
              action: "mark_failed",
              reason,
              at: new Date().toISOString(),
            },
          }
        : {
            previousResponse: generation.responsePayload ?? null,
            adminOverride: {
              action: "mark_failed",
              reason,
              at: new Date().toISOString(),
            },
          };

    const updated = await forceFailAiStudioGeneration(parsed.generationId, {
      raw,
      reason,
      providerState: "failed",
    });

    if (!updated) {
      return actionResponse.notFound("Generation record not found.");
    }

    return actionResponse.success({
      id: updated.id,
      status: updated.status,
      refundedCredits: updated.creditsRefunded,
    });
  } catch (error) {
    return actionResponse.error(getErrorMessage(error));
  }
}
