import assert from "node:assert/strict";
import test from "node:test";
import {
  configuredPricingPlans,
  getPricingPlanById,
  getPricingPlanByProviderId,
  isActivePricingPlan,
} from "@/lib/pricing";

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

test("only permits checkout for active plans in the current payment environment", () => {
  const originalPayEnv = process.env.PAY_ENV;
  const testPlan = configuredPricingPlans.find((plan) => plan.environment === "test");
  const livePlan = configuredPricingPlans.find((plan) => plan.environment === "live");
  assert.ok(testPlan);
  assert.ok(livePlan);

  try {
    process.env.PAY_ENV = "live";
    assert.equal(isActivePricingPlan(livePlan), true);
    assert.equal(isActivePricingPlan(testPlan), false);
    delete process.env.PAY_ENV;
    assert.equal(isActivePricingPlan(testPlan), true);
    assert.equal(isActivePricingPlan(livePlan), false);
    assert.equal(isActivePricingPlan(undefined), false);
  } finally {
    if (originalPayEnv === undefined) delete process.env.PAY_ENV;
    else process.env.PAY_ENV = originalPayEnv;
  }
});

test("resolves inactive configured plans for renewals and refunds without enabling checkout", () => {
  const plan = configuredPricingPlans[0];
  const wasActive = plan.isActive;
  assert.ok(plan.stripePriceId);

  try {
    plan.isActive = false;
    assert.equal(isActivePricingPlan(plan), false);
    assert.equal(getPricingPlanById(plan.id), plan);
    assert.equal(getPricingPlanByProviderId("stripePriceId", plan.stripePriceId), plan);
  } finally {
    plan.isActive = wasActive;
  }
});

test("resolves PayPal subscriptions on shared-provider plans and rejects missing product IDs", () => {
  const plan = configuredPricingPlans.find(
    (item) => item.provider === "all" && item.paypalPlanId,
  );
  assert.ok(plan);
  assert.equal(getPricingPlanByProviderId("paypalPlanId", plan.paypalPlanId), plan);
  assert.equal(getPricingPlanByProviderId("paypalPlanId", null), undefined);
  assert.equal(getPricingPlanByProviderId("paypalPlanId", ""), undefined);
  assert.equal(getPricingPlanById("unknown-plan"), undefined);
});
