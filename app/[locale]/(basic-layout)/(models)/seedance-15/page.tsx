import Seedance15Home from "@/components/home/Seedance15Home";
import { type Locale } from "@/i18n/routing";
import { constructMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

type Params = Promise<{ locale: string }>;
type PageProps = { params: Params };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "Seedance15.Hero",
  });

  return constructMetadata({
    title: `${t("titlePrefix")} ${t("titleHighlight")}`,
    description: t("description"),
    locale: locale as Locale,
    path: "/seedance-15",
  });
}

export default async function Seedance15Page({
  params,
}: PageProps) {
  const { locale } = await params;

  return <Seedance15Home locale={locale} />;
}
