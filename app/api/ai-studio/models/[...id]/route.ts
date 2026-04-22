import { getCachedAiStudioCatalogDetail } from "@/lib/ai-studio/catalog";
import {
  canAccessAiStudioModel,
  loadAiStudioPolicyConfig,
} from "@/lib/ai-studio/policy";
import { stripModelDetailPricingFields, toPublicDocDetail } from "@/lib/ai-studio/public";
import { apiResponse } from "@/lib/api-response";
import { getRequestUser } from "@/lib/auth/request-user";

type Params = Promise<{ id: string[] }>;

function normalizeRouteId(segments: string[]) {
  const joined = segments.join("/");

  try {
    return decodeURIComponent(joined);
  } catch {
    return joined;
  }
}

export async function GET(
  request: Request,
  context: { params: Params },
) {
  try {
    const { id } = await context.params;
    const normalizedId = normalizeRouteId(id);
    const [user, detail, policy] = await Promise.all([
      getRequestUser(request),
      getCachedAiStudioCatalogDetail(normalizedId),
      loadAiStudioPolicyConfig(),
    ]);
    if (!detail) {
      return apiResponse.notFound("Model not found");
    }
    if (!canAccessAiStudioModel(detail, { role: user?.role, config: policy })) {
      return apiResponse.notFound("Model not found");
    }
    return apiResponse.success(stripModelDetailPricingFields(toPublicDocDetail(detail)));
  } catch (error: any) {
    return apiResponse.serverError(
      error?.message || "Failed to load model detail",
    );
  }
}
