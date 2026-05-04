"use client";

import { useState } from "react";
import { Bitcoin, CreditCard, Loader2, Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CheckoutProvider } from "@/lib/payments/checkout-availability";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import type { VideoTemplateCheckoutPlan } from "@/components/home/video/types";

const RECURRING_PURCHASE_REQUIRES_HIGHER_TIER_ERROR =
  "RECURRING_PURCHASE_REQUIRES_HIGHER_TIER";

const PAYMENT_METHODS: Record<
  CheckoutProvider,
  {
    descriptionKey: string;
    icon: typeof CreditCard;
    labelKey: string;
  }
> = {
  stripe: {
    descriptionKey: "paymentMethods.stripe.description",
    icon: CreditCard,
    labelKey: "paymentMethods.stripe.label",
  },
  paypal: {
    descriptionKey: "paymentMethods.paypal.description",
    icon: Wallet,
    labelKey: "paymentMethods.paypal.label",
  },
  creem: {
    descriptionKey: "paymentMethods.creem.description",
    icon: CreditCard,
    labelKey: "paymentMethods.creem.label",
  },
  nowpayments: {
    descriptionKey: "paymentMethods.nowpayments.description",
    icon: Bitcoin,
    labelKey: "paymentMethods.nowpayments.label",
  },
};

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
  const [loadingProvider, setLoadingProvider] = useState<CheckoutProvider | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const t = useTranslations("Pricing");

  const provider = plan.provider ?? "stripe";
  const isProviderChoice = provider === "all";
  const availableProviders = (plan.providerOptions ?? []) as CheckoutProvider[];

  const defaultCouponCode = provider === "creem"
    ? plan.creemDiscountCode
    : provider === "stripe"
      ? plan.stripeCouponId
      : null;
  const allowManualCoupon =
    !isProviderChoice && Boolean(defaultCouponCode) && plan.enableManualInputCoupon;

  const getCheckoutErrorMessage = (error: unknown) => {
    if (!(error instanceof Error)) {
      return t("errors.unexpected");
    }

    if (error.message === RECURRING_PURCHASE_REQUIRES_HIGHER_TIER_ERROR) {
      return t("errors.recurringHigherTierRequired");
    }

    return error.message;
  };

  const handleCheckout = async (
    selectedProvider: CheckoutProvider = (provider || "stripe") as CheckoutProvider,
    applyCoupon = true,
  ) => {
    if (selectedProvider === "nowpayments") {
      setIsLoading(true);
      setLoadingProvider(selectedProvider);
      try {
        const response = await fetch("/api/nowpayments/checkout", {
          body: JSON.stringify({
            locale: document.documentElement.lang || navigator.language || "en",
            planId: plan.planId,
          }),
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
          throw new Error(result.error || t("errors.nowpaymentsOrderFailed"));
        }

        if (!result.data?.url) {
          throw new Error(t("errors.checkoutUrlMissing"));
        }

        window.location.assign(result.data.url);
      } catch (error) {
        console.error("NOWPayments Checkout Error:", error);
        toast.error(getCheckoutErrorMessage(error));
      } finally {
        setIsLoading(false);
        setLoadingProvider(null);
      }

      return;
    }

    if (selectedProvider === "stripe" && !plan.stripePriceId) {
      toast.error(t("errors.stripePriceMissing"));
      return;
    }

    if (selectedProvider === "creem" && !plan.creemProductId) {
      toast.error(t("errors.creemProductMissing"));
      return;
    }
    if (selectedProvider === "paypal" && !plan.planId) {
      toast.error(t("errors.paypalPlanMissing"));
      return;
    }

    setIsLoading(true);
    setLoadingProvider(selectedProvider);

    try {
      const requestBody: {
        couponCode?: string;
        creemProductId?: string;
        planId?: string;
        provider: string;
        referral?: string;
        stripePriceId?: string;
      } = {
        provider: selectedProvider,
      };

      if (selectedProvider === "stripe") {
        requestBody.stripePriceId = plan.stripePriceId ?? undefined;
        requestBody.couponCode = applyCoupon ? plan.stripeCouponId ?? undefined : undefined;
        requestBody.referral = (window as { tolt_referral?: string }).tolt_referral;
      }

      if (selectedProvider === "creem") {
        requestBody.creemProductId = plan.creemProductId ?? undefined;
        requestBody.couponCode = applyCoupon ? plan.creemDiscountCode ?? undefined : undefined;
      }
      if (selectedProvider === "paypal") {
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
      setLoadingProvider(null);
    }
  };

  const handleButtonClick = () => {
    if (isProviderChoice) {
      if (availableProviders.length === 0) {
        toast.error(t("errors.noPaymentMethods"));
        return;
      }

      if (availableProviders.length === 1) {
        void handleCheckout(availableProviders[0]);
        return;
      }

      setIsPaymentDialogOpen(true);
      return;
    }

    void handleCheckout((provider || "stripe") as CheckoutProvider);
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
        onClick={handleButtonClick}
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
            onClick={() =>
              void handleCheckout((provider || "stripe") as CheckoutProvider, false)
            }
            type="button"
          >
            {t("manualCoupon")}
          </button>
        </div>
      ) : null}
      <Dialog
        open={isPaymentDialogOpen}
        onOpenChange={(open) => {
          if (!isLoading) {
            setIsPaymentDialogOpen(open);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("paymentDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("paymentDialog.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {availableProviders.map((availableProvider, index) => {
              const method = PAYMENT_METHODS[availableProvider];
              const Icon = method.icon;
              const isCurrentLoading =
                isLoading && loadingProvider === availableProvider;

              return (
                <button
                  key={availableProvider}
                  type="button"
                  onClick={() => void handleCheckout(availableProvider)}
                  disabled={isLoading}
                  className="flex w-full items-center gap-3 rounded-lg border bg-background p-4 text-left transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                    {isCurrentLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 font-medium">
                      {t(method.labelKey)}
                      {index === 0 && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {t("paymentDialog.recommended")}
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {t(method.descriptionKey)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
