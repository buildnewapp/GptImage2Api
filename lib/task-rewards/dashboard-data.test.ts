import assert from "node:assert/strict";
import test from "node:test";

import type { ManualReviewTaskKey } from "@/config/task-rewards";
import { buildOnceClaimKey, manualReviewTasks } from "@/config/task-rewards";
import type { RewardApplicationRecord } from "@/lib/task-rewards/application-store";
import {
  buildLatestManualApplicationLookup,
  buildTaskRewardItems,
} from "@/lib/task-rewards/dashboard-data";

const dashboardNow = new Date("2026-03-07T08:00:00.000Z");

function buildDashboardItems({
  claimLookup = new Set<string>(),
  latestManualApplications = new Map<
    ManualReviewTaskKey,
    RewardApplicationRecord
  >(),
}: {
  claimLookup?: Set<string>;
  latestManualApplications?: Map<ManualReviewTaskKey, RewardApplicationRecord>;
} = {}) {
  return buildTaskRewardItems({
    now: dashboardNow,
    claimLookup,
    claimedStreakDates: new Set<string>(),
    hasPublicGeneration: false,
    hasPurchase: false,
    inviteCount: 0,
    hasInviteFirstPurchase: false,
    latestManualApplications,
  });
}

function manualApplication(
  status: "pending" | "approved" | "rejected",
  overrides: Partial<RewardApplicationRecord> = {},
): RewardApplicationRecord {
  return {
    id: "application-1",
    userId: "user-1",
    taskKey: "github_star",
    source: "user",
    status,
    creditAmount: 10,
    evidenceKeys: ["sealed-evidence.png"],
    submissionText: "I completed the task.",
    reviewNote: status === "rejected" ? "The profile was not visible." : null,
    reviewedByUserId: status === "pending" ? null : "reviewer-1",
    submittedAt: dashboardNow,
    reviewedAt: status === "pending" ? null : dashboardNow,
    createdAt: dashboardNow,
    updatedAt: dashboardNow,
    ...overrides,
  };
}

async function withEnabledGithubTask<T>(run: () => T | Promise<T>): Promise<T> {
  const previous = manualReviewTasks.github_star.enabled;
  manualReviewTasks.github_star.enabled = true;
  try {
    return await run();
  } finally {
    manualReviewTasks.github_star.enabled = previous;
  }
}

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

test("disabled manual-review tasks are hidden", () => {
  const tasks = buildTaskRewardItems({
    now: new Date("2026-03-07T08:00:00.000Z"),
    claimLookup: new Set<string>(),
    claimedStreakDates: new Set<string>(),
    hasPublicGeneration: false,
    hasPurchase: false,
    inviteCount: 0,
    hasInviteFirstPurchase: false,
  });

  const taskKeys = new Set(tasks.map((task) => task.taskKey));
  const manualTaskKeys: ManualReviewTaskKey[] = [
    "github_star",
    "huggingface_like",
    "share_twitter",
    "share_facebook",
    "share_tiktok",
    "share_instagram",
  ];
  for (const taskKey of manualTaskKeys) {
    assert.equal(taskKeys.has(taskKey), false);
  }
});

test("enabling one manual-review task adds exactly one available 10-credit task", async () => {
  await withEnabledGithubTask(() => {
    const tasks = buildDashboardItems();
    const manualTasks = tasks.filter((task) => task.taskKey === "github_star");

    assert.equal(manualTasks.length, 1);
    assert.equal(manualTasks[0]?.creditAmount, 10);
    assert.equal(manualTasks[0]?.status, "available");
    assert.equal(
      manualTasks[0]?.targetUrl,
      manualReviewTasks.github_star.targetUrl,
    );
  });
});

test("a pending manual application is under review and cannot be submitted again", async () => {
  await withEnabledGithubTask(() => {
    const tasks = buildDashboardItems({
      latestManualApplications: new Map([
        ["github_star", manualApplication("pending")],
      ]),
    });
    const task = tasks.find((item) => item.taskKey === "github_star");

    assert.ok(task);
    assert.equal(task.status, "pending");
    assert.equal(task.canSubmit, false);
  });
});

