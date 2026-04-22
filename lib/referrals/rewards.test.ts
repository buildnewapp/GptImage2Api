import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateCashRewardAmount,
  qualifiesForFirstOrderReward,
} from "@/lib/referrals/rewards";

test("calculates fixed first-order cash rewards", () => {
  const amount = calculateCashRewardAmount({
    orderAmountUsd: 49,
    rewardMode: "fixed",
    fixedUsd: 5,
    percent: 10,
  });

  assert.equal(amount, 5);
});

test("calculates percentage first-order cash rewards", () => {
  const amount = calculateCashRewardAmount({
    orderAmountUsd: 120,
    rewardMode: "percentage",
    fixedUsd: 5,
    percent: 10,
  });

  assert.equal(amount, 12);
});

test("qualifies the first paid order within the referral window", () => {
  const qualified = qualifiesForFirstOrderReward({
    inviteeCreatedAt: new Date("2026-03-01T00:00:00.000Z"),
    orderPaidAt: new Date("2026-03-20T00:00:00.000Z"),
    qualificationDays: 30,
    paidOrderCountBeforeThisOrder: 0,
    hasExistingCashReward: false,
  });

  assert.equal(qualified, true);
});

test("rejects orders outside the qualification window", () => {
  const qualified = qualifiesForFirstOrderReward({
    inviteeCreatedAt: new Date("2026-03-01T00:00:00.000Z"),
    orderPaidAt: new Date("2026-04-10T00:00:00.000Z"),
    qualificationDays: 30,
    paidOrderCountBeforeThisOrder: 0,
    hasExistingCashReward: false,
  });

  assert.equal(qualified, false);
});

test("rejects non-first or already-rewarded orders", () => {
  assert.equal(
    qualifiesForFirstOrderReward({
      inviteeCreatedAt: new Date("2026-03-01T00:00:00.000Z"),
      orderPaidAt: new Date("2026-03-10T00:00:00.000Z"),
      qualificationDays: 30,
      paidOrderCountBeforeThisOrder: 1,
      hasExistingCashReward: false,
    }),
    false
  );

  assert.equal(
    qualifiesForFirstOrderReward({
      inviteeCreatedAt: new Date("2026-03-01T00:00:00.000Z"),
      orderPaidAt: new Date("2026-03-10T00:00:00.000Z"),
      qualificationDays: 30,
      paidOrderCountBeforeThisOrder: 0,
      hasExistingCashReward: true,
    }),
    false
  );
});
