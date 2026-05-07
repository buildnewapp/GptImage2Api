import PromptsPage from "@/components/prompts/PromptsPage";
import { Locale } from "@/i18n/routing";
import { getPublicPromptGalleryItems } from "@/lib/prompt-gallery";
import { constructMetadata } from "@/lib/metadata";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

type Params = Promise<{ locale: string }>;
type SearchParams = Promise<{
  q?: string | string[];
  category?: string | string[];
  model?: string | string[];
  page?: string | string[];
}>;

function getSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function parsePage(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
}

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

export default async function Prompts({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;

  const q = getSearchParamValue(resolvedSearchParams.q).trim();
  const category = getSearchParamValue(resolvedSearchParams.category).trim();
  const model = getSearchParamValue(resolvedSearchParams.model).trim();
  const page = parsePage(getSearchParamValue(resolvedSearchParams.page));

  const data = await getPublicPromptGalleryItems({
    language: locale,
    q,
    category,
    model,
    page,
  });

  return (
    <PromptsPage
      items={data.items}
      categories={data.categories}
      models={data.models}
      totalCount={data.total}
      pageSize={data.pageSize}
    />
  );
}
