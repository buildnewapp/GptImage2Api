import assert from "node:assert/strict";
import test from "node:test";

import { isHigherTierRecurringPlan } from "@/lib/payments/subscription-purchase";

test("treats a higher price as a higher tier recurring plan", () => {
  assert.equal(isHigherTierRecurringPlan("149.90", "59.90"), true);
});

test("rejects the same recurring price as not higher tier", () => {
  assert.equal(isHigherTierRecurringPlan("59.90", "59.90"), false);
});

test("rejects a lower recurring price as not higher tier", () => {
  assert.equal(isHigherTierRecurringPlan("19.90", "59.90"), false);
});
