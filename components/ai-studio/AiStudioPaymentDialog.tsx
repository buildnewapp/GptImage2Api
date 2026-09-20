"use client";

import { getPublicPricingPlans } from "@/actions/prices/public";
import { PricingCardDisplay } from "@/components/pricing/PricingCardDisplay";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DEFAULT_LOCALE, Link } from "@/i18n/routing";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AiStudioPaymentError } from "@/lib/ai-studio/payment-error";
import type { PricingPlanLangJsonb, PublicPricingPlan } from "@/types/pricing";
import { Clock3, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

export default function AiStudioPaymentDialog({
  error,
  onClose,
}: {
  error: AiStudioPaymentError;
  onClose: () => void;
}) {
  const t = useTranslations("AIVideoStudio.payment");
  const locale = useLocale();
  const pricingT = useTranslations("PricingPlans");
  const [plans, setPlans] = useState<PublicPricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const showQueueCountdown =
    error.code === "AI_STUDIO_DAILY_LIMIT" ||
    error.code === "AI_STUDIO_PROVIDER_DAILY_LIMIT";
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const countdown =
    remainingSeconds === null
      ? "--:--"
      : [Math.floor(remainingSeconds / 60), remainingSeconds % 60]
          .map((value) => String(value).padStart(2, "0"))
          .join(":");

  useEffect(() => {
    if (!showQueueCountdown) return;
    const durationSeconds = 500 + Math.floor(Math.random() * 201);
    const deadline = Date.now() + durationSeconds * 1000;
    setRemainingSeconds(durationSeconds);
    const timer = setInterval(() => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemainingSeconds(seconds);
      if (seconds === 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [showQueueCountdown]);

  useEffect(() => {
    let cancelled = false;
    getPublicPricingPlans()
      .then((result) => {
        if (!cancelled && result.success) setPlans(result.data ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const requiredLevel = error.requiredLevel?.toLowerCase() ?? "pro";
  const levels = ["none", "standard", "pro", "max"];
  const purchasablePlans = plans.filter((plan) => {
    if (Number(plan.price) <= 0 || !plan.provider || plan.provider === "none")
      return false;
    if (error.code !== "AI_STUDIO_MEMBERSHIP_REQUIRED") return true;
    const title = plan.cardTitle.toLowerCase();
    const rank = title.includes("max")
      ? 3
      : title.includes("pro")
        ? 2
        : title.includes("standard")
          ? 1
          : 0;
    return rank >= Math.max(1, levels.indexOf(requiredLevel));
  });
  const groups = [
    { value: "monthly", label: pricingT("monthly") },
    { value: "annual", label: pricingT("annually") },
    { value: "onetime", label: pricingT("onetime") },
  ].filter((group) =>
    purchasablePlans.some((plan) => plan.groupSlug === group.value),
  );
  const reasonKey = {
    AI_STUDIO_DAILY_LIMIT: "dailyLimit",
    AI_STUDIO_PROVIDER_DAILY_LIMIT: "providerDailyLimit",
    AI_STUDIO_INSUFFICIENT_CREDITS: "insufficientCredits",
    AI_STUDIO_MEMBERSHIP_REQUIRED: "membershipRequired",
  } as const;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-7xl">
        <DialogHeader className="items-center gap-3 px-2 pb-3 pt-2 text-center sm:text-center">
          {showQueueCountdown && (
            <Clock3 className="h-8 w-8 text-primary" aria-hidden="true" />
          )}
          <DialogTitle className="text-2xl sm:text-3xl">
            {t(showQueueCountdown ? "queueTitle" : "title")}
          </DialogTitle>
          {showQueueCountdown && (
            <div className="space-y-2 py-2">
              <p className="text-sm text-muted-foreground">
                {t("countdownLabel")}
              </p>
              <div
                role="timer"
                aria-live="off"
                aria-label={t("countdownLabel")}
                className="font-mono text-5xl font-semibold tabular-nums tracking-wider text-foreground sm:text-6xl"
              >
                {countdown}
              </div>
            </div>
          )}
          <DialogDescription className="max-w-2xl text-base leading-7">
            {t(reasonKey[error.code], {
              credits: error.requiredCredits ?? 0,
              level: requiredLevel.toUpperCase(),
            })}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div
            className="flex items-center justify-center gap-2 py-12"
            role="status"
          >
            <Loader2 className="h-5 w-5 animate-spin" />
            {t("loading")}
          </div>
        ) : groups.length > 0 ? (
          <Tabs
            defaultValue={
              groups.some((group) => group.value === "annual")
                ? "annual"
                : groups[0].value
            }
            className="border-t pt-6"
          >
            <TabsList className="mx-auto h-auto max-w-full rounded-full p-1.5">
              {groups.map((group) => (
                <TabsTrigger
                  key={group.value}
                  value={group.value}
                  className="rounded-full px-4 py-2 md:px-6"
                >
                  {group.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {groups.map((group) => {
              const groupPlans = purchasablePlans.filter(
                (plan) => plan.groupSlug === group.value,
              );
              return (
                <TabsContent
                  key={group.value}
                  value={group.value}
                  className="mt-8 px-2 pb-4"
                >
                  <div
                    className={`mx-auto grid items-start gap-8 ${groupPlans.length === 1 ? "max-w-sm grid-cols-1" : groupPlans.length === 2 ? "max-w-3xl grid-cols-1 md:grid-cols-2" : "grid-cols-1 lg:grid-cols-3"}`}
                  >
                    {groupPlans.map((plan) => (
                      <PricingCardDisplay
                        key={plan.id}
                        plan={plan}
                        localizedPlan={
                          (plan.langJsonb as PricingPlanLangJsonb)?.[locale] ??
                          (plan.langJsonb as PricingPlanLangJsonb)?.[
                            DEFAULT_LOCALE
                          ] ??
                          {}
                        }
                        theme="seedance"
                      />
                    ))}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        ) : (
          <div className="space-y-3 py-4">
            <p className="text-sm text-muted-foreground">{t("loadFailed")}</p>
            <Button asChild>
              <Link href="/pricing">{t("viewPricing")}</Link>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
