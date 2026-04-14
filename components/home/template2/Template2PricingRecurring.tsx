"use client";

import { useState } from "react";
import { Award, Camera, Check, Crown, Rocket } from "lucide-react";

import Template2PricingAction from "@/components/home/template2/Template2PricingAction";
import {
  cardHeadingClass,
  moduleCardClass,
  pricingMaxButtonClass,
  pricingPopularBadgeClass,
  pricingStartedButtonClass,
  pricingToggleActiveClass,
  pricingToggleIdleClass,
  pricingToggleShellClass,
} from "@/components/home/template2/constants";
import type { HomeTemplate2PricingPlan } from "@/components/home/template2/types";

interface Template2PricingRecurringProps {
  monthlyLabel: string;
  monthlyPlans: HomeTemplate2PricingPlan[];
  saveLabel: string;
  yearlyLabel: string;
  yearlyPlans: HomeTemplate2PricingPlan[];
}

const planIconMap = {
  accent: Rocket,
  foreground: Camera,
  primary: Crown,
};

const planIconClasses = {
  accent:
    "border-[hsl(var(--accent)/0.24)] bg-[linear-gradient(145deg,hsl(var(--accent)/0.2),hsl(var(--card))_88%)] text-accent shadow-[0_18px_40px_-28px_hsl(var(--accent)/0.35)]",
  foreground:
    "border-border/85 bg-[linear-gradient(145deg,hsl(var(--secondary)/0.14),hsl(var(--card))_92%)] text-foreground shadow-[0_18px_40px_-28px_rgba(15,23,42,0.42)]",
  primary:
    "border-[hsl(var(--primary)/0.2)] bg-[linear-gradient(145deg,hsl(var(--primary)/0.18),hsl(var(--card))_88%)] text-primary shadow-[0_18px_40px_-28px_hsl(var(--primary)/0.45)]",
};

export default function Template2PricingRecurring({
  monthlyLabel,
  monthlyPlans,
  saveLabel,
  yearlyLabel,
  yearlyPlans,
}: Template2PricingRecurringProps) {
  const hasYearlyPlans = yearlyPlans.length > 0;
  const hasMonthlyPlans = monthlyPlans.length > 0;
  const defaultCycle = hasMonthlyPlans ? "monthly" : "annual";
  const [billingCycle, setBillingCycle] = useState<"annual" | "monthly">(defaultCycle);
  const plans =
    billingCycle === "monthly" && hasMonthlyPlans ? monthlyPlans : yearlyPlans;

  if (!hasMonthlyPlans && !hasYearlyPlans) {
    return null;
  }

  return (
    <>
      <div className="mb-12 flex items-center justify-center gap-3">
        <div data-aos="fade-up" className={pricingToggleShellClass}>
          {hasMonthlyPlans ? (
            <button
              className={
                billingCycle === "monthly"
                  ? pricingToggleActiveClass
                  : pricingToggleIdleClass
              }
              onClick={() => setBillingCycle("monthly")}
              type="button"
            >
              {monthlyLabel}
            </button>
          ) : null}
          {hasYearlyPlans ? (
            <button
              className={`${billingCycle === "annual" ? pricingToggleActiveClass : pricingToggleIdleClass} flex items-center gap-2`}
              onClick={() => setBillingCycle("annual")}
              type="button"
            >
              {yearlyLabel}
              {saveLabel ? (
                <span className="text-[0.95em] font-semibold text-[#5fb0ff]">
                  {saveLabel}
                </span>
              ) : null}
            </button>
          ) : null}
        </div>
      </div>

      {plans.length > 0 ? (
        <div className="mb-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          {plans.map((plan) => {
            const Icon =
              planIconMap[plan.accent as keyof typeof planIconMap] ?? Camera;
            const iconClassName =
              planIconClasses[plan.accent as keyof typeof planIconClasses] ??
              planIconClasses.foreground;
            const buttonClassName = plan.featured
              ? "inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[linear-gradient(135deg,hsl(var(--secondary))_0%,hsl(var(--primary))_100%)] px-7 text-sm font-semibold text-white shadow-[0_22px_38px_-22px_rgba(15,23,42,0.82)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:text-base"
              : plan.accent === "accent"
                ? pricingMaxButtonClass
                : pricingStartedButtonClass;

            return (
              <div key={`${billingCycle}-${plan.name}`}>
                <div
                  data-aos="fade-up"
                  className={`${moduleCardClass} ${
                    plan.featured
                      ? "relative h-full overflow-visible rounded-[calc(var(--radius)+0.45rem)] border-primary p-8"
                      : "relative h-full rounded-[calc(var(--radius)+0.45rem)] p-8"
                  }`}
                >
                  {plan.featured ? (
                    <div className="absolute -top-4 left-1/2 z-10 -translate-x-1/2">
                      <span className={pricingPopularBadgeClass}>
                        {plan.highlightText ?? "Most Popular"}
                      </span>
                    </div>
                  ) : null}
                  <div className="mb-8 text-center">
                    <div className="mb-4 inline-flex">
                      <span
                        className={`relative inline-flex h-14 w-14 items-center justify-center overflow-hidden rounded-[1.4rem] border backdrop-blur-sm before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top,hsl(var(--foreground)/0.08),transparent_65%)] before:opacity-70 ${iconClassName}`}
                      >
                        <span className="relative z-10">
                          <Icon className="h-6 w-6" />
                        </span>
                      </span>
                    </div>
                    <h3 className={`${cardHeadingClass} mb-2`}>{plan.name}</h3>
                    {plan.originalPrice ? (
                      <div className="mb-1 text-sm font-medium text-muted-foreground line-through">
                        {plan.originalPrice}
                      </div>
                    ) : null}
                    <div className="mb-1 text-4xl font-bold">
                      {plan.price}
                      {plan.priceSuffix ? (
                        <span className="text-xl font-normal text-muted-foreground">
                          {plan.priceSuffix.startsWith("/") ? plan.priceSuffix : `/${plan.priceSuffix}`}
                        </span>
                      ) : null}
                    </div>
                    {plan.billed ? (
                      <p className="text-sm text-muted-foreground">{plan.billed}</p>
                    ) : null}
                    {plan.credits || plan.approx ? (
                      <div className="mt-3 space-y-1">
                        {plan.credits ? (
                          <p className="text-sm font-medium text-primary">
                            {plan.credits}
                          </p>
                        ) : null}
                        {plan.approx ? (
                          <p className="text-xs text-muted-foreground">{plan.approx}</p>
                        ) : null}
                      </div>
                    ) : null}
                    {plan.description ? (
                      <p className="mt-3 text-muted-foreground">{plan.description}</p>
                    ) : null}
                  </div>
                  <ul className="mb-8 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature.text} className="flex items-center">
                        {feature.highlight ? (
                          <Award className="mr-3 h-5 w-5 flex-shrink-0 text-amber-500" />
                        ) : (
                          <Check className="mr-3 h-5 w-5 flex-shrink-0 text-primary" />
                        )}
                        <span
                          className={`text-sm ${
                            feature.highlight ? "font-semibold text-primary" : ""
                          }`}
                        >
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {plan.checkoutPlan ? (
                    <Template2PricingAction
                      className={buttonClassName}
                      label={plan.cta}
                      plan={plan.checkoutPlan}
                    />
                  ) : (
                    <button className={buttonClassName} type="button">
                      {plan.cta}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </>
  );
}
