import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDailyClaimKey,
  buildOnceClaimKey,
  manualReviewTasks,
  taskRewardsConfig,
} from "@/config/task-rewards";

test("builds a daily claim key from the task key and date", () => {
  assert.equal(
    buildDailyClaimKey("daily_checkin", "2026-03-07"),
    "daily_checkin:2026-03-07",
  );
});

test("builds a once-only claim key", () => {
  assert.equal(buildOnceClaimKey("github_star"), "github_star:once");
});

test("exposes the configured task switches for automatic and invite tasks", () => {
  assert.equal(typeof taskRewardsConfig.enabled, "boolean");
  assert.equal(typeof taskRewardsConfig.dailyCheckin.enabled, "boolean");
  assert.equal(typeof taskRewardsConfig.checkin3Days.enabled, "boolean");
  assert.equal(
    typeof taskRewardsConfig.firstPublicGeneration.enabled,
    "boolean",
  );
  assert.equal(typeof taskRewardsConfig.firstPurchase.enabled, "boolean");
  assert.equal(typeof taskRewardsConfig.inviteSignup.enabled, "boolean");
  assert.equal(typeof taskRewardsConfig.inviteFirstPurchase.enabled, "boolean");
});

test("defines six fixed manual-review tasks disabled by default", () => {
  assert.deepEqual(Object.keys(manualReviewTasks), [
    "github_star",
    "huggingface_like",
    "share_twitter",
    "share_facebook",
    "share_tiktok",
    "share_instagram",
  ]);

  for (const task of Object.values(manualReviewTasks)) {
    assert.equal(task.enabled, false);
    assert.equal(task.credits, 10);
    assert.match(task.targetUrl, /^https:\/\//);
    assert.equal("rewardEnabled" in task, false);
    assert.equal("cooldownSeconds" in task, false);
  }
});
