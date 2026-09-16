export const RECALL_STEPS = [
  "checkout-help",
  "checkout-bonus",
  "paid-help",
  "signup-help",
  "signup-bonus",
] as const;
export type RecallStep = (typeof RECALL_STEPS)[number];
const HOUR = 60 * 60 * 1000;
export const DEFAULT_RECALL_PURCHASE_BONUS_PERCENT = 20;
export const DEFAULT_RECALL_PURCHASE_BONUS_VALID_HOURS = 72;

function readPositiveInteger(
  value: string | undefined,
  fallback: number,
  name: string,
  maximum: number,
) {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > maximum) {
    throw new Error(`${name} must be an integer between 1 and ${maximum}.`);
  }
  return parsed;
}

export function getRecallPurchaseBonusConfig(
  env: Record<string, string | undefined> = process.env,
) {
  return {
    percent: readPositiveInteger(
      env.RECALL_PURCHASE_BONUS_PERCENT,
      DEFAULT_RECALL_PURCHASE_BONUS_PERCENT,
      "RECALL_PURCHASE_BONUS_PERCENT",
      100,
    ),
    validHours: readPositiveInteger(
      env.RECALL_PURCHASE_BONUS_VALID_HOURS,
      DEFAULT_RECALL_PURCHASE_BONUS_VALID_HOURS,
      "RECALL_PURCHASE_BONUS_VALID_HOURS",
      24 * 30,
    ),
  };
}

export function calculateRecallPurchaseBonusCredits(
  baseCredits: number,
  percent: number,
) {
  if (!Number.isFinite(baseCredits) || baseCredits <= 0) return 0;
  if (!Number.isInteger(percent) || percent <= 0 || percent > 100) return 0;
  return Math.floor((baseCredits * percent) / 100);
}

export function resolveRecallPurchaseBonusOffer({
  variables,
  sentAt,
  paidAt,
}: {
  variables: Record<string, unknown>;
  sentAt: Date | null;
  paidAt: Date;
}) {
  const percent = Number(variables.bonusPercent);
  const validHours = Number(variables.bonusValidHours);
  if (
    !sentAt ||
    !Number.isInteger(percent) ||
    percent <= 0 ||
    percent > 100 ||
    !Number.isInteger(validHours) ||
    validHours <= 0 ||
    validHours > 24 * 30
  ) {
    return null;
  }
  const elapsed = paidAt.getTime() - sentAt.getTime();
  if (elapsed < 0 || elapsed > validHours * HOUR) return null;
  return { percent, validHours };
}

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
    if (hours >= 6 && hours < 48) return "checkout-bonus";
    if (hours >= 1 && hours < 6) return "checkout-help";
    return null;
  }
  const hours = age(state.registeredAt);
  if (hours >= 24 && hours < 72) return "signup-bonus";
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
  const name =
    env.RECALL_FOUNDER_NAME?.trim() || env.ADMIN_NAME?.trim() || "Jame";
  let email =
    env.RECALL_FOUNDER_EMAIL?.trim() || env.ADMIN_EMAIL?.trim() || "";
  if (!email) {
    const url = new URL(siteUrl);
    if (!["http:", "https:"].includes(url.protocol))
      throw new Error("Invalid site URL");
    const domain = url.hostname.replace(/^www\./i, "");
    email = `jame@${domain}`;
  }
  if (
    /[\r\n]/.test(name + email) ||
    !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email)
  ) {
    throw new Error(
      "Configure RECALL_FOUNDER_EMAIL, ADMIN_EMAIL, or a valid site domain",
    );
  }
  return { name, email };
}
