"use client";

import { DEFAULT_LOCALE } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Props = {
  locale: string;
};

type PollState = {
  kind: "idle" | "pending" | "success" | "error";
  message: string;
};

export default function NowpaymentsStatusBanner({ locale }: Props) {
  const searchParams = useSearchParams();
  const orderNo = searchParams.get("order_no") || "";
  const paymentId = searchParams.get("payment_id") || "";

  const [pollState, setPollState] = useState<PollState>({
    kind: "idle",
    message: "",
  });

  const hasCallbackOrder = useMemo(() => Boolean(orderNo), [orderNo]);

  useEffect(() => {
    if (!hasCallbackOrder) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      for (let attempt = 0; attempt < 12; attempt += 1) {
        if (cancelled) {
          return;
        }

        setPollState({
          kind: "pending",
          message:
            attempt === 0
              ? "Confirming your crypto payment. This may take a moment..."
              : "Payment received. Waiting for final confirmation from NOWPayments...",
        });

        try {
          const params = new URLSearchParams({ order_no: orderNo });
          if (paymentId) {
            params.set("payment_id", paymentId);
          }

          const response = await fetch(`/api/nowpayments/status?${params.toString()}`, {
            headers: {
              "Accept-Language": locale || DEFAULT_LOCALE,
            },
          });
          const result = await response.json();

          if (!response.ok || !result.success) {
            throw new Error(result.error || "Unable to check payment status.");
          }

          if (result.data.status === "succeeded") {
            setPollState({
              kind: "success",
              message: "Payment confirmed. Your purchase is now active.",
            });
            return;
          }

          if (result.data.status === "failed") {
            setPollState({
              kind: "error",
              message: "This payment failed or expired. Please start a new payment.",
            });
            return;
          }
        } catch (error) {
          setPollState({
            kind: "error",
            message:
              error instanceof Error
                ? error.message
                : "Unable to check payment status.",
          });
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 2500));
      }

      setPollState({
        kind: "error",
        message: "We could not confirm the payment yet. Please refresh this page again later.",
      });
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [hasCallbackOrder, locale, orderNo, paymentId]);

  if (pollState.kind === "idle") {
    return null;
  }

  return (
    <div
      className={cn(
        "mx-auto mb-8 max-w-3xl rounded-2xl border px-5 py-4 text-sm",
        pollState.kind === "success" &&
          "border-emerald-200 bg-emerald-50 text-emerald-700",
        pollState.kind === "pending" &&
          "border-amber-200 bg-amber-50 text-amber-700",
        pollState.kind === "error" &&
          "border-rose-200 bg-rose-50 text-rose-700",
      )}
    >
      {pollState.message}
    </div>
  );
}
