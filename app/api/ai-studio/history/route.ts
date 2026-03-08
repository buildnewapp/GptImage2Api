import { listAiStudioGenerationsForUser } from "@/lib/ai-studio/generations";
import { sanitizeAiStudioDebugValue } from "@/lib/ai-studio/public";
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
    return apiResponse.success({
      items: records.map((record) => ({
        id: record.id,
        catalogModelId: record.catalogModelId,
        category: record.category,
        title: record.titleSnapshot,
        provider: record.providerSnapshot,
        status: record.status,
        providerTaskId: record.providerTaskId,
        reservedCredits: record.creditsReserved,
        capturedCredits: record.creditsCaptured,
        refundedCredits: record.creditsRefunded,
        resultUrls: Array.isArray(record.resultUrls)
          ? (record.resultUrls as string[])
          : [],
        createdAt: record.createdAt,
        completedAt: record.completedAt,
        failedAt: record.failedAt,
        statusReason: record.statusReason,
        raw: sanitizeAiStudioDebugValue(
          record.callbackPayload ?? record.responsePayload ?? {},
        ),
      })),
    });
  } catch (error: any) {
    return apiResponse.serverError(
      error?.message || "Failed to load AI Studio history",
    );
  }
}
