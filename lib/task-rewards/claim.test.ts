import assert from "node:assert/strict";
import test from "node:test";

import { taskRewardsConfig } from "@/config/task-rewards";
import {
  claimTaskReward,
  createMemoryTaskRewardStore,
} from "@/lib/task-rewards/claim";

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

test("github star reward returns syncing while the cooldown window is still active", async () => {
  const store = createMemoryTaskRewardStore();

  const result = await claimTaskReward({
    store,
    userId: "user-1",
    taskKey: "github_star",
    now: new Date("2026-03-07T08:00:10.000Z"),
    externalTaskStartedAt: "2026-03-07T08:00:00.000Z",
    config: enabledConfig,
  });

  assert.equal(result.status, "not_completed");
  assert.equal(result.reason, "cooldown");
  assert.deepEqual(result.progress, {
    current: 10,
    required: 15,
  });
});

test("hugging face like reward can be claimed after the cooldown window passes", async () => {
  const store = createMemoryTaskRewardStore();

  const result = await claimTaskReward({
    store,
    userId: "user-1",
    taskKey: "huggingface_like",
    now: new Date("2026-03-07T08:00:16.000Z"),
    externalTaskStartedAt: "2026-03-07T08:00:00.000Z",
    config: enabledConfig,
  });

  assert.equal(result.status, "claimed");
  assert.equal(result.claimKey, "huggingface_like:once");
});
