import {
  buildAiVideoModelPricingGroups,
  type AiVideoModelPricingCopy,
} from "@/components/home/video/ai-video-model-pricing-data";
import AiVideoModelPricingTable from "@/components/home/video/AiVideoModelPricingTable";
import {
  moduleCardClass,
  subsectionTitleClass,
} from "@/components/home/video/constants";
import { getTranslations } from "next-intl/server";

type AiVideoModelPricingMessages = AiVideoModelPricingCopy & {
  columns: {
    billingNote: string;
    creditPrice: string;
    model: string;
    spec: string;
    type: string;
  };
  filters: {
    hot: string;
    special: string;
  };
  modelCount: string;
  searchPlaceholder: string;
  title: string;
  units: {
    fixed: string;
    perImage: string;
    perSecond: string;
  };
};

export default async function AiVideoModelPricingComparison({
  locale,
}: {
  locale: string;
}) {
  const t = await getTranslations({ locale, namespace: "VideoPricing" });
  const messages = t.raw("dynamic.modelPricing") as AiVideoModelPricingMessages;
  const copy = {
    ...messages.columns,
    fixedUnit: messages.units.fixed,
    hot: messages.filters.hot,
    modelCount: messages.modelCount,
    perImageUnit: messages.units.perImage,
    perSecondUnit: messages.units.perSecond,
    searchPlaceholder: messages.searchPlaceholder,
    special: messages.filters.special,
  };
  const groups = buildAiVideoModelPricingGroups({
    copy: messages,
    locale,
  });

  return (
    <div className="container mx-auto px-4 pb-24">
      <div className="mx-auto max-w-6xl">
        <h3
          data-aos="fade-up"
          className={`${subsectionTitleClass} mx-auto mb-12 max-w-4xl text-center`}
        >
          {messages.title}
        </h3>
        <div
          data-aos="fade-up"
          className={`${moduleCardClass} rounded-[calc(var(--radius)+0.45rem)]`}
        >
          <AiVideoModelPricingTable copy={copy} groups={groups} />
        </div>
      </div>
    </div>
  );
}
