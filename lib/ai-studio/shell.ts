import type { AiStudioCategory } from "@/lib/ai-studio/catalog";
import { isRenderableAssetUrl } from "@/lib/ai-studio/media";

const AI_STUDIO_CATEGORIES = new Set<AiStudioCategory>([
  "video",
  "image",
  "music",
  "chat",
]);

export function parseAiStudioUrlState(
  searchParams: URLSearchParams,
  fallbackCategory: AiStudioCategory,
) {
  const categoryParam = searchParams.get("category");
  const category = AI_STUDIO_CATEGORIES.has(categoryParam as AiStudioCategory)
    ? (categoryParam as AiStudioCategory)
    : fallbackCategory;
  const search = searchParams.get("q")?.trim() ?? "";
  const modelId = searchParams.get("modelId")?.trim() || null;

  return {
    category,
    search,
    modelId,
  };
}

export function buildAiStudioQueryString(input: {
  category: AiStudioCategory;
  search: string;
  modelId: string | null;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set("category", input.category);

  const search = input.search.trim();
  if (search) {
    searchParams.set("q", search);
  }

  if (input.modelId) {
    searchParams.set("modelId", input.modelId);
  }

  return searchParams.toString();
}

export function shouldHydrateAiStudioUrlState(input: {
  hasHydrated: boolean;
  incomingQuery: string;
  lastAppliedQuery: string | null;
}) {
  if (!input.hasHydrated) {
    return true;
  }

  if (!input.lastAppliedQuery) {
    return true;
  }

  return input.incomingQuery === input.lastAppliedQuery;
}

export function collectRenderableMediaUrls(
  mediaUrls: string[],
  raw: unknown,
) {
  const urls = new Set<string>(mediaUrls.filter(isRenderableAssetUrl));

  function maybeParseJsonString(value: string) {
    const trimmed = value.trim();
    if (!trimmed || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) {
      return null;
    }

    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return null;
    }
  }

  function visit(value: unknown) {
    if (!value) {
      return;
    }

    if (typeof value === "string") {
      if (isRenderableAssetUrl(value)) {
        urls.add(value);
      } else {
        const parsed = maybeParseJsonString(value);
        if (parsed) {
          visit(parsed);
        }
      }
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item);
      }
      return;
    }

    if (typeof value === "object") {
      for (const item of Object.values(value as Record<string, unknown>)) {
        visit(item);
      }
    }
  }

  visit(raw);

  return [...urls];
}
