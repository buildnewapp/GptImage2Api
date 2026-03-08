import { getCachedAiStudioCatalogDetail } from "@/lib/ai-studio/catalog";
import {
  canAccessAiStudioModel,
  loadAiStudioPolicyConfig,
} from "@/lib/ai-studio/policy";
import { toPublicDocDetail } from "@/lib/ai-studio/public";
import { apiResponse } from "@/lib/api-response";
import { getRequestUser } from "@/lib/auth/request-user";

type Params = Promise<{ id: string }>;

export async function GET(
  request: Request,
  context: { params: Params },
) {
  try {
    const { id } = await context.params;
    const [user, detail, policy] = await Promise.all([
      getRequestUser(request),
      getCachedAiStudioCatalogDetail(id),
      loadAiStudioPolicyConfig(),
    ]);
    if (!detail) {
      return apiResponse.notFound("Model not found");
    }
    if (!canAccessAiStudioModel(detail, { role: user?.role, config: policy })) {
      return apiResponse.notFound("Model not found");
    }
    return apiResponse.success(toPublicDocDetail(detail));
  } catch (error: any) {
    return apiResponse.serverError(
      error?.message || "Failed to load model detail",
    );
  }
}
