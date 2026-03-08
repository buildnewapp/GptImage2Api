import { getCachedAiStudioCatalog } from "@/lib/ai-studio/catalog";
import { toPublicCatalogEntry } from "@/lib/ai-studio/public";
import { apiResponse } from "@/lib/api-response";

export async function GET() {
  try {
    const entries = (await getCachedAiStudioCatalog()).map(toPublicCatalogEntry);
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
