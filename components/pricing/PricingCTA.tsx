"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DEFAULT_LOCALE, useRouter } from "@/i18n/routing";
import { pricingPlans as pricingPlansSchema } from "@/lib/db/schema";
import {
  type CheckoutProvider,
  getAvailableCheckoutProviders,
} from "@/lib/payments/checkout-availability";
import { Bitcoin, CreditCard, Loader2, MousePointerClick, Wallet } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

type PricingPlan = typeof pricingPlansSchema.$inferSelect;
const RECURRING_PURCHASE_REQUIRES_HIGHER_TIER_ERROR =
  "RECURRING_PURCHASE_REQUIRES_HIGHER_TIER";

type Params = {
  checkoutMode?: "default" | "nowpayments";
  checkoutAvailabilityEnv?: {
    nowpaymentsEnabled?: boolean;
    paypalEnabled?: boolean;
  };
  plan: PricingPlan;
  localizedPlan: any;
  theme?: "default" | "seedance";
};

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

export default function PricingCTA({
  checkoutMode = "default",
  checkoutAvailabilityEnv,
  plan,
  localizedPlan,
  theme = "default",
}: Params) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<CheckoutProvider | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("Pricing");
  const isSeedanceTheme = theme === "seedance";

  const provider = plan.provider;
  const isCreem = provider === "creem";
  const isPayPal = provider === "paypal";
  const isStripe = provider === "stripe";
  const isNowpaymentsMode = checkoutMode === "nowpayments";
  const isProviderChoice = provider === "all" && !isNowpaymentsMode;
  const availableProviders = getAvailableCheckoutProviders(
    {
      creemProductId: plan.creemProductId,
      currency: plan.currency,
      paypalPlanId: plan.paypalPlanId,
      paymentType: plan.paymentType,
      price: plan.price,
      provider: plan.provider,
      stripePriceId: plan.stripePriceId,
    },
    checkoutAvailabilityEnv,
  );

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
    selectedProvider: CheckoutProvider =
      (provider || "stripe") as CheckoutProvider,
    applyCoupon = true,
  ) => {
    if (isNowpaymentsMode || selectedProvider === "nowpayments") {
      setIsLoading(true);
      setLoadingProvider("nowpayments");
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
        setLoadingProvider(null);
      }

      return;
    }

    const stripePriceId = plan.stripePriceId ?? null;
    if (selectedProvider === "stripe" && !stripePriceId) {
      toast.error(t("errors.stripePriceMissing"));
      return;
    }

    const creemProductId = plan.creemProductId ?? null;
    if (selectedProvider === "creem" && !creemProductId) {
      toast.error(t("errors.creemProductMissing"));
      return;
    }
    if (selectedProvider === "paypal" && !plan.id) {
      toast.error(t("errors.paypalPlanMissing"));
      return;
    }

    setIsLoading(true);
    setLoadingProvider(selectedProvider);
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
        provider: selectedProvider,
      };

      if (selectedProvider === "stripe") {
        requestBody.stripePriceId = stripePriceId!;
        requestBody.couponCode =
          applyCoupon && plan.stripeCouponId ? plan.stripeCouponId : undefined;

        const toltReferral = (window as any).tolt_referral;
        requestBody.referral = toltReferral ?? undefined;
      }
      if (selectedProvider === "creem") {
        requestBody.creemProductId = creemProductId!;
        requestBody.couponCode =
          applyCoupon && plan.creemDiscountCode
            ? plan.creemDiscountCode
            : undefined;
      }
      if (selectedProvider === "paypal") {
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
        setLoadingProvider(null);
      } else {
        throw new Error(t("errors.checkoutUrlMissing"));
      }
    } catch (error) {
      console.error("Checkout Error:", error);
      toast.error(getCheckoutErrorMessage(error));
      setIsLoading(false);
      setLoadingProvider(null);
    }
  };

  let defaultCouponCode = null;
  if (isNowpaymentsMode || isProviderChoice) {
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

  const handleButtonClick = () => {
    if (isProviderChoice) {
      if (availableProviders.length === 0) {
        toast.error(t("errors.noPaymentMethods"));
        return;
      }

      if (availableProviders.length === 1) {
        handleCheckout(availableProviders[0]);
        return;
      }

      setIsPaymentDialogOpen(true);
      return;
    }

    handleCheckout((provider || "stripe") as CheckoutProvider);
  };

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
          onClick: handleButtonClick,
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
            onClick={() =>
              handleCheckout((provider || "stripe") as CheckoutProvider, false)
            }
            disabled={isLoading}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 underline underline-offset-2"
          >
            {t("manualCoupon")}
          </button>
        </div>
      )}
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
                  onClick={() => handleCheckout(availableProvider)}
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
