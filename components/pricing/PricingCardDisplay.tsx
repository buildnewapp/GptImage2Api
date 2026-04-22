import PricingCTA from "@/components/pricing/PricingCTA";
import { pricingPlans as pricingPlansSchema } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { PricingPlanFeature, PricingPlanTranslation } from "@/types/pricing";
import { Check, X } from "lucide-react";

type PricingPlan = typeof pricingPlansSchema.$inferSelect;

interface PricingCardDisplayProps {
  checkoutMode?: "default" | "nowpayments";
  id?: string;
  plan: PricingPlan;
  localizedPlan: PricingPlanTranslation;
  theme?: "default" | "seedance";
}

export function PricingCardDisplay({
  checkoutMode = "default",
  id,
  plan,
  localizedPlan,
  theme = "default",
}: PricingCardDisplayProps) {
  const isSeedanceTheme = theme === "seedance";
  const cardTitle =
    localizedPlan?.cardTitle || plan.cardTitle || "Unnamed Plan";
  const cardDescription =
    localizedPlan?.cardDescription || plan.cardDescription || "";
  const displayPrice = localizedPlan?.displayPrice || plan.displayPrice || "";
  const originalPrice = localizedPlan?.originalPrice || plan.originalPrice;
  const priceSuffix =
    localizedPlan?.priceSuffix?.replace(/^\/+/, "") ||
    plan.priceSuffix?.replace(/^\/+/, "");
  const features = localizedPlan?.features || plan.features || [];
  const highlightText = localizedPlan?.highlightText;

  return (
    <div
      id={id}
      className={cn(
        isSeedanceTheme
          ? cn(
              "relative rounded-3xl p-8 shadow-xl border flex flex-col transition-all duration-300 hover:-translate-y-1",
              plan.isHighlighted
                ? "bg-black dark:bg-slate-900 border-2 border-purple-500 shadow-2xl z-10 scale-105"
                : "bg-white dark:bg-slate-800 border-gray-100 dark:border-gray-700",
            )
          : cn(
              "border rounded-xl shadow-xs border-t-4 border-gray-300 dark:border-gray-600",
              "hover:border-primary dark:hover:border-primary hover:scale-105 hover:shadow-xl transition-all duration-300",
              plan.isHighlighted
                ? "border-primary dark:border-primary relative z-10 px-8 py-12 -my-4"
                : "p-8",
            ),
      )}
    >
      {plan.isHighlighted && highlightText && (
        <div
          className={cn(
            isSeedanceTheme
              ? "absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg whitespace-nowrap"
              : "absolute -top-px right-0 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-bl-lg rounded-tr-lg font-medium",
          )}
        >
          {highlightText}
        </div>
      )}
      <h3
        className={cn(
          "text-2xl font-semibold mb-2",
          isSeedanceTheme &&
            (plan.isHighlighted
              ? "text-white"
              : "text-gray-900 dark:text-white"),
        )}
      >
        {cardTitle}
      </h3>
      {cardDescription && (
        <p
          className={cn(
            "mb-6 h-12",
            isSeedanceTheme
              ? plan.isHighlighted
                ? "text-sm text-gray-400"
                : "text-sm text-gray-500 dark:text-gray-400"
              : "text-muted-foreground",
          )}
        >
          {cardDescription}
        </p>
      )}

      <PricingCTA
        checkoutMode={checkoutMode}
        plan={plan}
        localizedPlan={localizedPlan}
        theme={theme}
      />

      <div className={cn("mb-6", isSeedanceTheme ? "text-4xl" : "text-4xl")}>
        {originalPrice ? (
          <span
            className={cn(
              "text-sm line-through decoration-2 mr-1",
              isSeedanceTheme ? "text-gray-400" : "text-muted-foreground",
            )}
          >
            {originalPrice}
          </span>
        ) : null}

        <span
          className={cn(
            "font-extrabold",
            isSeedanceTheme &&
              (plan.isHighlighted
                ? "text-white"
                : "text-gray-900 dark:text-white"),
          )}
        >
          {displayPrice}
        </span>

        {priceSuffix ? (
          <span
            className={cn(
              "text-sm",
              isSeedanceTheme
                ? plan.isHighlighted
                  ? "text-gray-400"
                  : "text-gray-500 dark:text-gray-400"
                : "text-muted-foreground",
            )}
          >
            /{priceSuffix}
          </span>
        ) : null}
      </div>
      <ul className="space-y-3 mb-6">
        {(features as PricingPlanFeature[])?.map(
          (
            feature: { description: string; included: boolean; bold?: boolean },
            index: number,
          ) => (
            <li key={index} className="flex items-start gap-3">
              {feature.included ? (
                <Check
                  className={cn(
                    "h-5 w-5 mt-1 shrink-0",
                    isSeedanceTheme
                      ? plan.isHighlighted
                        ? "text-purple-400"
                        : "text-blue-500"
                      : "text-green-500",
                  )}
                />
              ) : (
                <X className="text-red-500 h-5 w-5 mt-1 shrink-0 opacity-50" />
              )}
              <span
                className={cn(
                  feature.included ? "" : "opacity-50",
                  isSeedanceTheme &&
                    (plan.isHighlighted
                      ? feature.included
                        ? "text-gray-300"
                        : "text-gray-500"
                      : "text-gray-600 dark:text-gray-300"),
                  feature.bold ? "font-bold" : "",
                )}
              >
                {feature.description}
              </span>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
