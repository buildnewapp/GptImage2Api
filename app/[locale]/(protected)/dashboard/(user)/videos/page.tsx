import { getTranslations } from "next-intl/server";
import AiStudioVideoHistoryClient from "./AiStudioVideoHistoryClient";

export async function generateMetadata() {
  const t = await getTranslations("VideoGeneration");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function VideosPage() {
  const t = await getTranslations("VideoGeneration");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <AiStudioVideoHistoryClient />
    </div>
  );
}
