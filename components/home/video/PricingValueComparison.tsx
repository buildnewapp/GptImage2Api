import {
  moduleCardClass,
  subsectionTitleClass,
} from "@/components/home/video/constants";
import { buildPricingValueRows } from "@/components/home/video/pricing-value-data";

function getCopy(locale: string) {
  if (locale === "zh") {
    return {
      credits: "总积分",
      creditsPerDollar: "1$ 可买积分",
      dollarsPerCredit: "1 积分 = $",
      plan: "产品",
      price: "价格",
      purchaseNote: "购买说明",
      title: "套餐积分换算表",
    };
  }

  if (locale === "ja") {
    return {
      credits: "総クレジット",
      creditsPerDollar: "1ドルあたりのクレジット",
      dollarsPerCredit: "1クレジットあたりのドル",
      plan: "プラン",
      price: "価格",
      purchaseNote: "購入条件",
      title: "プラン別クレジット換算表",
    };
  }

  return {
    credits: "Credits",
    creditsPerDollar: "Credits per $1",
    dollarsPerCredit: "$ per Credit",
    plan: "Plan",
    price: "Price",
    purchaseNote: "Purchase Note",
    title: "Credits Value Comparison",
  };
}

export default function PricingValueComparison({ locale }: { locale: string }) {
  const copy = getCopy(locale);
  const rows = buildPricingValueRows({ locale });

  return (
    <div className="container mx-auto px-4 pb-24">
      <div className="mx-auto max-w-5xl">
        <h3 data-aos="fade-up" className={`${subsectionTitleClass} mx-auto mb-12 max-w-4xl text-center`}>
          {copy.title}
        </h3>
        <div data-aos="fade-up" className={`${moduleCardClass} rounded-[calc(var(--radius)+0.45rem)]`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="p-6 text-left font-semibold">{copy.plan}</th>
                  <th className="p-6 text-center font-semibold">{copy.price}</th>
                  <th className="p-6 text-center font-semibold">{copy.credits}</th>
                  <th className="p-6 text-center font-semibold">{copy.purchaseNote}</th>
                  <th className="p-6 text-center font-semibold text-primary">{copy.creditsPerDollar}</th>
                  <th className="p-6 text-center font-semibold text-muted-foreground">{copy.dollarsPerCredit}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.plan} className="border-b last:border-0">
                    <td className="p-6">{row.plan}</td>
                    <td className="p-6 text-center">{row.price}</td>
                    <td className="p-6 text-center">{row.credits.toLocaleString(locale)}</td>
                    <td className="p-6 text-center">{row.purchaseNote}</td>
                    <td className="p-6 text-center">
                      <span className="font-semibold text-primary">{row.creditsPerDollar}</span>
                    </td>
                    <td className="p-6 text-center">
                      <span className="text-muted-foreground">${row.dollarsPerCredit}</span>
                    </td>
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
