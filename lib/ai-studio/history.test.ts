import assert from "node:assert/strict";
import test from "node:test";

import { getAiStudioHistoryStatusReason } from "@/lib/ai-studio/history";

test("prefers provider failure detail over stale success status reason in history", () => {
  assert.equal(
    getAiStudioHistoryStatusReason({
      status: "failed",
      statusReason: "success",
      raw: {
        msg: "success",
        code: 200,
        data: {
          state: "fail",
          failMsg:
            "Sora official service is currently under heavy load and not responding. Please try again later.",
          failCode: "500",
        },
      },
    }),
    "Sora official service is currently under heavy load and not responding. Please try again later.",
  );
});

test("keeps an explicit failure reason when no stronger provider reason exists", () => {
  assert.equal(
    getAiStudioHistoryStatusReason({
      status: "failed",
      statusReason: "Marked failed by admin: Refunded after admin verification.",
      raw: {},
    }),
    "Marked failed by admin: Refunded after admin verification.",
  );
});

test("hides success-like reasons for non-failed history items", () => {
  assert.equal(
    getAiStudioHistoryStatusReason({
      status: "succeeded",
      statusReason: "success",
      raw: {
        msg: "success",
      },
    }),
    null,
  );
});
