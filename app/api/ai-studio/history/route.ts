import { getCachedAiStudioCatalog } from "@/lib/ai-studio/catalog";
import { listAiStudioGenerationsForUser } from "@/lib/ai-studio/generations";
import { getAiStudioHistoryStatusReason } from "@/lib/ai-studio/history";
import {
  getPublicAiStudioModelId,
  sanitizeAiStudioDebugValue,
} from "@/lib/ai-studio/public";
import { apiResponse } from "@/lib/api-response";
import { getRequestUser } from "@/lib/auth/request-user";
import { z } from "zod";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return apiResponse.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const input = querySchema.parse({
      limit: searchParams.get("limit") ?? 20,
    });

    const records = await listAiStudioGenerationsForUser(user.id, input.limit);
    const catalog = await getCachedAiStudioCatalog();
    const publicModelIds = new Map(
      catalog.map((entry) => [entry.id, getPublicAiStudioModelId(entry)]),
    );

    return apiResponse.success({
      items: records.map((record) => {
        const raw = sanitizeAiStudioDebugValue(
          record.callbackPayload ?? record.responsePayload ?? {},
        );

        return {
          id: record.id,
          catalogModelId:
            publicModelIds.get(record.catalogModelId) ?? record.catalogModelId,
          category: record.category,
          title: record.titleSnapshot,
          provider: record.providerSnapshot,
          status: record.status,
          providerTaskId: record.providerTaskId,
          isPublic: record.isPublic,
          reservedCredits: record.creditsReserved,
          capturedCredits: record.creditsCaptured,
          refundedCredits: record.creditsRefunded,
          resultUrls: Array.isArray(record.resultUrls)
            ? (record.resultUrls as string[])
            : [],
          createdAt: record.createdAt,
          completedAt: record.completedAt,
          failedAt: record.failedAt,
          requestPayload:
            record.requestPayload &&
            typeof record.requestPayload === "object" &&
            !Array.isArray(record.requestPayload)
              ? (record.requestPayload as Record<string, any>)
              : {},
          statusReason: getAiStudioHistoryStatusReason({
            status: record.status,
            statusReason: record.statusReason,
            raw,
          }),
          raw,
        };
      }),
    });
  } catch (error: any) {
    return apiResponse.serverError(
      error?.message || "Failed to load AI Studio history",
    );
  }
}
