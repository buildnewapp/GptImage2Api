import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAdminUserQuickActionLinks,
  buildAdminUserScopeLabel,
  getManualBenefitPeriodEnd,
  getManualCreditDefaultsFromPlan,
  getManualOrderTypeForPlan,
  getAdminUserTotalCredits,
  isRecurringManualBenefitPlan,
} from "@/lib/admin/dashboard-users";

test("sums subscription and one-time credits into a current total", () => {
  assert.equal(
    getAdminUserTotalCredits({
      subscriptionCreditsBalance: 120,
      oneTimeCreditsBalance: 30,
    }),
    150,
  );

  assert.equal(
    getAdminUserTotalCredits({
      subscriptionCreditsBalance: null,
      oneTimeCreditsBalance: 8,
    }),
    8,
  );
});

test("builds admin quick action links for orders, credits, and generations", () => {
  assert.deepEqual(
    buildAdminUserQuickActionLinks({
      locale: "en",
      userId: "user-1",
    }),
    {
      orders: "/en/dashboard/orders?userId=user-1",
      credits: "/en/dashboard/credits?userId=user-1",
      generations: "/en/dashboard/ai-studio-admin?userId=user-1",
    },
  );
});

test("prefers name and email when rendering the current user scope label", () => {
  assert.equal(
    buildAdminUserScopeLabel({
      id: "user-1",
      name: "Alice",
      email: "alice@example.com",
    }),
    "Alice · alice@example.com",
  );

  assert.equal(
    buildAdminUserScopeLabel({
      id: "user-2",
      name: null,
      email: "bob@example.com",
    }),
    "bob@example.com",
  );

  assert.equal(
    buildAdminUserScopeLabel({
      id: "user-3",
      name: null,
      email: null,
    }),
    "user-3",
  );
});

test("resolves manual benefit order and subscription behavior from plan type", () => {
  assert.equal(
    getManualOrderTypeForPlan({ paymentType: "recurring" }),
    "subscription_initial",
  );
  assert.equal(
    getManualOrderTypeForPlan({ paymentType: "one_time" }),
    "one_time_purchase",
  );
  assert.equal(
    isRecurringManualBenefitPlan({ paymentType: "recurring" }),
    true,
  );
  assert.equal(
    isRecurringManualBenefitPlan({ paymentType: "onetime" }),
    false,
  );
});

test("builds default manual credit input from selected product benefits", () => {
  assert.deepEqual(
    getManualCreditDefaultsFromPlan({
      paymentType: "one_time",
      benefitsJsonb: { oneTimeCredits: 300, monthlyCredits: 20 },
    }),
    {
      creditType: "one_time",
      amount: 300,
    },
  );

  assert.deepEqual(
    getManualCreditDefaultsFromPlan({
      paymentType: "recurring",
      benefitsJsonb: { oneTimeCredits: 300, monthlyCredits: 20 },
    }),
    {
      creditType: "subscription",
      amount: 20,
    },
  );
});

test("builds default manual benefit period end from recurring interval", () => {
  const now = new Date("2026-05-02T00:00:00.000Z");

  assert.equal(
    getManualBenefitPeriodEnd({ recurringInterval: "month" }, now).toISOString(),
    "2026-06-02T00:00:00.000Z",
  );
  assert.equal(
    getManualBenefitPeriodEnd({ recurringInterval: "every-year" }, now).toISOString(),
    "2027-05-02T00:00:00.000Z",
  );
});
