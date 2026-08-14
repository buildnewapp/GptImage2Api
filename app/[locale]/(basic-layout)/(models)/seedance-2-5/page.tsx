import SeedanceHome from "@/components/home/SeedanceHome";
import { type Locale } from "@/i18n/routing";
import { constructMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

type Params = Promise<{ locale: string }>;
type PageProps = { params: Params };

export const revalidate = 300;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "Seedance25.Metadata",
  });

  return constructMetadata({
    title: t("title"),
    description: t("description"),
    locale: locale as Locale,
    path: "/seedance-2-5",
  });
}

export default async function Seedance25Page({ params }: PageProps) {
  const { locale } = await params;

  return (
    <SeedanceHome
      locale={locale}
      namespace="Seedance25"
      initialModelId="video:bytedance-seedance-2-5"
      jsonLdPath="/seedance-2-5"
      pageHref="/seedance-2-5"
    />
  );
}
