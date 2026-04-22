"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import type { VideoTemplateCheckoutPlan } from "@/components/home/video/types";

const RECURRING_PURCHASE_REQUIRES_HIGHER_TIER_ERROR =
  "RECURRING_PURCHASE_REQUIRES_HIGHER_TIER";

interface VideoPricingActionProps {
  className: string;
  label: string;
  manualCouponClassName?: string;
  plan: VideoTemplateCheckoutPlan;
}

export default function VideoPricingAction({
  className,
  label,
  manualCouponClassName,
  plan,
}: VideoPricingActionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations("Pricing");

  const provider = plan.provider ?? "stripe";
  const isCreem = provider === "creem";
  const isPayPal = provider === "paypal";
  const isStripe = provider === "stripe";

  const defaultCouponCode = isCreem
    ? plan.creemDiscountCode
    : isStripe
      ? plan.stripeCouponId
      : null;
  const allowManualCoupon = Boolean(defaultCouponCode) && plan.enableManualInputCoupon;

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
    if (isStripe && !plan.stripePriceId) {
      toast.error(t("errors.stripePriceMissing"));
      return;
    }

    if (isCreem && !plan.creemProductId) {
      toast.error(t("errors.creemProductMissing"));
      return;
    }
    if (isPayPal && !plan.planId) {
      toast.error(t("errors.paypalPlanMissing"));
      return;
    }

    setIsLoading(true);

    try {
      const requestBody: {
        couponCode?: string;
        creemProductId?: string;
        planId?: string;
        provider: string;
        referral?: string;
        stripePriceId?: string;
      } = {
        provider,
      };

      if (isStripe) {
        requestBody.stripePriceId = plan.stripePriceId ?? undefined;
        requestBody.couponCode = applyCoupon ? plan.stripeCouponId ?? undefined : undefined;
        requestBody.referral = (window as { tolt_referral?: string }).tolt_referral;
      }

      if (isCreem) {
        requestBody.creemProductId = plan.creemProductId ?? undefined;
        requestBody.couponCode = applyCoupon ? plan.creemDiscountCode ?? undefined : undefined;
      }
      if (isPayPal) {
        requestBody.planId = plan.planId ?? undefined;
      }

      const response = await fetch("/api/payment/checkout-session", {
        body: JSON.stringify(requestBody),
        headers: {
          "Accept-Language": document.documentElement.lang || navigator.language || "en",
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          toast.error(t("errors.loginRequired"));
          window.location.assign("/login");
          return;
        }

        throw new Error(
          result.error || t("errors.httpStatus", { status: response.status }),
        );
      }

      if (!result.success) {
        throw new Error(result.error || t("errors.checkoutSessionFailed"));
      }

      if (!result.data?.url) {
        throw new Error(t("errors.checkoutUrlMissing"));
      }

      window.location.assign(result.data.url);
    } catch (error) {
      console.error("Checkout Error:", error);
      toast.error(getCheckoutErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  if (plan.buttonLink) {
    return (
      <a
        className={className}
        href={plan.buttonLink}
        rel="noopener noreferrer nofollow"
        target="_blank"
      >
        {label}
      </a>
    );
  }

  return (
    <div>
      <button
        className={cn(className, isLoading && "cursor-wait")}
        disabled={isLoading}
        onClick={() => void handleCheckout()}
        type="button"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        <span>{label}</span>
      </button>
      {allowManualCoupon ? (
        <div className="mt-3 text-center">
          <button
            className={cn(
              "text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground",
              manualCouponClassName,
            )}
            disabled={isLoading}
            onClick={() => void handleCheckout(false)}
            type="button"
          >
            {t("manualCoupon")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
