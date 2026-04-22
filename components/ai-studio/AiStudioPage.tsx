import AiStudioShell from "@/components/ai-studio/AiStudioShell";
import type { AiStudioCategory } from "@/lib/ai-studio/catalog";

export default function AiStudioPage({
  initialCategory,
}: {
  initialCategory?: AiStudioCategory;
}) {
  return <AiStudioShell initialCategory={initialCategory} />;
}
