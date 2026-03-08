import { executeAiStudioModel } from "@/lib/ai-studio/execute";
import { apiResponse } from "@/lib/api-response";
import { z } from "zod";

const inputSchema = z.object({
  modelId: z.string().min(1),
  payload: z.record(z.string(), z.any()),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = inputSchema.parse(body);
    const result = await executeAiStudioModel(input.modelId, input.payload);

    return apiResponse.success({
      modelId: input.modelId,
      taskId: result.taskId,
      statusSupported: Boolean(result.statusEndpoint && result.taskId),
      statusEndpoint: result.statusEndpoint,
      raw: result.raw,
      mediaUrls: result.mediaUrls,
      selectedPricing: result.selectedPricing,
      pricingRows: result.detail.pricingRows,
    });
  } catch (error: any) {
    return apiResponse.serverError(
      error?.message || "Failed to execute AI Studio request",
    );
  }
}
