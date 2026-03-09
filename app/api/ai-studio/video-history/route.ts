import { getCachedAiStudioCatalog } from "@/lib/ai-studio/catalog";
import {
  getAiStudioStatusesForLegacyVideoFilter,
  mapAiStudioUserRecordToLegacyVideoHistoryRecord,
} from "@/lib/ai-studio/dashboard-videos";
import {
  softDeleteAiStudioGenerationForUser,
  updateAiStudioGenerationVisibilityForUser,
} from "@/lib/ai-studio/generations";
import { getPublicAiStudioModelId } from "@/lib/ai-studio/public";
import { apiResponse } from "@/lib/api-response";
import { getRequestUser } from "@/lib/auth/request-user";
import { getDb } from "@/lib/db";
import { aiStudioGenerations } from "@/lib/db/schema";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(12),
  status: z.enum(["all", "pending", "success", "failed"]).optional().default("all"),
});

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return apiResponse.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const input = querySchema.parse({
      page: searchParams.get("page") ?? 1,
      limit:
        searchParams.get("limit") ??
        searchParams.get("pageSize") ??
        12,
      status: searchParams.get("status") ?? "all",
    });

    const statusFilters = getAiStudioStatusesForLegacyVideoFilter(input.status);
    const conditions = [
      eq(aiStudioGenerations.userId, user.id),
      eq(aiStudioGenerations.category, "video"),
      isNull(aiStudioGenerations.userDeletedAt),
      ...(statusFilters
        ? [inArray(aiStudioGenerations.status, [...statusFilters])]
        : []),
    ];
    const whereClause = and(...conditions);
    const offset = (input.page - 1) * input.limit;

    const [rows, totalResult, catalog] = await Promise.all([
      getDb()
        .select({
          id: aiStudioGenerations.id,
          catalogModelId: aiStudioGenerations.catalogModelId,
          title: aiStudioGenerations.titleSnapshot,
          provider: aiStudioGenerations.providerSnapshot,
          status: aiStudioGenerations.status,
          providerTaskId: aiStudioGenerations.providerTaskId,
          isPublic: aiStudioGenerations.isPublic,
          reservedCredits: aiStudioGenerations.creditsReserved,
          capturedCredits: aiStudioGenerations.creditsCaptured,
          refundedCredits: aiStudioGenerations.creditsRefunded,
          resultUrls: aiStudioGenerations.resultUrls,
          createdAt: aiStudioGenerations.createdAt,
          requestPayload: aiStudioGenerations.requestPayload,
        })
        .from(aiStudioGenerations)
        .where(whereClause)
        .orderBy(desc(aiStudioGenerations.createdAt))
        .offset(offset)
        .limit(input.limit),
      getDb()
        .select({ value: count() })
        .from(aiStudioGenerations)
        .where(whereClause),
      getCachedAiStudioCatalog(),
    ]);

    const publicModelIds = new Map(
      catalog.map((entry) => [entry.id, getPublicAiStudioModelId(entry)]),
    );

    const records = rows.map((row) =>
      mapAiStudioUserRecordToLegacyVideoHistoryRecord({
        id: row.id,
        catalogModelId: publicModelIds.get(row.catalogModelId) ?? row.catalogModelId,
        title: row.title,
        provider: row.provider,
        status: row.status,
        providerTaskId: row.providerTaskId,
        isPublic: row.isPublic,
        reservedCredits: row.reservedCredits,
        capturedCredits: row.capturedCredits,
        refundedCredits: row.refundedCredits,
        resultUrls: Array.isArray(row.resultUrls) ? (row.resultUrls as string[]) : [],
        createdAt: row.createdAt.toISOString(),
        requestPayload:
          row.requestPayload && typeof row.requestPayload === "object"
            ? (row.requestPayload as Record<string, any>)
            : {},
      }),
    );

    const total = Number(totalResult[0]?.value ?? 0);

    return apiResponse.success({
      records,
      total,
      totalPages: Math.max(1, Math.ceil(total / input.limit)),
      page: input.page,
    });
  } catch (error: any) {
    return apiResponse.serverError(
      error?.message || "Failed to load AI Studio video history",
    );
  }
}

const patchSchema = z.object({
  id: z.string().uuid(),
  isPublic: z.boolean(),
});

export async function PATCH(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return apiResponse.unauthorized();
    }

    const body = await request.json();
    const input = patchSchema.parse(body);

    const updated = await updateAiStudioGenerationVisibilityForUser(
      user.id,
      input.id,
      input.isPublic,
    );

    if (!updated) {
      return apiResponse.notFound("Video generation record not found.");
    }

    return apiResponse.success(updated);
  } catch (error: any) {
    return apiResponse.serverError(
      error?.message || "Failed to update AI Studio video visibility",
    );
  }
}

const deleteQuerySchema = z.object({
  id: z.string().uuid(),
});

export async function DELETE(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return apiResponse.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const input = deleteQuerySchema.parse({
      id: searchParams.get("id"),
    });

    const deleted = await softDeleteAiStudioGenerationForUser(user.id, input.id);

    if (!deleted) {
      return apiResponse.notFound("Video generation record not found.");
    }

    return apiResponse.success(deleted);
  } catch (error: any) {
    return apiResponse.serverError(
      error?.message || "Failed to delete AI Studio video history item",
    );
  }
}
