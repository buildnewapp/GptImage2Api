import {
  getCachedAiStudioCatalogDetail,
  getCachedAiStudioCatalogEntry,
} from "@/lib/ai-studio/catalog";
import {
  extractProviderFailureReason,
  extractResultArtifacts,
  queryAiStudioTask,
} from "@/lib/ai-studio/execute";
import {
  getAiStudioGenerationForUserByTaskId,
  settleAiStudioGenerationFailure,
  settleAiStudioGenerationSuccessWithMediaArchive,
  updateAiStudioGenerationProgress,
} from "@/lib/ai-studio/generations";
import {
  getPublicAiStudioModelId,
  sanitizeAiStudioDebugValue,
} from "@/lib/ai-studio/public";
import { apiResponse } from "@/lib/api-response";
import { getRequestUser } from "@/lib/auth/request-user";

type Params = Promise<{ taskId: string }>;

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
    const generation = await getAiStudioGenerationForUserByTaskId(user.id, taskId);
    if (!generation) {
      return apiResponse.notFound("Generation record not found");
    }

    const catalogEntry = await getCachedAiStudioCatalogEntry(generation.catalogModelId);
    const publicModelId = catalogEntry
      ? getPublicAiStudioModelId(catalogEntry)
      : generation.catalogModelId;

    if (generation.status === "succeeded" || generation.status === "failed") {
      const detail = await getCachedAiStudioCatalogDetail(generation.catalogModelId);
      const raw = generation.callbackPayload ?? generation.responsePayload ?? {};
      const reason =
        generation.status === "failed"
          ? generation.statusReason || extractProviderFailureReason(raw)
          : null;

      return apiResponse.success({
        generationId: generation.id,
        taskId,
        modelId: publicModelId,
        state: generation.status === "succeeded" ? "succeeded" : "failed",
        mediaUrls: Array.isArray(generation.resultUrls)
          ? (generation.resultUrls as string[])
          : [],
        artifacts: detail ? extractResultArtifacts(raw, detail) : [],
        raw: sanitizeAiStudioDebugValue(raw),
        reason,
        reservedCredits: generation.creditsReserved,
        refundedCredits: generation.creditsRefunded,
      });
    }

    const result = await queryAiStudioTask(generation.catalogModelId, taskId);
    const failureReason =
      result.state === "failed"
        ? extractProviderFailureReason(result.raw) ||
          (typeof result.raw === "string" ? result.raw : null) ||
          "Provider task failed"
        : null;

    if (result.state === "succeeded") {
      const settled = await settleAiStudioGenerationSuccessWithMediaArchive(
        generation.id,
        {
          raw: result.raw,
          mediaUrls: result.mediaUrls,
          providerState: result.state,
          requireR2Urls: true,
        },
      );
      if (Array.isArray(settled?.resultUrls)) {
        result.mediaUrls = settled.resultUrls as string[];
      }
    } else if (result.state === "failed") {
      await settleAiStudioGenerationFailure(generation.id, {
        raw: result.raw,
        reason: failureReason,
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
      artifacts: result.artifacts,
      raw: sanitizeAiStudioDebugValue(result.raw),
      reason: failureReason,
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
