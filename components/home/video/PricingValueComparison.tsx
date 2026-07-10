import {
  moduleCardClass,
  subsectionTitleClass,
} from "@/components/home/video/constants";
import {
  buildPricingValueRows,
  type PricingValueCopy,
} from "@/components/home/video/pricing-value-data";
import type { VideoPricingSourcePlan } from "@/components/home/video/pricing-data";
import { getTranslations } from "next-intl/server";

type PricingValueTableCopy = PricingValueCopy & {
  columns: {
    credits: string;
    creditsPerDollar: string;
    dollarsPerCredit: string;
    plan: string;
    price: string;
    purchaseNote: string;
  };
  title: string;
};

export default async function PricingValueComparison({
  locale,
  plans,
}: {
  locale: string;
  plans: VideoPricingSourcePlan[];
}) {
  const t = await getTranslations({ locale, namespace: "VideoPricing" });
  const copy = t.raw("dynamic.valueComparison") as PricingValueTableCopy;
  const rows = buildPricingValueRows({ copy, locale, plans });

  return (
    <div className="container mx-auto px-4 pb-24">
      <div className="mx-auto max-w-5xl">
        <h3 data-aos="fade-up" className={`${subsectionTitleClass} mx-auto mb-12 max-w-4xl text-center`}>
          {copy.title}
        </h3>
        <div data-aos="fade-up" className={`${moduleCardClass} rounded-[calc(var(--radius)+0.45rem)]`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b">
                  <th className="whitespace-nowrap p-6 text-left font-semibold">{copy.columns.plan}</th>
                  <th className="whitespace-nowrap p-6 text-center font-semibold">{copy.columns.price}</th>
                  <th className="whitespace-nowrap p-6 text-center font-semibold">{copy.columns.credits}</th>
                  <th className="whitespace-nowrap p-6 text-center font-semibold">{copy.columns.purchaseNote}</th>
                  <th className="whitespace-nowrap p-6 text-center font-semibold text-primary">{copy.columns.creditsPerDollar}</th>
                  <th className="whitespace-nowrap p-6 text-center font-semibold text-muted-foreground">{copy.columns.dollarsPerCredit}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.plan} className="border-b last:border-0">
                    <td className="whitespace-nowrap p-6">{row.plan}</td>
                    <td className="whitespace-nowrap p-6 text-center">{row.price}</td>
                    <td className="whitespace-nowrap p-6 text-center">{row.credits.toLocaleString(locale)}</td>
                    <td className="whitespace-nowrap p-6 text-center">{row.purchaseNote}</td>
                    <td className="whitespace-nowrap p-6 text-center">
                      <span className="font-semibold text-primary">{row.creditsPerDollar}</span>
                    </td>
                    <td className="whitespace-nowrap p-6 text-center">
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
