export interface YearlyAllocationEntry {
  lastAllocatedMonth: string;
  monthlyCredits: number;
  nextCreditDate: string;
  relatedOrderId: string;
  remainingMonths: number;
}

export type YearlyAllocationMap = Record<string, YearlyAllocationEntry>;

interface DueYearlyGrant {
  allocationDate: Date;
  amount: number;
  relatedOrderId: string;
}

function toPositiveInteger(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  return Math.floor(parsed);
}

function formatYearMonth(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function addOneMonth(date: Date): Date {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

export function addSubscriptionCreditsBalance(
  currentBalance: number | null | undefined,
  creditsToGrant: number,
): number {
  return Math.max(0, (currentBalance ?? 0) + Math.max(0, creditsToGrant));
}

export function buildYearlyAllocationEntry(params: {
  currentPeriodStart: number;
  monthlyCredits: number;
  orderId: string;
  totalMonths: number;
}): YearlyAllocationEntry {
  const startDate = new Date(params.currentPeriodStart);
  const nextCreditDate = addOneMonth(startDate);

  return {
    relatedOrderId: params.orderId,
    remainingMonths: Math.max(0, params.totalMonths - 1),
    nextCreditDate: nextCreditDate.toISOString(),
    monthlyCredits: params.monthlyCredits,
    lastAllocatedMonth: formatYearMonth(startDate),
  };
}

export function getYearlyAllocationMap(balanceJsonb: unknown): YearlyAllocationMap {
  const source =
    typeof balanceJsonb === "object" && balanceJsonb !== null
      ? (balanceJsonb as Record<string, unknown>)
      : {};

  const allocations = source.yearlyAllocations;
  const normalized: YearlyAllocationMap = {};

  if (typeof allocations === "object" && allocations !== null) {
    for (const [key, value] of Object.entries(allocations as Record<string, unknown>)) {
      if (!value || typeof value !== "object") {
        continue;
      }

      const entry = value as Record<string, unknown>;
      const relatedOrderId = String(entry.relatedOrderId ?? key);
      const nextCreditDate = String(entry.nextCreditDate ?? "");
      const monthlyCredits = toPositiveInteger(entry.monthlyCredits);
      const remainingMonths = toPositiveInteger(entry.remainingMonths);
      const lastAllocatedMonth = String(entry.lastAllocatedMonth ?? "");

      if (!relatedOrderId || !nextCreditDate || !monthlyCredits || !lastAllocatedMonth) {
        continue;
      }

      normalized[key] = {
        relatedOrderId,
        nextCreditDate,
        monthlyCredits,
        remainingMonths,
        lastAllocatedMonth,
      };
    }

    if (Object.keys(normalized).length > 0) {
      return normalized;
    }
  }

  const legacy = source.yearlyAllocationDetails;
  if (!legacy || typeof legacy !== "object") {
    return normalized;
  }

  const entry = legacy as Record<string, unknown>;
  const relatedOrderId = String(entry.relatedOrderId ?? "");
  const nextCreditDate = String(entry.nextCreditDate ?? "");
  const monthlyCredits = toPositiveInteger(entry.monthlyCredits);
  const remainingMonths = toPositiveInteger(entry.remainingMonths);
  const lastAllocatedMonth = String(entry.lastAllocatedMonth ?? "");

  if (!relatedOrderId || !nextCreditDate || !monthlyCredits || !lastAllocatedMonth) {
    return normalized;
  }

  normalized[relatedOrderId] = {
    relatedOrderId,
    nextCreditDate,
    monthlyCredits,
    remainingMonths,
    lastAllocatedMonth,
  };

  return normalized;
}

export function mergeYearlyAllocation(balanceJsonb: unknown, entry: YearlyAllocationEntry) {
  const source =
    typeof balanceJsonb === "object" && balanceJsonb !== null
      ? { ...(balanceJsonb as Record<string, unknown>) }
      : {};
  const existingAllocations = getYearlyAllocationMap(source);

  delete source.yearlyAllocationDetails;

  const yearlyAllocations = {
    ...existingAllocations,
    [entry.relatedOrderId]: entry,
  };

  return {
    ...source,
    yearlyAllocations,
  };
}

export function getNextYearlyCreditDate(balanceJsonb: unknown): string | null {
  const allocations = Object.values(getYearlyAllocationMap(balanceJsonb));

  if (allocations.length === 0) {
    return null;
  }

  return allocations
    .map((entry) => entry.nextCreditDate)
    .sort((left, right) => new Date(left).getTime() - new Date(right).getTime())[0] ?? null;
}

export function applyDueYearlyAllocations(params: {
  balanceJsonb: unknown;
  currentBalance: number | null | undefined;
  now?: Date;
}): {
  grants: DueYearlyGrant[];
  nextBalance: number;
  nextBalanceJsonb: Record<string, unknown>;
} {
  const source =
    typeof params.balanceJsonb === "object" && params.balanceJsonb !== null
      ? { ...(params.balanceJsonb as Record<string, unknown>) }
      : {};
  const allocations = { ...getYearlyAllocationMap(source) };
  const grants: DueYearlyGrant[] = [];
  const now = params.now ?? new Date();

  for (const [key, allocation] of Object.entries(allocations)) {
    let nextCreditDate = new Date(allocation.nextCreditDate);
    let remainingMonths = allocation.remainingMonths;
    let lastAllocatedMonth = allocation.lastAllocatedMonth;

    while (
      remainingMonths > 0 &&
      !Number.isNaN(nextCreditDate.getTime()) &&
      nextCreditDate <= now
    ) {
      const yearMonthToAllocate = formatYearMonth(nextCreditDate);
      if (lastAllocatedMonth === yearMonthToAllocate) {
        break;
      }

      grants.push({
        relatedOrderId: allocation.relatedOrderId,
        amount: allocation.monthlyCredits,
        allocationDate: new Date(nextCreditDate),
      });

      remainingMonths -= 1;
      lastAllocatedMonth = yearMonthToAllocate;
      nextCreditDate = addOneMonth(nextCreditDate);
    }

    if (remainingMonths > 0) {
      allocations[key] = {
        ...allocation,
        remainingMonths,
        lastAllocatedMonth,
        nextCreditDate: nextCreditDate.toISOString(),
      };
    } else {
      delete allocations[key];
    }
  }

  delete source.yearlyAllocationDetails;

  const nextBalanceJsonb =
    Object.keys(allocations).length > 0
      ? {
          ...source,
          yearlyAllocations: allocations,
        }
      : (() => {
          const next = { ...source };
          delete next.yearlyAllocations;
          return next;
        })();

  const totalGranted = grants.reduce((sum, grant) => sum + grant.amount, 0);

  return {
    grants,
    nextBalance: addSubscriptionCreditsBalance(params.currentBalance, totalGranted),
    nextBalanceJsonb,
  };
}
