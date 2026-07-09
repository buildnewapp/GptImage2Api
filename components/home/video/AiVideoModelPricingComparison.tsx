import {
  moduleCardClass,
  subsectionTitleClass,
} from "@/components/home/video/constants";
import { buildAiVideoModelPricingGroups } from "@/components/home/video/ai-video-model-pricing-data";
import AiVideoModelPricingTable from "@/components/home/video/AiVideoModelPricingTable";

function getCopy(locale: string) {
  if (locale === "zh") {
    return {
      billingNote: "计费说明",
      creditPrice: "积分价格",
      fixedUnit: "积分",
      hot: "Hot",
      model: "模型",
      modelCount: "个模型",
      perImageUnit: "积分/张",
      perSecondUnit: "积分/秒",
      searchPlaceholder: "搜索模型系列或版本",
      special: "Special",
      spec: "规格",
      title: "AI Video Studio 模型价格表",
      type: "类型",
    };
  }

  if (locale === "ja") {
    return {
      billingNote: "課金ルール",
      creditPrice: "クレジット価格",
      fixedUnit: "クレジット",
      hot: "Hot",
      model: "モデル",
      modelCount: "モデル",
      perImageUnit: "クレジット/枚",
      perSecondUnit: "クレジット/秒",
      searchPlaceholder: "モデル系列またはバージョンを検索",
      special: "Special",
      spec: "仕様",
      title: "AI Video Studio モデル価格表",
      type: "タイプ",
    };
  }

  return {
    billingNote: "Billing Note",
    creditPrice: "Credit Price",
    fixedUnit: "credits",
    hot: "Hot",
    model: "Model",
    modelCount: "models",
    perImageUnit: "credits/image",
    perSecondUnit: "credits/s",
    searchPlaceholder: "Search family or version",
    special: "Special",
    spec: "Spec",
    title: "AI Video Studio Model Pricing",
    type: "Type",
  };
}

export default function AiVideoModelPricingComparison({
  locale,
}: {
  locale: string;
}) {
  const copy = getCopy(locale);
  const groups = buildAiVideoModelPricingGroups({ locale });

  return (
    <div className="container mx-auto px-4 pb-24">
      <div className="mx-auto max-w-6xl">
        <h3
          data-aos="fade-up"
          className={`${subsectionTitleClass} mx-auto mb-12 max-w-4xl text-center`}
        >
          {copy.title}
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
