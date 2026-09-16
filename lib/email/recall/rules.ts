export const RECALL_STEPS = [
  "checkout-help",
  "checkout-coupon",
  "paid-help",
  "signup-help",
  "signup-coupon",
] as const;
export type RecallStep = (typeof RECALL_STEPS)[number];
const HOUR = 60 * 60 * 1000;

export interface RecallState {
  registeredAt: Date | null;
  checkoutAt: Date | null;
  paidAt: Date | null;
  hasPurchased: boolean;
  paymentRefunded: boolean;
  hasSubscription: boolean;
  paymentProcessing: boolean;
  hasPendingCheckout: boolean;
  paused: boolean;
  eligible: boolean;
}

// Select the current step, not every overdue step: downtime must not cause a burst.
export function getRecallStep(
  state: RecallState,
  now: Date,
  startedAt: Date,
): RecallStep | null {
  if (!state.eligible || state.paused) return null;
  const age = (date: Date | null) =>
    date && date >= startedAt ? (now.getTime() - date.getTime()) / HOUR : -1;
  if (state.hasPurchased) {
    const hours = age(state.paidAt);
    return !state.paymentRefunded && hours >= 1 && hours < 72
      ? "paid-help"
      : null;
  }
  if (state.hasSubscription || state.paymentProcessing) return null;
  if (state.checkoutAt) {
    if (!state.hasPendingCheckout) return null;
    const hours = age(state.checkoutAt);
    if (hours >= 6 && hours < 48) return "checkout-coupon";
    if (hours >= 1 && hours < 6) return "checkout-help";
    return null;
  }
  const hours = age(state.registeredAt);
  if (hours >= 24 && hours < 72) return "signup-coupon";
  if (hours >= 2 && hours < 24) return "signup-help";
  return null;
}

export function getRecallIdempotencyKey(
  userId: string,
  step: RecallStep,
): string {
  return `recall:${userId}:${step}`;
}

export function getFounderIdentity(
  siteUrl: string,
  env: Record<string, string | undefined> = process.env,
) {
  const url = new URL(siteUrl);
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("Invalid site URL");
  const domain = url.hostname.replace(/^www\./i, "");
  const name = env.RECALL_FOUNDER_NAME?.trim() || "Jame";
  const email = env.RECALL_FOUNDER_EMAIL?.trim() || `jame@${domain}`;
  if (
    /[\r\n]/.test(name + email) ||
    !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email)
  ) {
    throw new Error("Configure a valid site domain or RECALL_FOUNDER_EMAIL");
  }
  return { name, email };
}
