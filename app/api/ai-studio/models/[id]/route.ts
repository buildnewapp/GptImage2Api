import { getCachedAiStudioCatalogDetail } from "@/lib/ai-studio/catalog";
import { toPublicDocDetail } from "@/lib/ai-studio/public";
import { apiResponse } from "@/lib/api-response";

type Params = Promise<{ id: string }>;

export async function GET(
  _request: Request,
  context: { params: Params },
) {
  try {
    const { id } = await context.params;
    const detail = await getCachedAiStudioCatalogDetail(id);
    if (!detail) {
      return apiResponse.notFound("Model not found");
    }
    return apiResponse.success(toPublicDocDetail(detail));
  } catch (error: any) {
    return apiResponse.serverError(
      error?.message || "Failed to load model detail",
    );
  }
}
