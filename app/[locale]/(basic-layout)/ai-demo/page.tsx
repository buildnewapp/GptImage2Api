import AiStudioPage from "@/components/ai-studio/AiStudioPage";
import type { AiStudioCategory } from "@/lib/ai-studio/catalog";

function parseCategory(
  value: string | string[] | undefined,
): AiStudioCategory | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "video" ||
    candidate === "image" ||
    candidate === "music" ||
    candidate === "chat"
    ? candidate
    : undefined;
}

type SearchParams = Promise<{
  category?: string | string[];
}>;

export default async function AIHubPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  return <AiStudioPage initialCategory={parseCategory(params.category)} />;
}
