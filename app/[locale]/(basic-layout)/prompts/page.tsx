import PromptsPage from "@/components/prompts/PromptsPage";
import { Locale } from "@/i18n/routing";
import { getPublicPromptGalleryItems } from "@/lib/prompt-gallery";
import { constructMetadata } from "@/lib/metadata";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Prompts" });

  return constructMetadata({
    title: t("list.title"),
    description: t("list.description"),
    locale: locale as Locale,
    path: "/prompts",
  });
}

export default async function Prompts({ params }: { params: Params }) {
  const { locale } = await params;
  const items = await getPublicPromptGalleryItems(locale);

  return <PromptsPage items={items} />;
}
