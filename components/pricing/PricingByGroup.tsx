/**
 * Tips:
 * 1. if you need to display all active pricing cards at once, use PricingAll.tsx
 * 2. If you want to display pricing cards by group_slug, use PricingByGroup.tsx (recommended)
 * 3. If you want to display different pricing cards based on different payment types (monthly, annual, one_time), use PricingByPaymentType.tsx
 *
 * 提示：
 * 1. 如果你希望一次性展示所有定价卡片，请使用 PricingAll.tsx (这个组件)
 * 2. 如果你希望根据 group_slug 字段来分组展示定价卡片，请使用 PricingByGroup.tsx (推荐方式)
 * 3. 如果你希望根据不同的支付类型（monthly, annual, one_time）来展示不同的定价卡片，请使用 PricingByPaymentType.tsx
 */

import { getPublicPricingPlans } from "@/actions/prices/public";
import { PricingCardDisplay } from "@/components/pricing/PricingCardDisplay";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_LOCALE } from "@/i18n/routing";
import { pricingPlans as pricingPlansSchema } from "@/lib/db/schema";
import { isPayPalEnabled } from "@/lib/paypal/client";
import { PricingPlanLangJsonb } from "@/types/pricing";
import { Sparkles } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

type PricingPlan = typeof pricingPlansSchema.$inferSelect;

interface PricingByGroupProps {
  checkoutMode?: "default" | "nowpayments";
}

export default async function PricingByGroup({
  checkoutMode = "default",
}: PricingByGroupProps = {}) {
  const t = await getTranslations("Landing.Pricing");
  const checkoutAvailabilityEnv = {
    nowpaymentsEnabled: Boolean(process.env.NOWPAYMENTS_API_KEY),
    paypalEnabled: isPayPalEnabled,
  };

  const locale = await getLocale();

  let allPlans: PricingPlan[] = [];
  const result = await getPublicPricingPlans();

  if (result.success) {
    allPlans = result.data || [];
  } else {
    console.error("Failed to fetch public pricing plans:", result.error);
  }

  if (checkoutMode === "nowpayments") {
    allPlans = allPlans.filter((plan) => Number(plan.price ?? 0) > 0);
  }

  const annualPlans = allPlans.filter((plan) => plan.groupSlug === "annual");

  const monthlyPlans = allPlans.filter((plan) => plan.groupSlug === "monthly");

  const oneTimePlans = allPlans.filter((plan) => plan.groupSlug === "onetime");

  // dynamically set the default value, priority: annual > monthly > one_time
  const getDefaultValue = () => {
    if (annualPlans.length > 0) return "annual";
    if (monthlyPlans.length > 0) return "monthly";
    if (oneTimePlans.length > 0) return "one_time";
    return "annual"; // fallback
  };

  const renderPlans = (plans: PricingPlan[]) => {
    return (
      <div
        className={`grid gap-8 justify-center items-start ${
          plans.length === 1
            ? "grid-cols-1 max-w-sm mx-auto"
            : plans.length === 2
              ? "grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto"
              : "grid-cols-1 lg:grid-cols-3 max-w-7xl mx-auto"
        }`}
      >
        {plans.map((plan) => {
          const localizedPlan =
            (plan.langJsonb as PricingPlanLangJsonb)?.[locale] ||
            (plan.langJsonb as PricingPlanLangJsonb)?.[DEFAULT_LOCALE];

          if (!localizedPlan) {
            console.warn(
              `Missing localization for locale '${
                locale || DEFAULT_LOCALE
              }' for plan ID ${plan.id}`,
            );
            return null;
          }

          return (
            <PricingCardDisplay
              checkoutAvailabilityEnv={checkoutAvailabilityEnv}
              checkoutMode={checkoutMode}
              id={plan.isHighlighted ? "highlight-card" : undefined}
              key={plan.id}
              plan={plan}
              localizedPlan={localizedPlan}
              theme="seedance"
            />
          );
        })}
      </div>
    );
  };

  return (
    <section
      id="pricing"
      className="py-20 dark:from-slate-900 dark:to-slate-950 relative overflow-hidden"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-40 w-96 h-96 bg-purple-400/5 dark:bg-purple-600/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -left-40 w-96 h-96 bg-blue-400/5 dark:bg-blue-600/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 border py-1.5 px-4 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold text-xs mb-6 tracking-wide uppercase">
            <span>{t("badge")}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-gray-900 dark:text-white">
            {t("title")}
          </h2>
          <p className="text-lg text-gray-600 dark:text-slate-400 max-w-2xl mx-auto mb-8">
            {t("description")}
          </p>
        </div>

        <Tabs defaultValue={getDefaultValue()} className="w-full mx-auto">
          <TabsList className="flex items-center justify-center p-1.5 bg-gray-100 dark:bg-slate-800 rounded-full w-fit max-w-full mx-auto overflow-x-auto">
            {monthlyPlans.length > 0 && (
              <TabsTrigger
                value="monthly"
                className="px-4 md:px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm text-gray-500 dark:text-gray-400"
              >
                {t("monthly")}
              </TabsTrigger>
            )}
            {annualPlans.length > 0 && (
              <TabsTrigger
                value="annual"
                className="px-4 md:px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm text-gray-500 dark:text-gray-400"
              >
                <span className="flex items-center gap-2">
                  {t("annually")}
                  <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-bold">
                    {t("discount")}
                  </span>
                </span>
              </TabsTrigger>
            )}
            {oneTimePlans.length > 0 && (
              <TabsTrigger
                value="one_time"
                className="px-4 md:px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm text-gray-500 dark:text-gray-400"
              >
                {t("onetime")}
              </TabsTrigger>
            )}
          </TabsList>

          {monthlyPlans.length > 0 && (
            <TabsContent value="monthly" className="mt-10">
              {renderPlans(monthlyPlans)}
            </TabsContent>
          )}

          {annualPlans.length > 0 && (
            <TabsContent value="annual" className="mt-10">
              <div className="max-w-lg mx-auto mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="bg-gradient-to-r from-orange-400 to-red-500 rounded-2xl p-1 shadow-lg transform -rotate-1 hover:rotate-0 transition-transform duration-300">
                  <div className="bg-white dark:bg-slate-900 rounded-xl py-3 px-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-orange-500 animate-pulse" />
                      <span className="font-bold text-gray-900 dark:text-white">
                        {t("limitedOffer")}
                      </span>
                    </div>
                    <span className="text-orange-500 font-bold">
                      {t("saveOffer")}
                    </span>
                  </div>
                </div>
              </div>

              {renderPlans(annualPlans)}
            </TabsContent>
          )}

          {oneTimePlans.length > 0 && (
            <TabsContent value="one_time" className="mt-10">
              {renderPlans(oneTimePlans)}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </section>
  );
}
