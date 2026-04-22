import {
  moduleCardClass,
  subsectionTitleClass,
} from "@/components/home/video/constants";
import { buildAiVideoModelPricingRows } from "@/components/home/video/ai-video-model-pricing-data";

function getCopy(locale: string) {
  if (locale === "zh") {
    return {
      billingNote: "计费说明",
      creditPrice: "积分价格",
      model: "模型",
      spec: "规格",
      title: "AI Video Studio 模型价格表",
      type: "类型",
    };
  }

  if (locale === "ja") {
    return {
      billingNote: "課金ルール",
      creditPrice: "クレジット価格",
      model: "モデル",
      spec: "仕様",
      title: "AI Video Studio モデル価格表",
      type: "タイプ",
    };
  }

  return {
    billingNote: "Billing Note",
    creditPrice: "Credit Price",
    model: "Model",
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
  const rows = buildAiVideoModelPricingRows({ locale });

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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="p-6 text-left font-semibold">{copy.model}</th>
                  <th className="p-6 text-center font-semibold">{copy.type}</th>
                  <th className="p-6 text-center font-semibold">{copy.spec}</th>
                  <th className="p-6 text-center font-semibold text-primary">{copy.creditPrice}</th>
                  <th className="p-6 text-center font-semibold text-muted-foreground">{copy.billingNote}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.model}-${row.type}-${row.spec}-${index}`} className="border-b last:border-0">
                    <td className="p-6 font-medium">{row.model}</td>
                    <td className="p-6 text-center">{row.type}</td>
                    <td className="p-6 text-center">{row.spec}</td>
                    <td className="p-6 text-center">
                      <span className="font-semibold text-primary">{row.creditPrice}</span>
                    </td>
                    <td className="p-6 text-center text-muted-foreground">{row.billingNote}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
