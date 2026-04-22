import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAdminUserQuickActionLinks,
  buildAdminUserScopeLabel,
  getAdminUserTotalCredits,
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
