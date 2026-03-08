import {
  prepareAiStudioExecution,
  submitAiStudioExecution,
} from "@/lib/ai-studio/execute";
import {
  markAiStudioGenerationSubmitted,
  reserveAiStudioGeneration,
  settleAiStudioGenerationFailure,
  settleAiStudioGenerationSuccess,
} from "@/lib/ai-studio/generations";
import {
  getPublicAiStudioModelId,
  sanitizeAiStudioDebugValue,
  toPublicPricingRow,
} from "@/lib/ai-studio/public";
import {
  canAccessAiStudioModel,
  loadAiStudioPolicyConfig,
} from "@/lib/ai-studio/policy";
import { apiResponse } from "@/lib/api-response";
import { getRequestUser } from "@/lib/auth/request-user";
import { z } from "zod";

const inputSchema = z.object({
  modelId: z.string().min(1),
  payload: z.record(z.string(), z.any()),
});

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return apiResponse.unauthorized();
    }

    const body = await request.json();
    const input = inputSchema.parse(body);
    const prepared = await prepareAiStudioExecution(input.modelId, input.payload);
    const policy = await loadAiStudioPolicyConfig();
    if (!canAccessAiStudioModel(prepared.detail, { role: user.role, config: policy })) {
      return apiResponse.error("This model is unavailable for your account.", 403);
    }
    const { generation, reservedCredits } = await reserveAiStudioGeneration({
      userId: user.id,
      modelId: input.modelId,
      detail: prepared.detail,
      payload: prepared.body,
      selectedPricing: prepared.selectedPricing,
    });

    try {
      const result = await submitAiStudioExecution(prepared.detail, prepared.body);
      const state =
        result.taskId && result.statusEndpoint
          ? "queued"
          : "succeeded";

      await markAiStudioGenerationSubmitted(generation.id, {
        providerTaskId: result.taskId,
        raw: result.raw,
        state,
        mediaUrls: result.mediaUrls,
      });

      if (state === "succeeded") {
        await settleAiStudioGenerationSuccess(generation.id, {
          raw: result.raw,
          mediaUrls: result.mediaUrls,
          providerState: "succeeded",
        });
      }

      return apiResponse.success({
        modelId: getPublicAiStudioModelId(prepared.detail),
        generationId: generation.id,
        reservedCredits,
        taskId: result.taskId,
        state,
        statusSupported: Boolean(result.statusEndpoint && result.taskId),
        statusEndpoint: result.statusEndpoint,
        raw: sanitizeAiStudioDebugValue(result.raw),
        mediaUrls: result.mediaUrls,
        selectedPricing: prepared.selectedPricing
          ? toPublicPricingRow(prepared.selectedPricing, prepared.detail)
          : null,
        pricingRows: prepared.detail.pricingRows.map((row) =>
          toPublicPricingRow(row, prepared.detail),
        ),
      });
    } catch (error: any) {
      await settleAiStudioGenerationFailure(generation.id, {
        raw: {
          message: error?.message || "Execution failed",
        },
        reason: error?.message || "Execution failed",
        providerState: "failed",
      });
      throw error;
    }
  } catch (error: any) {
    const status = typeof error?.status === "number" ? error.status : 500;
    return apiResponse.error(
      error?.message || "Failed to execute AI Studio request",
      status,
    );
  }
}
