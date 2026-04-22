import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_ADMIN_LIST_PAGE_SIZE,
  clampAdminListPageSize,
  normalizeAdminListQuery,
  toAdminListOffset,
} from "@/lib/referrals/admin-lists";

test("normalizes empty admin list query inputs to safe defaults", () => {
  const result = normalizeAdminListQuery({});

  assert.deepEqual(result, {
    pageIndex: 0,
    pageSize: DEFAULT_ADMIN_LIST_PAGE_SIZE,
    query: "",
    status: "",
    rewardType: "",
  });
});

test("normalizes invalid numeric inputs for admin list queries", () => {
  const result = normalizeAdminListQuery({
    pageIndex: -2,
    pageSize: 999,
    query: "  abc  ",
    status: " pending ",
    rewardType: " signup_credit ",
  });

  assert.deepEqual(result, {
    pageIndex: 0,
    pageSize: 100,
    query: "abc",
    status: "pending",
    rewardType: "signup_credit",
  });
});

test("computes offset from page index and page size", () => {
  assert.equal(toAdminListOffset(0, 20), 0);
  assert.equal(toAdminListOffset(2, 20), 40);
});

test("clamps admin list page size to supported bounds", () => {
  assert.equal(clampAdminListPageSize(undefined), 20);
  assert.equal(clampAdminListPageSize(10), 20);
  assert.equal(clampAdminListPageSize(50), 50);
  assert.equal(clampAdminListPageSize(999), 100);
});
