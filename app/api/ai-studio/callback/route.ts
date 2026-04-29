import {
  extractMediaUrls,
  extractProviderFailureReason,
  extractTaskId,
  normalizeTaskState,
} from "@/lib/ai-studio/execute";
import {
  archiveAiStudioGenerationMediaUrlsInBackground,
  getAiStudioGenerationByTaskId,
  setAiStudioGenerationCallback,
  settleAiStudioGenerationFailure,
  settleAiStudioGenerationSuccess,
  updateAiStudioGenerationProgress,
} from "@/lib/ai-studio/generations";
import { apiResponse } from "@/lib/api-response";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const expectedSecret =
      process.env.AI_STUDIO_CALLBACK_SECRET || process.env.KIE_CALLBACK_SECRET;
    const providedSecret = request.nextUrl.searchParams.get("secret");

    if (expectedSecret && expectedSecret !== providedSecret) {
      return apiResponse.unauthorized("Invalid callback secret.");
    }

    const body = await request.json();
    const taskId = extractTaskId(body);
    if (!taskId) {
      return apiResponse.badRequest("Missing taskId in callback payload.");
    }

    const generation = await getAiStudioGenerationByTaskId(taskId);
    if (!generation) {
      return apiResponse.notFound("Generation record not found.");
    }

    await setAiStudioGenerationCallback(generation.id, body);

    const state = normalizeTaskState(body);
    const mediaUrls = extractMediaUrls(body);

    if (state === "succeeded") {
      await settleAiStudioGenerationSuccess(generation.id, {
        raw: body,
        mediaUrls,
        providerState: state,
      });
      archiveAiStudioGenerationMediaUrlsInBackground(generation.id);
    } else if (state === "failed") {
      await settleAiStudioGenerationFailure(generation.id, {
        raw: body,
        reason:
          extractProviderFailureReason(body) ||
          "Provider task failed",
        providerState: state,
      });
    } else if (state === "queued" || state === "running") {
      await updateAiStudioGenerationProgress(generation.id, {
        raw: body,
        state,
        mediaUrls,
      });
    }

    return apiResponse.success({
      ok: true,
      taskId,
      state,
    });
  } catch (error: any) {
    return apiResponse.serverError(
      error?.message || "Failed to handle AI Studio callback",
    );
  }
}
