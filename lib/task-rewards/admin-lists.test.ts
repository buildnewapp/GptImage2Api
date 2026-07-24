import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_TASK_REWARD_ADMIN_PAGE_SIZE,
  MANUAL_TASK_REWARD_ADMIN_PAGE_SIZE_OPTIONS,
  normalizeTaskRewardAdminListQuery,
  toTaskRewardAdminListOffset,
} from "@/lib/task-rewards/admin-lists";

test("defaults task reward admin lists to pending applications", () => {
  assert.deepEqual(normalizeTaskRewardAdminListQuery({}), {
    pageIndex: 0,
    pageSize: DEFAULT_TASK_REWARD_ADMIN_PAGE_SIZE,
    status: "pending",
    taskKey: "",
    query: "",
  });
});

test("normalizes pagination and trims the email query", () => {
  assert.deepEqual(
    normalizeTaskRewardAdminListQuery({
      pageIndex: -3.5,
      pageSize: 999,
      status: " approved ",
      taskKey: " github_star ",
      query: "  reviewer@example.com  ",
    }),
    {
      pageIndex: 0,
      pageSize: 100,
      status: "approved",
      taskKey: "github_star",
      query: "reviewer@example.com",
    },
  );

  assert.deepEqual(MANUAL_TASK_REWARD_ADMIN_PAGE_SIZE_OPTIONS, [20, 50, 100]);
  assert.equal(toTaskRewardAdminListOffset(2, 50), 100);
});

test("allows only the three application statuses and six manual task keys", () => {
  for (const status of ["pending", "approved", "rejected"] as const) {
    assert.equal(normalizeTaskRewardAdminListQuery({ status }).status, status);
  }

  for (const taskKey of [
    "github_star",
    "huggingface_like",
    "share_twitter",
    "share_facebook",
    "share_tiktok",
    "share_instagram",
  ] as const) {
    assert.equal(
      normalizeTaskRewardAdminListQuery({ taskKey }).taskKey,
      taskKey,
    );
  }
});

test("rejects forged statuses and non-manual task keys", () => {
  assert.deepEqual(
    normalizeTaskRewardAdminListQuery({
      status: "all",
      taskKey: "signup_bonus",
    }),
    {
      pageIndex: 0,
      pageSize: DEFAULT_TASK_REWARD_ADMIN_PAGE_SIZE,
      status: "pending",
      taskKey: "",
      query: "",
    },
  );
});
