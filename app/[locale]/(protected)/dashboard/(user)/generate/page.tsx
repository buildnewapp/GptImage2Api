import AIVideoStudio from "@/components/ai/AIVideoStudio";
import { constructMetadata } from "@/lib/metadata";
import { Metadata } from "next";
import { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";

type Params = Promise<{ locale: string }>;

type MetadataProps = {
  params: Params;
};

export async function generateMetadata({
  params,
}: MetadataProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "DashboardGenerate",
  });

  return constructMetadata({
    page: "DashboardGenerate",
    title: t("title"),
    description: t("description"),
    locale: locale as Locale,
    path: "/dashboard/generate",
  });
}

export default async function DashboardGeneratePage() {
  const t = await getTranslations("DashboardGenerate");

  return (
    <div>

      <AIVideoStudio />
    </div>
  );
}
