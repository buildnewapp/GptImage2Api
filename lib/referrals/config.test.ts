import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateFirstOrderCashReward,
  referralConfig,
} from "@/config/referral";

test("returns configured fixed cash reward when reward mode is fixed", () => {
  const reward = calculateFirstOrderCashReward({
    orderAmountUsd: 99,
    rewardMode: "fixed",
    fixedUsd: 5,
    percent: 10,
  });

  assert.equal(reward, 5);
});

test("returns percentage-based cash reward when reward mode is percentage", () => {
  const reward = calculateFirstOrderCashReward({
    orderAmountUsd: 80,
    rewardMode: "percentage",
    fixedUsd: 5,
    percent: 10,
  });

  assert.equal(reward, 8);
});

test("exposes qualification and lock periods from referral config", () => {
  assert.equal(referralConfig.firstOrderQualificationDays, 30);
  assert.equal(referralConfig.cashRewardLockDays, 30);
  assert.equal(referralConfig.inviteCodeMinLength, 4);
  assert.equal(referralConfig.inviteCodePostCreationChangeLimit, 1);
});
