"use client";

import { Button } from "@/components/ui/button";
import { DEFAULT_LOCALE, useRouter } from "@/i18n/routing";
import { pricingPlans as pricingPlansSchema } from "@/lib/db/schema";
import { Loader2, MousePointerClick } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

type PricingPlan = typeof pricingPlansSchema.$inferSelect;
const RECURRING_PURCHASE_REQUIRES_HIGHER_TIER_ERROR =
  "RECURRING_PURCHASE_REQUIRES_HIGHER_TIER";

type Params = {
  checkoutMode?: "default" | "nowpayments";
  plan: PricingPlan;
  localizedPlan: any;
  theme?: "default" | "seedance";
};

export default function PricingCTA({
  checkoutMode = "default",
  plan,
  localizedPlan,
  theme = "default",
}: Params) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("Pricing");
  const isSeedanceTheme = theme === "seedance";

  const provider = plan.provider;
  const isCreem = provider === "creem";
  const isPayPal = provider === "paypal";
  const isStripe = provider === "stripe";
  const isNowpaymentsMode = checkoutMode === "nowpayments";

  const getCheckoutErrorMessage = (error: unknown) => {
    if (!(error instanceof Error)) {
      return t("errors.unexpected");
    }

    if (error.message === RECURRING_PURCHASE_REQUIRES_HIGHER_TIER_ERROR) {
      return t("errors.recurringHigherTierRequired");
    }

    return error.message;
  };

  const handleCheckout = async (applyCoupon = true) => {
    if (isNowpaymentsMode) {
      setIsLoading(true);
      try {
        const response = await fetch("/api/nowpayments/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept-Language": (locale || DEFAULT_LOCALE) as string,
          },
          body: JSON.stringify({
            locale,
            planId: plan.id,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            router.push("/login");
            toast.error(t("errors.loginRequired"));
            return;
          }

          throw new Error(result.error || t("errors.httpStatus", {
            status: response.status,
          }));
        }

        if (!result.success) {
          throw new Error(result.error || t("errors.nowpaymentsOrderFailed"));
        }

        if (result.data?.url) {
          router.push(result.data.url);
          return;
        }

        throw new Error(t("errors.checkoutUrlMissing"));
      } catch (error) {
        console.error("NOWPayments Checkout Error:", error);
        toast.error(getCheckoutErrorMessage(error));
      } finally {
        setIsLoading(false);
      }

      return;
    }

    const stripePriceId = plan.stripePriceId ?? null;
    if (isStripe && !stripePriceId) {
      toast.error(t("errors.stripePriceMissing"));
      return;
    }

    const creemProductId = plan.creemProductId ?? null;
    if (isCreem && !creemProductId) {
      toast.error(t("errors.creemProductMissing"));
      return;
    }

    setIsLoading(true);
    try {
      let requestBody: {
        provider: string;
        couponCode?: string;
        // Stripe
        stripePriceId?: string;
        referral?: string;

        // Creem
        creemProductId?: string;
        planId?: string;
      } = {
        provider: provider || "stripe",
      };

      if (isStripe) {
        requestBody.stripePriceId = stripePriceId!;
        requestBody.couponCode =
          applyCoupon && plan.stripeCouponId ? plan.stripeCouponId : undefined;

        const toltReferral = (window as any).tolt_referral;
        requestBody.referral = toltReferral ?? undefined;
      }
      if (isCreem) {
        requestBody.creemProductId = creemProductId!;
        requestBody.couponCode =
          applyCoupon && plan.creemDiscountCode
            ? plan.creemDiscountCode
            : undefined;
      }
      if (isPayPal) {
        requestBody.planId = plan.id;
      }

      const response = await fetch("/api/payment/checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": (locale || DEFAULT_LOCALE) as string,
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          toast.error(t("errors.loginRequired"));
          return;
        }
        throw new Error(result.error || t("errors.httpStatus", {
          status: response.status,
        }));
      }

      if (!result.success) {
        throw new Error(result.error || t("errors.checkoutSessionFailed"));
      }

      const data = result.data;

      if (data.url) {
        router.push(data.url);
        setIsLoading(false);
      } else {
        throw new Error(t("errors.checkoutUrlMissing"));
      }
    } catch (error) {
      console.error("Checkout Error:", error);
      toast.error(getCheckoutErrorMessage(error));
      setIsLoading(false);
    }
  };

  let defaultCouponCode = null;
  if (isNowpaymentsMode) {
    defaultCouponCode = null;
  } else if (isCreem) {
    defaultCouponCode = plan.creemDiscountCode;
  } else if (isPayPal) {
    defaultCouponCode = null;
  } else if (isStripe) {
    defaultCouponCode = plan.stripeCouponId;
  }

  const allowManualCoupon =
    Boolean(defaultCouponCode) && plan.enableManualInputCoupon;

  return (
    <div>
      <Button
        asChild={!!plan.buttonLink}
        disabled={isLoading}
        className={`w-full flex items-center justify-center gap-2 py-5 font-medium ${
          isSeedanceTheme
            ? plan.isHighlighted
              ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg hover:shadow-purple-500/30"
              : "bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
            : plan.isHighlighted
              ? ""
              : "bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100"
        } ${allowManualCoupon ? "mb-2" : "mb-6"}`}
        {...(!plan.buttonLink && {
          onClick: () => handleCheckout(),
        })}
      >
        {plan.buttonLink ? (
          <Link
            href={plan.buttonLink}
            title={localizedPlan.buttonText || plan.buttonText}
            rel="noopener noreferrer nofollow"
            target="_blank"
            prefetch={false}
          >
            {localizedPlan.buttonText || plan.buttonText}
            {plan.isHighlighted && !isSeedanceTheme && (
              <MousePointerClick className="w-5 h-5" />
            )}
          </Link>
        ) : (
          <>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              localizedPlan.buttonText || plan.buttonText
            )}
            {plan.isHighlighted && !isLoading && !isSeedanceTheme && (
              <MousePointerClick className="w-5 h-5 ml-2" />
            )}
          </>
        )}
      </Button>
      {allowManualCoupon && (
        <div className="text-center mb-2">
          <button
            onClick={() => handleCheckout(false)}
            disabled={isLoading}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 underline underline-offset-2"
          >
            {t("manualCoupon")}
          </button>
        </div>
      )}
    </div>
  );
}
