import AiVideoModelPricingComparison from "@/components/home/video/AiVideoModelPricingComparison";
import Pricing from "@/components/home/video/Pricing";
import PricingValueComparison from "@/components/home/video/PricingValueComparison";
import { pageShellClass } from "@/components/home/video/constants";
import { buildVideoTemplatePricingSection } from "@/components/home/video/pricing-data";
import { taskRewardsConfig } from "@/config/task-rewards";
import { Locale } from "@/i18n/routing";
import { constructMetadata } from "@/lib/metadata";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

type Params = Promise<{ locale: string }>;
type MetadataProps = { params: Params };
type PricingTaskHubSection = {
  badgeLabel: string;
  buttonLabel: string;
  items: Array<{
    title: string;
  }>;
  title: string;
};

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
  const t = await getTranslations({ locale, namespace: "VideoTemplate" });
  const pricingT = await getTranslations({ locale, namespace: "Pricing" });
  const pricing = buildVideoTemplatePricingSection({
    baseSection: t.raw("pricing"),
    locale,
  });
  const taskHub = pricingT.raw("taskHub") as PricingTaskHubSection;

  return (
    <div className={pageShellClass}>
      <Pricing
        section={pricing}
        taskHub={taskRewardsConfig.enabled ? taskHub : undefined}
      />
      <PricingValueComparison locale={locale} />
      <AiVideoModelPricingComparison locale={locale} />
    </div>
  );
}
