import AiStudioPage from "@/components/ai-studio/AiStudioPage";
import { getAiDemoAccessRedirect } from "@/lib/ai-studio/access";
import type { AiStudioCategory } from "@/lib/ai-studio/catalog";
import { isAdmin } from "@/lib/auth/server";
import { redirect } from "next/navigation";

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
  const redirectTo = getAiDemoAccessRedirect(await isAdmin());
  if (redirectTo) {
    redirect(redirectTo);
  }

  const params = await searchParams;
  return <AiStudioPage initialCategory={parseCategory(params.category)} />;
}
