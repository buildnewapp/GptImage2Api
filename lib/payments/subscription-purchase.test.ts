import assert from "node:assert/strict";
import test from "node:test";

import {
  getActiveRecurringPrices,
  isHigherTierRecurringPlan,
  requiresHigherTierRecurringPurchase,
} from "@/lib/payments/subscription-purchase";

test("treats a higher price as a higher tier recurring plan", () => {
  assert.equal(isHigherTierRecurringPlan("149.90", "59.90"), true);
});

test("rejects the same recurring price as not higher tier", () => {
  assert.equal(isHigherTierRecurringPlan("59.90", "59.90"), false);
});

test("rejects a lower recurring price as not higher tier", () => {
  assert.equal(isHigherTierRecurringPlan("19.90", "59.90"), false);
});

test("requires a higher tier when any existing recurring order is higher priced", () => {
  assert.equal(
    requiresHigherTierRecurringPurchase("59.90", ["149.90", "19.90"]),
    true,
  );
});

test("allows recurring purchase when target is higher than all current prices", () => {
  assert.equal(
    requiresHigherTierRecurringPurchase("149.90", ["59.90", "19.90"]),
    false,
  );
});

test("ignores expired recurring order prices", () => {
  const now = new Date("2026-05-02T00:00:00.000Z");

  assert.deepEqual(
    getActiveRecurringPrices(
      [
        {
          price: "149.90",
        },
      ],
      [
        {
          expiresAt: new Date("2026-05-01T00:00:00.000Z"),
          price: "59.90",
        },
        {
          expiresAt: new Date("2026-06-01T00:00:00.000Z"),
          price: "89.90",
        },
      ],
      now,
    ),
    ["149.90", "89.90"],
  );
});
