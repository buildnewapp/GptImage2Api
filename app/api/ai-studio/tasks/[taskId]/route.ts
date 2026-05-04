import { getCachedAiStudioCatalogEntry } from "@/lib/ai-studio/catalog";
import { queryAiStudioTask } from "@/lib/ai-studio/execute";
import { extractProviderFailureReason } from "@/lib/ai-studio/execute";
import {
  archiveAiStudioGenerationMediaUrlsInBackground,
  getAiStudioGenerationForUserByTaskId,
  settleAiStudioGenerationFailure,
  settleAiStudioGenerationSuccess,
  updateAiStudioGenerationProgress,
} from "@/lib/ai-studio/generations";
import { sanitizeAiStudioDebugValue } from "@/lib/ai-studio/public";
import { getPublicAiStudioModelId } from "@/lib/ai-studio/public";
import { apiResponse } from "@/lib/api-response";
import { getRequestUser } from "@/lib/auth/request-user";
import { z } from "zod";

type Params = Promise<{ taskId: string }>;

const querySchema = z.object({
  modelId: z.string().min(1),
});

export async function GET(
  request: Request,
  context: { params: Params },
) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return apiResponse.unauthorized();
    }

    const { taskId } = await context.params;
    const { searchParams } = new URL(request.url);
    const input = querySchema.parse({
      modelId: searchParams.get("modelId"),
    });

    const generation = await getAiStudioGenerationForUserByTaskId(user.id, taskId);
    if (!generation) {
      return apiResponse.notFound("Generation record not found");
    }

    const catalogEntry = await getCachedAiStudioCatalogEntry(generation.catalogModelId);
    const publicModelId = catalogEntry
      ? getPublicAiStudioModelId(catalogEntry)
      : input.modelId;

    if (generation.status === "succeeded" || generation.status === "failed") {
      return apiResponse.success({
        generationId: generation.id,
        taskId,
        modelId: publicModelId,
        state: generation.status === "succeeded" ? "succeeded" : "failed",
        mediaUrls: Array.isArray(generation.resultUrls)
          ? (generation.resultUrls as string[])
          : [],
        raw: sanitizeAiStudioDebugValue(
          generation.callbackPayload ?? generation.responsePayload ?? {},
        ),
        reservedCredits: generation.creditsReserved,
        refundedCredits: generation.creditsRefunded,
      });
    }

    const result = await queryAiStudioTask(input.modelId, taskId);

    if (result.state === "succeeded") {
      const settled = await settleAiStudioGenerationSuccess(generation.id, {
        raw: result.raw,
        mediaUrls: result.mediaUrls,
        providerState: result.state,
      });
      archiveAiStudioGenerationMediaUrlsInBackground(generation.id);
      if (Array.isArray(settled?.resultUrls)) {
        result.mediaUrls = settled.resultUrls as string[];
      }
    } else if (result.state === "failed") {
      await settleAiStudioGenerationFailure(generation.id, {
        raw: result.raw,
        reason:
          extractProviderFailureReason(result.raw) ||
          (typeof result.raw === "string" ? result.raw : null) ||
          "Provider task failed",
        providerState: result.state,
      });
    } else if (result.state === "queued" || result.state === "running") {
      await updateAiStudioGenerationProgress(generation.id, {
        raw: result.raw,
        state: result.state,
        mediaUrls: result.mediaUrls,
      });
    }

    return apiResponse.success({
      generationId: generation.id,
      taskId,
      modelId: publicModelId,
      state: result.state,
      mediaUrls: result.mediaUrls,
      raw: sanitizeAiStudioDebugValue(result.raw),
      reservedCredits: generation.creditsReserved,
      refundedCredits:
        result.state === "failed"
          ? generation.creditsReserved
          : generation.creditsRefunded,
    });
  } catch (error: any) {
    return apiResponse.serverError(
      error?.message || "Failed to query AI Studio task",
    );
  }
}
