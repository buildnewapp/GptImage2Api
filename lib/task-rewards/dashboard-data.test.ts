import assert from "node:assert/strict";
import test from "node:test";

import { buildTaskRewardItems } from "@/lib/task-rewards/dashboard-data";

test("three-day check-in shows full progress after the streak reward has already been claimed", () => {
  const tasks = buildTaskRewardItems({
    now: new Date("2026-03-07T08:00:00.000Z"),
    claimLookup: new Set(["checkin_3_days:once"]),
    claimedStreakDates: new Set(["2026-03-07"]),
    hasPublicGeneration: false,
    hasPurchase: false,
    inviteCount: 0,
    hasInviteFirstPurchase: false,
  });

  const task = tasks.find((item) => item.taskKey === "checkin_3_days");

  assert.ok(task);
  assert.equal(task.status, "claimed");
  assert.deepEqual(task.progress, {
    current: 3,
    required: 3,
  });
});

test("first purchase task links to the pricing section", () => {
  const tasks = buildTaskRewardItems({
    now: new Date("2026-03-07T08:00:00.000Z"),
    claimLookup: new Set<string>(),
    claimedStreakDates: new Set<string>(),
    hasPublicGeneration: false,
    hasPurchase: false,
    inviteCount: 0,
    hasInviteFirstPurchase: false,
  });

  const task = tasks.find((item) => item.taskKey === "first_purchase");

  assert.ok(task);
  assert.equal(task.href, "/#pricing");
});

test("invite signup stays a referral progress card instead of a claimable credit reward", () => {
  const tasks = buildTaskRewardItems({
    now: new Date("2026-03-07T08:00:00.000Z"),
    claimLookup: new Set<string>(),
    claimedStreakDates: new Set<string>(),
    hasPublicGeneration: false,
    hasPurchase: false,
    inviteCount: 1,
    hasInviteFirstPurchase: false,
  });

  const task = tasks.find((item) => item.taskKey === "invite_signup");

  assert.ok(task);
  assert.equal(task.status, "completed");
  assert.equal(task.creditAmount, null);
  assert.equal(task.href, "/dashboard/referrals");
  assert.deepEqual(task.progress, {
    current: 1,
    required: 1,
  });
});

test("first public generation task links to the AI Studio videos page", () => {
  const tasks = buildTaskRewardItems({
    now: new Date("2026-03-07T08:00:00.000Z"),
    claimLookup: new Set<string>(),
    claimedStreakDates: new Set<string>(),
    hasPublicGeneration: false,
    hasPurchase: false,
    inviteCount: 0,
    hasInviteFirstPurchase: false,
  });

  const task = tasks.find((item) => item.taskKey === "first_public_generation");

  assert.ok(task);
  assert.equal(task.href, "/dashboard/videos");
});