test("the latest rejected manual application exposes its reason and permits resubmission", async () => {
  await withEnabledGithubTask(() => {
    const tasks = buildDashboardItems({
      latestManualApplications: new Map([
        [
          "github_star",
          manualApplication("rejected", {
            id: "application-latest",
            reviewNote: "Please include the account name in the screenshot.",
          }),
        ],
      ]),
    });
    const task = tasks.find((item) => item.taskKey === "github_star");

    assert.ok(task);
    assert.equal(task.status, "rejected");
    assert.equal(task.canSubmit, true);
    assert.equal(
      task.reviewNote,
      "Please include the account name in the screenshot.",
    );
  });
});

test("a manual reward claim is authoritative even if the latest application was rejected", async () => {
  await withEnabledGithubTask(() => {
    const tasks = buildDashboardItems({
      claimLookup: new Set([buildOnceClaimKey("github_star")]),
      latestManualApplications: new Map([
        ["github_star", manualApplication("rejected")],
      ]),
    });
    const task = tasks.find((item) => item.taskKey === "github_star");

    assert.ok(task);
    assert.equal(task.status, "claimed");
    assert.equal(task.canSubmit, false);
    assert.equal(task.reviewNote, undefined);
  });
});

test("an approved manual application is claimed even if the claim lookup is temporarily missing", async () => {
  await withEnabledGithubTask(() => {
    const tasks = buildDashboardItems({
      latestManualApplications: new Map([
        ["github_star", manualApplication("approved")],
      ]),
    });
    const task = tasks.find((item) => item.taskKey === "github_star");

    assert.ok(task);
    assert.equal(task.status, "claimed");
    assert.equal(task.canSubmit, false);
  });
});

test("pending and rejected manual rewards are never immediately claimable credits", async () => {
  await withEnabledGithubTask(() => {
    for (const status of ["pending", "rejected"] as const) {
      const tasks = buildDashboardItems({
        latestManualApplications: new Map([
          ["github_star", manualApplication(status)],
        ]),
      });
      const immediatelyClaimableManualCredits = tasks.reduce(
        (total, task) =>
          task.taskKey === "github_star" && task.status === "claimable"
            ? total + (task.creditAmount ?? 0)
            : total,
        0,
      );

      assert.equal(immediatelyClaimableManualCredits, 0);
    }
  });
});

test("latest manual application lookup selects the newest submission per enabled task", () => {
  const olderGithub = manualApplication("rejected", {
    id: "github-older",
    submittedAt: new Date("2026-03-05T08:00:00.000Z"),
  });
  const latestGithub = manualApplication("pending", {
    id: "github-latest",
    submittedAt: new Date("2026-03-06T08:00:00.000Z"),
  });
  const facebook = manualApplication("rejected", {
    id: "facebook-latest",
    taskKey: "share_facebook",
    submittedAt: new Date("2026-03-04T08:00:00.000Z"),
  });

  const lookup = buildLatestManualApplicationLookup([
    latestGithub,
    facebook,
    olderGithub,
  ]);

  assert.equal(lookup.get("github_star")?.id, "github-latest");
  assert.equal(lookup.get("share_facebook")?.id, "facebook-latest");
});

test("latest manual application lookup breaks submission ties deterministically", () => {
  const submittedAt = new Date("2026-03-06T08:00:00.000Z");
  const createdAt = new Date("2026-03-06T08:01:00.000Z");
  const candidates = [
    manualApplication("rejected", {
      id: "application-a",
      submittedAt,
      createdAt,
    }),
    manualApplication("pending", {
      id: "application-c",
      submittedAt,
      createdAt,
    }),
    manualApplication("rejected", {
      id: "application-z",
      submittedAt,
      createdAt: new Date("2026-03-06T08:00:30.000Z"),
    }),
  ];

  const lookup = buildLatestManualApplicationLookup(candidates);

  assert.equal(lookup.get("github_star")?.id, "application-c");
});
