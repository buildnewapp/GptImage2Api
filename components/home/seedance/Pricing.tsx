
"use client";

import { cn } from "@/lib/utils";
import { Check, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";

const Pricing = () => {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annually" | "onetime">("annually");
  const t = useTranslations("Landing.Pricing");

  const mailtoUrl = `mailto:support@sdanceai.com?subject=${encodeURIComponent("Application to use SdanceAI")}&body=${encodeURIComponent("Reason for application:")}`;

  return (
    <section className="py-20 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 relative overflow-hidden" id="pricing">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-40 w-96 h-96 bg-purple-400/5 dark:bg-purple-600/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -left-40 w-96 h-96 bg-blue-400/5 dark:bg-blue-600/5 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 border py-1.5 px-4 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold text-xs mb-6 tracking-wide uppercase">
            {t("badge")}
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-gray-900 dark:text-white">
            {billingCycle === "onetime" ? t("titleOnetime") : t("title")}
          </h2>
          <p className="text-lg text-gray-600 dark:text-slate-400 max-w-2xl mx-auto mb-8">
            {billingCycle === "onetime"
              ? t("descriptionOnetime")
              : t("description")}
          </p>

          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-center p-1.5 bg-gray-100 dark:bg-slate-800 rounded-full w-fit mx-auto">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-medium transition-all duration-200",
                billingCycle === "monthly"
                  ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              {t("monthly")}
            </button>
            <button
              onClick={() => setBillingCycle("annually")}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2",
                billingCycle === "annually"
                  ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              {t("annually")}
              <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-bold">
                {t("discount")}
              </span>
            </button>
            <button
              onClick={() => setBillingCycle("onetime")}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-medium transition-all duration-200",
                billingCycle === "onetime"
                  ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              {t("onetime")}
            </button>
          </div>
        </div>

        {/* Limited Time Offer Banner (Only for Annual) */}
        {billingCycle === "annually" && (
          <div className="max-w-lg mx-auto mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-gradient-to-r from-orange-400 to-red-500 rounded-2xl p-1 shadow-lg transform -rotate-1 hover:rotate-0 transition-transform duration-300">
              <div className="bg-white dark:bg-slate-900 rounded-xl py-3 px-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-orange-500 animate-pulse" />
                  <span className="font-bold text-gray-900 dark:text-white">{t("limitedOffer")}</span>
                </div>
                <span className="text-orange-500 font-bold">{t("saveOffer")}</span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {billingCycle === "onetime" ? (
            /* Credit Packs */
            <>
              {/* Standard Pack */}
              <div className="relative bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col hover:border-blue-500/30 transition-colors">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t("packs.standard.name")}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t("packs.standard.desc")}</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-white">$9.90</span>
                  <span className="text-gray-500 dark:text-gray-400 uppercase text-sm font-semibold ml-2">USD</span>
                </div>
                <a href={mailtoUrl} className="block w-full py-3 px-6 text-center rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors mb-8">
                  {t("buyNow")}
                </a>
                <ul className="space-y-4 flex-1">
                  {(t.raw("packs.standard.features") as string[]).map((feature: string, i: number) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200 font-medium">
                      <Check className="w-5 h-5 text-blue-500 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pro Pack */}
              <div className="relative bg-black dark:bg-slate-900 rounded-3xl p-8 shadow-2xl border-2 border-purple-500 flex flex-col transform scale-105 z-10">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg whitespace-nowrap">
                  {t("bestValue")}
                </div>
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white">{t("packs.pro.name")}</h3>
                  <p className="text-sm text-gray-400 mt-2">{t("packs.pro.desc")}</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-white">$29.90</span>
                  <span className="text-gray-400 uppercase text-sm font-semibold ml-2">USD</span>
                </div>
                <a href={mailtoUrl} className="block w-full py-3 px-6 text-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all mb-8">
                  {t("buyNow")}
                </a>
                <ul className="space-y-4 flex-1">
                  {(t.raw("packs.pro.features") as string[]).map((feature: string, i: number) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-white font-medium">
                      <Check className="w-5 h-5 text-purple-400 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Max Pack */}
              <div className="relative bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col hover:border-blue-500/30 transition-colors">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t("packs.max.name")}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t("packs.max.desc")}</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-white">$79.90</span>
                  <span className="text-gray-500 dark:text-gray-400 uppercase text-sm font-semibold ml-2">USD</span>
                </div>
                <a href={mailtoUrl} className="block w-full py-3 px-6 text-center rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors mb-8">
                  {t("buyNow")}
                </a>
                <ul className="space-y-4 flex-1">
                  {(t.raw("packs.max.features") as string[]).map((feature: string, i: number) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200 font-medium">
                      <Check className="w-5 h-5 text-blue-500 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            /* Subscription Plans (Monthly/Annually) */
            <>
              {/* Standard Plan */}
              <div className="relative bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t("plans.standard.name")}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t("plans.standard.desc")}</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{billingCycle === "annually" ? "$9.90" : "$19.90"}</span>
                  <span className="text-gray-500 dark:text-gray-400">{t("monthShort")}</span>
                  {billingCycle === "annually" && <div className="text-xs text-green-600 font-medium mt-1">{t("billedYearly", { amount: (9.90 * 12).toFixed(2) })}</div>}
                </div>
                <a href={mailtoUrl} className="block w-full py-3 px-6 text-center rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors mb-8">
                  {t("subscribe")}
                </a>
                <ul className="space-y-4 flex-1">
                  {(() => {
                    const features = t.raw("plans.standard.features") as string[];
                    const credits = billingCycle === "annually" ? "1,600" : "2,800";
                    return features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                        <Check className="w-5 h-5 text-blue-500 shrink-0" />
                        <span>{feature.replace("{credits}", credits)}</span>
                      </li>
                    ));
                  })()}
                </ul>
              </div>

              {/* Pro Plan */}
              <div className="relative bg-black dark:bg-slate-900 rounded-3xl p-8 shadow-2xl border-2 border-purple-500 flex flex-col transform scale-105 z-10">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg whitespace-nowrap">
                  {t("mostPopular")}
                </div>
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white">{t("plans.pro.name")}</h3>
                  <p className="text-sm text-gray-400 mt-2">{t("plans.pro.desc")}</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-white">{billingCycle === "annually" ? "$29.90" : "$59.90"}</span>
                  <span className="text-gray-400">{t("monthShort")}</span>
                  {billingCycle === "annually" && <div className="text-xs text-purple-400 font-medium mt-1">{t("billedYearly", { amount: (29.90 * 12).toFixed(2) })}</div>}
                </div>
                <a href={mailtoUrl} className="block w-full py-3 px-6 text-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all mb-8">
                  {t("subscribe")}
                </a>
                <ul className="space-y-4 flex-1">
                  {(() => {
                    const features = t.raw("plans.pro.features") as string[];
                    const credits = billingCycle === "annually" ? "5,400" : "9,600";
                    return features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                        <Check className="w-5 h-5 text-purple-400 shrink-0" />
                        <span>{feature.replace("{credits}", credits)}</span>
                      </li>
                    ));
                  })()}
                </ul>
              </div>

              {/* Max Plan */}
              <div className="relative bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t("plans.max.name")}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t("plans.max.desc")}</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{billingCycle === "annually" ? "$79.90" : "$149.90"}</span>
                  <span className="text-gray-500 dark:text-gray-400">{t("monthShort")}</span>
                  {billingCycle === "annually" && <div className="text-xs text-green-600 font-medium mt-1">{t("billedYearly", { amount: (79.90 * 12).toFixed(2) })}</div>}
                </div>
                <a href={mailtoUrl} className="block w-full py-3 px-6 text-center rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors mb-8">
                  {t("subscribe")}
                </a>
                <ul className="space-y-4 flex-1">
                  {(() => {
                    const features = t.raw("plans.max.features") as string[];
                    const credits = billingCycle === "annually" ? "16,000" : "27,000";
                    return features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                        <Check className="w-5 h-5 text-blue-500 shrink-0" />
                        <span>{feature.replace("{credits}", credits)}</span>
                      </li>
                    ));
                  })()}
                </ul>
              </div>
            </>
          )}
        </div>

        <div className="text-center mt-12">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {billingCycle === "onetime"
              ? t("contactSales")
              : <Link href="#" onClick={() => setBillingCycle("onetime")} className="text-blue-600 hover:underline">{t("checkOnetime")}</Link>}
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
