import Template2PricingAction from "@/components/home/template2/Template2PricingAction";
import Template2PricingRecurring from "@/components/home/template2/Template2PricingRecurring";
import {
  moduleCardClass,
  sectionTitleClass,
  subsectionTitleClass,
} from "@/components/home/template2/constants";
import type { HomeTemplate2Pricing } from "@/components/home/template2/types";

interface PricingProps {
  section: HomeTemplate2Pricing;
}

export default function Pricing({ section }: PricingProps) {
  const yearlyPlans = section.yearlyPlans ?? section.plans;
  const monthlyPlans = section.monthlyPlans ?? [];

  return (
    <section id="pricing" className="py-24">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 data-aos="fade-up" className={`${sectionTitleClass} mx-auto mb-4 max-w-5xl`}>
            {section.title}
          </h2>
          <p data-aos="fade-up" className="mx-auto max-w-3xl text-xl text-muted-foreground">
            {section.description}
          </p>
        </div>

        <Template2PricingRecurring
          monthlyLabel={section.monthlyLabel}
          monthlyPlans={monthlyPlans}
          saveLabel={section.saveLabel}
          yearlyLabel={section.yearlyLabel}
          yearlyPlans={yearlyPlans}
        />

        {section.creditPacks.length > 0 ? (
          <div className="mx-auto mb-24 max-w-5xl">
            <div data-aos="fade-up" className="mb-6 text-center">
              <h3 className={`${subsectionTitleClass} mb-2`}>
                {section.creditPacksTitle}
              </h3>
              <p className="text-muted-foreground">{section.creditPacksDescription}</p>
            </div>
            <div data-aos="fade-up" className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {section.creditPacks.map((pack) => (
                <div
                  key={pack.title}
                  className={`${moduleCardClass} rounded-[calc(var(--radius)+0.45rem)] p-6 ${pack.highlightText ? "border-primary" : ""}`}
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{pack.title}</p>
                      {pack.description ? (
                        <p className="text-sm text-muted-foreground">{pack.description}</p>
                      ) : null}
                    </div>
                    {pack.highlightText ? (
                      <span className="rounded-full bg-[linear-gradient(135deg,#2f7df4_0%,#3b82f6_100%)] px-3 py-1 text-[11px] font-semibold text-white shadow-[0_12px_24px_-18px_rgba(59,130,246,0.75)] dark:text-slate-950">
                        {pack.highlightText}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-lg font-bold">{pack.price}</span>
                    {pack.checkoutPlan ? (
                      <Template2PricingAction
                        className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-full border border-border/80 bg-background/70 px-4 text-xs font-semibold text-foreground ring-offset-background transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                        label={pack.cta}
                        manualCouponClassName="text-[11px]"
                        plan={pack.checkoutPlan}
                      />
                    ) : (
                      <button
                        className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-full border border-border/80 bg-background/70 px-4 text-xs font-semibold text-foreground ring-offset-background transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                        type="button"
                      >
                        {pack.cta}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mx-auto max-w-4xl">
          <h3 data-aos="fade-up" className={`${subsectionTitleClass} mx-auto mb-12 max-w-4xl text-center`}>
            {section.comparisonTitle}
          </h3>
          <div data-aos="fade-up" className={`${moduleCardClass} rounded-[calc(var(--radius)+0.45rem)]`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-6 text-left font-semibold">Feature</th>
                    <th className="p-6 text-center font-semibold text-primary">
                      Seedance 2.0
                    </th>
                    <th className="p-6 text-center font-semibold text-muted-foreground">
                      Other Platforms
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {section.comparisonRows.map((row) => (
                    <tr key={row.feature} className="border-b last:border-0">
                      <td className="p-6">{row.feature}</td>
                      <td className="p-6 text-center">
                        <span className="font-semibold text-primary">
                          {row.seedance}
                        </span>
                      </td>
                      <td className="p-6 text-center">
                        <span className="text-muted-foreground">{row.other}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
