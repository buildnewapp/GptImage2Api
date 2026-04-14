import Pricing from "@/components/home/template2/Pricing";
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
  const t = await getTranslations({ locale, namespace: "HomeTemplate2" });
  const pricing = t.raw("pricing") as {
    title: string;
    description: string;
  };

  return constructMetadata({
    title: pricing.title,
    description: pricing.description,
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
    </div>
  );
}
