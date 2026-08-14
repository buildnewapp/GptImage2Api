import SeedanceHome from "@/components/home/SeedanceHome";
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
  const t = await getTranslations({ locale, namespace: "Landing.Hero" });

  return constructMetadata({
    title: t("title"),
    description: t("description"),
    locale: locale as Locale,
    path: "/seedance2",
  });
}

export default async function Seedance2Page({
  params,
}: PageProps) {
  const { locale } = await params;

  return <SeedanceHome locale={locale} jsonLdPath="/seedance2" />;
}
