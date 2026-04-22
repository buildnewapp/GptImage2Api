import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDailyClaimKey,
  buildOnceClaimKey,
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

test("exposes the configured task switches for all supported task types", () => {
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
  assert.equal(typeof taskRewardsConfig.githubStar.enabled, "boolean");
  assert.equal(typeof taskRewardsConfig.huggingFaceLike.enabled, "boolean");
  assert.equal(taskRewardsConfig.githubStar.cooldownSeconds > 0, true);
  assert.equal(taskRewardsConfig.huggingFaceLike.cooldownSeconds > 0, true);
});
