import ImageTemplate from "@/components/home/image/ImageTemplate";
import { routing } from "@/i18n/routing";
import { setRequestLocale } from "next-intl/server";

export const revalidate = 300;
export const dynamic = "force-static";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ImageTemplate />;
}
