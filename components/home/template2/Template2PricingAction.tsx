"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

import type { HomeTemplate2CheckoutPlan } from "@/components/home/template2/types";

interface Template2PricingActionProps {
  className: string;
  label: string;
  manualCouponClassName?: string;
  plan: HomeTemplate2CheckoutPlan;
}

export default function Template2PricingAction({
  className,
  label,
  manualCouponClassName,
  plan,
}: Template2PricingActionProps) {
  const [isLoading, setIsLoading] = useState(false);

  const provider = plan.provider ?? "stripe";
  const isCreem = provider === "creem";
  const isStripe = provider === "stripe";

  const defaultCouponCode = isCreem
    ? plan.creemDiscountCode
    : isStripe
      ? plan.stripeCouponId
      : null;
  const allowManualCoupon = Boolean(defaultCouponCode) && plan.enableManualInputCoupon;

  const handleCheckout = async (applyCoupon = true) => {
    if (isStripe && !plan.stripePriceId) {
      console.error("Stripe price ID is missing for this plan.");
      return;
    }

    if (isCreem && !plan.creemProductId) {
      console.error("Creem product ID is missing for this plan.");
      return;
    }

    setIsLoading(true);

    try {
      const requestBody: {
        couponCode?: string;
        creemProductId?: string;
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
          window.location.assign("/login");
          return;
        }

        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      if (!result.success) {
        throw new Error(result.error || "Failed to create checkout session.");
      }

      if (!result.data?.url) {
        throw new Error("Checkout URL not received.");
      }

      window.location.assign(result.data.url);
    } catch (error) {
      console.error("Checkout Error:", error);
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
            I have a different coupon code
          </button>
        </div>
      ) : null}
    </div>
  );
}
