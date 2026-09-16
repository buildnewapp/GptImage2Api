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

test("free users receive increasing rewards over repeated seven-day cycles", async () => {
  const store = createMemoryTaskRewardStore({ hasSuccessfulPurchase: false });
  const expected = [10, 20, 30, 40, 50, 60, 70, 10, 20, 30, 40, 50, 60, 70, 10];

  for (const [index, creditAmount] of expected.entries()) {
    const now = new Date("2026-03-01T08:00:00.000Z");
    now.setUTCDate(now.getUTCDate() + index);
    const result = await claimTaskReward({
      store,
      userId: "user-1",
      taskKey: "daily_checkin",
      now,
      config: enabledConfig,
    });
    assert.equal(result.status, "claimed");
    assert.equal(result.creditAmount, creditAmount);
  }

  assert.deepEqual(
    store.claims.map((claim) => claim.creditAmount),
    expected,
  );
  assert.equal(
    store.claims
      .slice(0, 7)
      .reduce((total, claim) => total + claim.creditAmount, 0),
    280,
  );
});

test("missing a day resets the reward even after many free check-ins", async () => {
  const store = createMemoryTaskRewardStore({
    claimedDailyCheckinDates: [
      "2026-03-01",
      "2026-03-02",
      "2026-03-03",
      "2026-03-04",
      "2026-03-05",
    ],
    hasSuccessfulPurchase: false,
  });
  for (const [date, credits] of [
    ["2026-03-07", 10],
    ["2026-03-08", 20],
  ] as const) {
    const result = await claimTaskReward({
      store,
      userId: "user-1",
      taskKey: "daily_checkin",
      now: new Date(`${date}T08:00:00.000Z`),
      config: enabledConfig,
    });
    assert.equal(result.status, "claimed");
    assert.equal(result.creditAmount, credits);
  }
});

test("existing consecutive claims carry forward for both free and paid users", async () => {
  for (const hasSuccessfulPurchase of [false, true]) {
    const store = createMemoryTaskRewardStore({
      claimedDailyCheckinDates: [
        "2026-03-01",
        "2026-03-04",
        "2026-03-05",
        "2026-03-06",
      ],
      hasSuccessfulPurchase,
    });
    const result = await claimTaskReward({
      store,
      userId: "user-1",
      taskKey: "daily_checkin",
      now: new Date("2026-03-07T08:00:00.000Z"),
      config: enabledConfig,
    });
    assert.equal(result.status, "claimed");
    assert.equal(result.creditAmount, 40);
  }
});

test("daily check-ins use UTC midnight and do not advance twice on one UTC date", async () => {
  const store = createMemoryTaskRewardStore({ hasSuccessfulPurchase: false });
  const results = [];
  for (const time of [
    "2026-04-01T07:59:59+08:00",
    "2026-04-01T08:00:00+08:00",
    "2026-04-01T23:59:59+08:00",
  ]) {
    results.push(
      await claimTaskReward({
        store,
        userId: "user-1",
        taskKey: "daily_checkin",
        now: new Date(time),
        config: enabledConfig,
      }),
    );
  }
  assert.deepEqual(
    results.map((result) => result.status),
    ["claimed", "claimed", "already_claimed"],
  );
  assert.deepEqual(
    store.claims.map((claim) => [claim.claimKey, claim.creditAmount]),
    [
      ["daily_checkin:2026-03-31", 10],
      ["daily_checkin:2026-04-01", 20],
    ],
  );
});

test("one user's check-ins do not advance another user's rewards", async () => {
  const store = createMemoryTaskRewardStore({ hasSuccessfulPurchase: false });
  await claimTaskReward({
    store,
    userId: "user-1",
    taskKey: "daily_checkin",
    now: new Date("2026-03-06T08:00:00.000Z"),
    config: enabledConfig,
  });
  const result = await claimTaskReward({
    store,
    userId: "user-2",
    taskKey: "daily_checkin",
    now: new Date("2026-03-07T08:00:00.000Z"),
    config: enabledConfig,
  });
  assert.equal(result.status, "claimed");
  assert.equal(result.creditAmount, 10);
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
    "first_public_generation",
    "first_purchase",
  ]) {
    assert.equal(isAutomaticClaimableTaskKey(taskKey), true);
  }

  for (const taskKey of [
    "checkin_3_days",
    "github_star",
    "huggingface_like",
    "share_twitter",
    "share_facebook",
    "share_tiktok",
    "share_instagram",
    "share_reddit_website",
    "share_reddit_work",
    "reddit_post_popular",
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
    "share_reddit_website",
    "share_reddit_work",
    "reddit_post_popular",
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
