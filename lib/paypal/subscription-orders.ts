export function getInitialPayPalSubscriptionOrderKey(
  subscriptionId: string,
): string {
  return `${subscriptionId}:initial`;
}

export function resolvePayPalSubscriptionOrderAmount({
  lastPaymentAmount,
  planPrice,
}: {
  lastPaymentAmount?: string | null;
  planPrice?: string | null;
}): string {
  return lastPaymentAmount || planPrice || "0.00";
}

export function shouldCreateInitialPayPalSubscriptionOrder({
  hasInitialOrder,
  status,
}: {
  hasInitialOrder: boolean;
  status: string | null | undefined;
}): boolean {
  if (hasInitialOrder) {
    return false;
  }

  return ["active", "trialing"].includes((status || "").toLowerCase());
}

export function getPayPalSubscriptionPaymentEventAction({
  existingInitialOrder,
  paymentEventId,
  paymentEventTime,
}: {
  existingInitialOrder: {
    paymentId: string | null;
    periodEnd: Date | null;
  } | null;
  paymentEventId: string;
  paymentEventTime?: string;
}): "attach_to_initial" | "noop" | "create_renewal" | "create_initial" {
  if (!existingInitialOrder) {
    return "create_initial";
  }

  if (!existingInitialOrder.paymentId) {
    const paymentTime = Date.parse(paymentEventTime ?? "");
    const initialPeriodEnd = existingInitialOrder.periodEnd?.getTime() ?? NaN;
    if (!Number.isFinite(paymentTime) || !Number.isFinite(initialPeriodEnd)) {
      throw new Error("Unable to determine the initial PayPal payment period.");
    }

    // A missing first-payment webhook must not swallow a later renewal.
    if (paymentTime >= initialPeriodEnd) {
      return "create_renewal";
    }
    return "attach_to_initial";
  }

  if (existingInitialOrder.paymentId === paymentEventId) {
    return "noop";
  }

  return "create_renewal";
}
