import type { AiStudioPublicCatalogEntry } from "@/lib/ai-studio/public";

function normalizeSearchText(input: string) {
  return input.toLowerCase().trim();
}

export function matchesCatalogSearch(
  entry: Pick<AiStudioPublicCatalogEntry, "id" | "title" | "provider">,
  query: string,
) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return true;
  }

  return [entry.id, entry.title, entry.provider]
    .map(normalizeSearchText)
    .some((value) => value.includes(normalizedQuery));
}
