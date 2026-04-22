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
}: {
  existingInitialOrder: {
    paymentId: string | null;
  } | null;
  paymentEventId: string;
}): "attach_to_initial" | "noop" | "create_renewal" | "create_initial" {
  if (!existingInitialOrder) {
    return "create_initial";
  }

  if (!existingInitialOrder.paymentId) {
    return "attach_to_initial";
  }

  if (existingInitialOrder.paymentId === paymentEventId) {
    return "noop";
  }

  return "create_renewal";
}
