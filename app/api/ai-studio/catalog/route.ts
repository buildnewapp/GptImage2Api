import { getCachedAiStudioCatalog } from "@/lib/ai-studio/catalog";
import {
  filterAiStudioCatalogForRole,
  loadAiStudioPolicyConfig,
} from "@/lib/ai-studio/policy";
import { toPublicCatalogEntry } from "@/lib/ai-studio/public";
import { apiResponse } from "@/lib/api-response";
import { getRequestUser } from "@/lib/auth/request-user";

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    const [catalog, policy] = await Promise.all([
      getCachedAiStudioCatalog(),
      loadAiStudioPolicyConfig(),
    ]);
    const entries = filterAiStudioCatalogForRole(catalog, {
      role: user?.role,
      config: policy,
    }).map(toPublicCatalogEntry);
    const grouped = entries.reduce<Record<string, typeof entries>>((acc, entry) => {
      if (!acc[entry.category]) {
        acc[entry.category] = [];
      }
      acc[entry.category].push(entry);
      return acc;
    }, {});

    return apiResponse.success({
      categories: grouped,
      total: entries.length,
    });
  } catch (error: any) {
    return apiResponse.serverError(
      error?.message || "Failed to load AI Studio catalog",
    );
  }
}
