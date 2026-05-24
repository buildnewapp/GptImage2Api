import {
  extractMediaUrls,
  extractProviderFailureReason,
  extractTaskId,
  normalizeTaskState,
  queryAiStudioTask,
} from "@/lib/ai-studio/execute";
import {
  getAiStudioGenerationByTaskId,
  setAiStudioGenerationCallback,
  settleAiStudioGenerationFailure,
  settleAiStudioGenerationSuccessWithMediaArchive,
  updateAiStudioGenerationProgress,
} from "@/lib/ai-studio/generations";
import { apiResponse } from "@/lib/api-response";
import crypto from "crypto";
import { NextRequest } from "next/server";

const KIE_WEBHOOK_HMAC_KEY = process.env.KIE_WEBHOOK_HMAC_KEY;

function verifyKieSignature(
  taskId: string,
  timestamp: string,
  receivedSignature: string,
  secret: string,
) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${taskId}.${timestamp}`)
    .digest("base64");

  if (expected.length !== receivedSignature.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(receivedSignature),
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const taskId = extractTaskId(body);
    if (!taskId) {
      return apiResponse.badRequest("Missing taskId in callback payload.");
    }

    if (KIE_WEBHOOK_HMAC_KEY) {
      const timestamp = request.headers.get("x-webhook-timestamp");
      const receivedSignature = request.headers.get("x-webhook-signature");

      if (!timestamp || !receivedSignature) {
        return apiResponse.unauthorized("Missing signature headers.");
      }

      if (
        !verifyKieSignature(
          taskId,
          timestamp,
          receivedSignature,
          KIE_WEBHOOK_HMAC_KEY,
        )
      ) {
        return apiResponse.unauthorized("Invalid signature.");
      }
    }

    const generation = await getAiStudioGenerationByTaskId(taskId);
    if (!generation) {
      return apiResponse.notFound("Generation record not found.");
    }

    await setAiStudioGenerationCallback(generation.id, body);

    const callbackCode = Number(
      body && typeof body === "object"
        ? (body as Record<string, unknown>).code
        : null,
    );
    const result = callbackCode === 200
      ? await queryAiStudioTask(generation.catalogModelId, taskId)
      : null;
    const raw = result?.raw ?? body;
    const state = result?.state ?? normalizeTaskState(body);
    const mediaUrls = result?.mediaUrls ?? extractMediaUrls(body);

    if (state === "succeeded") {
      await settleAiStudioGenerationSuccessWithMediaArchive(generation.id, {
        raw,
        mediaUrls,
        providerState: state,
      });
    } else if (state === "failed") {
      await settleAiStudioGenerationFailure(generation.id, {
        raw,
        reason:
          extractProviderFailureReason(raw) ||
          "Provider task failed",
        providerState: state,
      });
    } else if (state === "queued" || state === "running") {
      await updateAiStudioGenerationProgress(generation.id, {
        raw,
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
