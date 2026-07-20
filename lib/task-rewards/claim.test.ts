import assert from "node:assert/strict";
import test from "node:test";

import { taskRewardsConfig } from "@/config/task-rewards";
import {
  claimTaskReward,
  createMemoryTaskRewardStore,
  isAutomaticClaimableTaskKey,
} from "@/lib/task-rewards/claim";
import type { AutomaticClaimableTaskKey } from "@/lib/task-rewards/types";

const enabledConfig = {
  ...taskRewardsConfig,
  enabled: true,
};

test("daily check-in can only be claimed once per calendar date", async () => {
  const store = createMemoryTaskRewardStore();
  const now = new Date("2026-03-07T08:00:00.000Z");

  const first = await claimTaskReward({
    store,
    userId: "user-1",
    taskKey: "daily_checkin",
    now,
    config: enabledConfig,
  });
  const second = await claimTaskReward({
    store,
    userId: "user-1",
    taskKey: "daily_checkin",
    now,
    config: enabledConfig,
  });

  assert.equal(first.status, "claimed");
  assert.equal(first.claimKey, "daily_checkin:2026-03-07");
  assert.equal(second.status, "already_claimed");
});

test("fourth daily check-in requires a successful purchase", async () => {
  const store = createMemoryTaskRewardStore({
    claimedDailyCheckinDates: ["2026-03-04", "2026-03-05", "2026-03-06"],
    hasSuccessfulPurchase: false,
  });

  const result = await claimTaskReward({
    store,
    userId: "user-1",
    taskKey: "daily_checkin",
    now: new Date("2026-03-07T08:00:00.000Z"),
    config: enabledConfig,
  });

  assert.equal(result.status, "not_completed");
  assert.equal(result.reason, "requirements");
  assert.equal(store.claims.length, 0);
});

test("daily check-in starts requiring a purchase after three successful claims", async () => {
  const store = createMemoryTaskRewardStore({
    hasSuccessfulPurchase: false,
  });

  const results = [];
  for (const date of ["2026-03-04", "2026-03-05", "2026-03-06", "2026-03-07"]) {
    results.push(
      await claimTaskReward({
        store,
        userId: "user-1",
        taskKey: "daily_checkin",
        now: new Date(`${date}T08:00:00.000Z`),
        config: enabledConfig,
      }),
    );
  }

  assert.deepEqual(
    results.map((result) => result.status),
    ["claimed", "claimed", "claimed", "not_completed"],
  );
});

test("third daily check-in does not require a purchase", async () => {
  const store = createMemoryTaskRewardStore({
    claimedDailyCheckinDates: ["2026-03-05", "2026-03-06"],
    hasSuccessfulPurchase: false,
  });

  const result = await claimTaskReward({
    store,
    userId: "user-1",
    taskKey: "daily_checkin",
    now: new Date("2026-03-07T08:00:00.000Z"),
    config: enabledConfig,
  });

  assert.equal(result.status, "claimed");
});

test("fourth daily check-in succeeds after a successful purchase", async () => {
  const store = createMemoryTaskRewardStore({
    claimedDailyCheckinDates: ["2026-03-04", "2026-03-05", "2026-03-06"],
    hasSuccessfulPurchase: true,
  });

  const result = await claimTaskReward({
    store,
    userId: "user-1",
    taskKey: "daily_checkin",
    now: new Date("2026-03-07T08:00:00.000Z"),
    config: enabledConfig,
  });

  assert.equal(result.status, "claimed");
});

test("public video reward can only be claimed once", async () => {
  const store = createMemoryTaskRewardStore({
    hasSuccessfulPublicGeneration: true,
  });

  const first = await claimTaskReward({
    store,
    userId: "user-1",
    taskKey: "first_public_generation",
    config: enabledConfig,
  });
  const second = await claimTaskReward({
    store,
    userId: "user-1",
    taskKey: "first_public_generation",
    config: enabledConfig,
  });

  assert.equal(first.status, "claimed");
  assert.equal(first.claimKey, "first_public_generation:once");
  assert.equal(second.status, "already_claimed");
});

test("public video reward stays incomplete until the user has a public success video", async () => {
  const store = createMemoryTaskRewardStore({
    hasSuccessfulPublicGeneration: false,
  });

  const result = await claimTaskReward({
    store,
    userId: "user-1",
    taskKey: "first_public_generation",
    config: enabledConfig,
  });

  assert.equal(result.status, "not_completed");
  assert.deepEqual(result.progress, {
    current: 0,
    required: 1,
  });
});

test("three-day check-in reward stays incomplete until the user has signed in three consecutive days", async () => {
  const store = createMemoryTaskRewardStore({
    claimedDailyCheckinDates: ["2026-03-05", "2026-03-06"],
  });

  const result = await claimTaskReward({
    store,
    userId: "user-1",
    taskKey: "checkin_3_days",
    now: new Date("2026-03-07T08:00:00.000Z"),
    config: enabledConfig,
  });

  assert.equal(result.status, "not_completed");
  assert.deepEqual(result.progress, {
    current: 2,
    required: 3,
  });
});

test("three-day check-in reward can be claimed after three consecutive daily check-ins", async () => {
  const store = createMemoryTaskRewardStore({
    claimedDailyCheckinDates: ["2026-03-05", "2026-03-06", "2026-03-07"],
  });

  const result = await claimTaskReward({
    store,
    userId: "user-1",
    taskKey: "checkin_3_days",
    now: new Date("2026-03-07T08:00:00.000Z"),
    config: enabledConfig,
  });

  assert.equal(result.status, "claimed");
  assert.equal(result.claimKey, "checkin_3_days:once");
});

test("first purchase reward requires at least one successful order", async () => {
  const store = createMemoryTaskRewardStore({
    hasSuccessfulPurchase: false,
  });

  const result = await claimTaskReward({
    store,
    userId: "user-1",
    taskKey: "first_purchase",
    config: enabledConfig,
  });

  assert.equal(result.status, "not_completed");
  assert.deepEqual(result.progress, {
    current: 0,
    required: 1,
  });
});

test("only automatic task keys pass the runtime claim whitelist", () => {
  for (const taskKey of [
    "daily_checkin",
    "checkin_3_days",
    "first_public_generation",
    "first_purchase",
  ]) {
    assert.equal(isAutomaticClaimableTaskKey(taskKey), true);
  }

  for (const taskKey of [
    "github_star",
    "huggingface_like",
    "share_twitter",
    "share_facebook",
    "share_tiktok",
    "share_instagram",
    "invite_signup",
    "invite_first_purchase",
    "forged_task",
  ]) {
    assert.equal(isAutomaticClaimableTaskKey(taskKey), false);
  }
});

test("manual-review task keys cannot reach the automatic award path", async () => {
  for (const taskKey of [
    "github_star",
    "huggingface_like",
    "share_twitter",
    "share_facebook",
    "share_tiktok",
    "share_instagram",
  ]) {
    const store = createMemoryTaskRewardStore();
    const result = await claimTaskReward({
      store,
      userId: "user-1",
      taskKey: taskKey as AutomaticClaimableTaskKey,
      config: enabledConfig,
    });

    assert.equal(result.status, "disabled");
    assert.equal(store.claims.length, 0);
  }
});
