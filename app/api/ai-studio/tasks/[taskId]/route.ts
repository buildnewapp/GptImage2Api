import { queryAiStudioTask } from "@/lib/ai-studio/execute";
import { apiResponse } from "@/lib/api-response";
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
    const { taskId } = await context.params;
    const { searchParams } = new URL(request.url);
    const input = querySchema.parse({
      modelId: searchParams.get("modelId"),
    });

    const result = await queryAiStudioTask(input.modelId, taskId);
    return apiResponse.success({
      taskId,
      modelId: input.modelId,
      state: result.state,
      mediaUrls: result.mediaUrls,
      raw: result.raw,
    });
  } catch (error: any) {
    return apiResponse.serverError(
      error?.message || "Failed to query AI Studio task",
    );
  }
}
