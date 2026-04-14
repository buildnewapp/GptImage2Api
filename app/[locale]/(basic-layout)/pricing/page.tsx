import AiVideoModelPricingComparison from "@/components/home/template2/AiVideoModelPricingComparison";
import Pricing from "@/components/home/template2/Pricing";
import PricingValueComparison from "@/components/home/template2/PricingValueComparison";
import { buildHomeTemplate2PricingSection } from "@/components/home/template2/pricing-data";
import { pageShellClass } from "@/components/home/template2/constants";
import { Locale } from "@/i18n/routing";
import { constructMetadata } from "@/lib/metadata";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

type Params = Promise<{ locale: string }>;
type MetadataProps = { params: Params };

export async function generateMetadata({
  params,
}: MetadataProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Pricing" });

  return constructMetadata({
    title: t("title"),
    description: t("description"),
    locale: locale as Locale,
    path: "/pricing",
  });
}

export default async function PricingPage({ params }: { params: Params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "HomeTemplate2" });
  const pricing = buildHomeTemplate2PricingSection({
    baseSection: t.raw("pricing"),
    locale,
  });

  return (
    <div className={pageShellClass}>
      <Pricing section={pricing} />
      <PricingValueComparison locale={locale} />
      <AiVideoModelPricingComparison locale={locale} />
    </div>
  );
}
