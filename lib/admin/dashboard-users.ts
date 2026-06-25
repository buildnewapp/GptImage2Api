export function getAdminUserTotalCredits(input: {
  subscriptionCreditsBalance?: number | null;
  oneTimeCreditsBalance?: number | null;
}) {
  return (input.subscriptionCreditsBalance ?? 0) + (input.oneTimeCreditsBalance ?? 0);
}

export function buildAdminUserQuickActionLinks({
  locale,
  userId,
}: {
  locale: string;
  userId: string;
}) {
  return {
    orders: `/${locale}/dashboard/orders?userId=${encodeURIComponent(userId)}`,
    credits: `/${locale}/dashboard/credits?userId=${encodeURIComponent(userId)}`,
    generations: `/${locale}/dashboard/ai-studio-admin?userId=${encodeURIComponent(userId)}`,
  };
}

export function buildAdminUserScopeLabel(input: {
  id: string;
  name?: string | null;
  email?: string | null;
}) {
  if (input.name && input.email) {
    return `${input.name} · ${input.email}`;
  }

  return input.name || input.email || input.id;
}

function padDatePart(value: number) {
  return value.toString().padStart(2, "0");
}

function formatArchivedDeletedEmailTimestamp(date: Date) {
  return [
    date.getUTCFullYear(),
    padDatePart(date.getUTCMonth() + 1),
    padDatePart(date.getUTCDate()),
    padDatePart(date.getUTCHours()),
    padDatePart(date.getUTCMinutes()),
    padDatePart(date.getUTCSeconds()),
  ].join("");
}

export function buildArchivedDeletedUserEmail(
  date = new Date(),
  existingEmails: ReadonlySet<string> = new Set(),
) {
  const candidateDate = new Date(date);

  while (true) {
    const candidate = `del_${formatArchivedDeletedEmailTimestamp(candidateDate)}@gmail.com`;
    if (!existingEmails.has(candidate)) {
      return candidate;
    }
    candidateDate.setUTCSeconds(candidateDate.getUTCSeconds() + 1);
  }
}

type ManualBenefitPlanInput = {
  paymentType?: string | null;
  recurringInterval?: string | null;
  benefitsJsonb?: unknown;
};

export type ManualCreditType = "none" | "one_time" | "subscription";

function getPositiveInteger(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  return Math.floor(parsed);
}

function addUtcMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

export function isRecurringManualBenefitPlan(plan: ManualBenefitPlanInput) {
  return plan.paymentType === "recurring";
}

export function getManualOrderTypeForPlan(plan: ManualBenefitPlanInput) {
  return isRecurringManualBenefitPlan(plan)
    ? "subscription_initial"
    : "one_time_purchase";
}

export function getManualCreditDefaultsFromPlan(plan: ManualBenefitPlanInput): {
  creditType: ManualCreditType;
  amount: number;
} {
  const benefits =
    typeof plan.benefitsJsonb === "object" && plan.benefitsJsonb !== null
      ? (plan.benefitsJsonb as Record<string, unknown>)
      : {};

  if (isRecurringManualBenefitPlan(plan)) {
    const amount = getPositiveInteger(benefits.monthlyCredits);
    return {
      creditType: amount > 0 ? "subscription" : "none",
      amount,
    };
  }

  const amount = getPositiveInteger(benefits.oneTimeCredits);
  return {
    creditType: amount > 0 ? "one_time" : "none",
    amount,
  };
}

export function getManualBenefitPeriodEnd(
  plan: Pick<ManualBenefitPlanInput, "recurringInterval">,
  now = new Date(),
) {
  const interval = plan.recurringInterval;
  if (interval === "year" || interval === "every-year") {
    return addUtcMonths(now, 12);
  }

  return addUtcMonths(now, 1);
}
