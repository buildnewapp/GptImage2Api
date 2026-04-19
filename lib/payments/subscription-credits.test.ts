import assert from "node:assert/strict";
import test from "node:test";

import {
  addSubscriptionCreditsBalance,
  applyDueYearlyAllocations,
  buildYearlyAllocationEntry,
  getNextYearlyCreditDate,
  getYearlyAllocationMap,
  mergeYearlyAllocation,
} from "@/lib/payments/subscription-credits";

test("adds subscription credits onto the existing balance", () => {
  assert.equal(addSubscriptionCreditsBalance(5400, 1600), 7000);
  assert.equal(addSubscriptionCreditsBalance(null, 1600), 1600);
});

test("merges legacy and new yearly allocations without dropping existing entries", () => {
  const firstEntry = buildYearlyAllocationEntry({
    currentPeriodStart: Date.parse("2026-04-01T00:00:00.000Z"),
    monthlyCredits: 5400,
    orderId: "order_a",
    totalMonths: 12,
  });
  const secondEntry = buildYearlyAllocationEntry({
    currentPeriodStart: Date.parse("2026-04-15T00:00:00.000Z"),
    monthlyCredits: 1600,
    orderId: "order_b",
    totalMonths: 12,
  });

  const merged = mergeYearlyAllocation(
    {
      yearlyAllocationDetails: firstEntry,
    },
    secondEntry,
  );

  assert.deepEqual(Object.keys(getYearlyAllocationMap(merged)).sort(), [
    "order_a",
    "order_b",
  ]);
  assert.equal(getNextYearlyCreditDate(merged), "2026-05-01T00:00:00.000Z");
});

test("applies all due yearly allocations by accumulation and keeps future schedules", () => {
  const result = applyDueYearlyAllocations({
    currentBalance: 7000,
    now: new Date("2026-07-20T00:00:00.000Z"),
    balanceJsonb: {
      yearlyAllocations: {
        order_a: {
          relatedOrderId: "order_a",
          monthlyCredits: 5400,
          remainingMonths: 2,
          nextCreditDate: "2026-06-01T00:00:00.000Z",
          lastAllocatedMonth: "2026-05",
        },
        order_b: {
          relatedOrderId: "order_b",
          monthlyCredits: 1600,
          remainingMonths: 3,
          nextCreditDate: "2026-07-15T00:00:00.000Z",
          lastAllocatedMonth: "2026-06",
        },
      },
    },
  });

  assert.equal(result.nextBalance, 7000 + 5400 + 5400 + 1600);
  assert.deepEqual(
    result.grants.map((grant) => [grant.relatedOrderId, grant.amount]),
    [
      ["order_a", 5400],
      ["order_a", 5400],
      ["order_b", 1600],
    ],
  );
  assert.deepEqual(Object.keys(getYearlyAllocationMap(result.nextBalanceJsonb)), [
    "order_b",
  ]);
});
