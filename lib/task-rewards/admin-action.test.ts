import assert from "node:assert/strict";
import test from "node:test";

import {
  mapAdminRewardApplicationReviewResult,
  parseAdminRewardApplicationReviewInput,
} from "@/lib/task-rewards/admin-action";

const applicationId = "123e4567-e89b-42d3-a456-426614174000";

test("parses approve and trims an optional review note", () => {
  assert.deepEqual(
    parseAdminRewardApplicationReviewInput({
      applicationId,
      decision: "approved",
      reviewNote: "  Looks valid.  ",
    }),
    {
      success: true,
      data: {
        applicationId,
        decision: "approved",
        reviewNote: "Looks valid.",
      },
    },
  );
});

test("requires a trimmed rejection reason between 1 and 500 characters", () => {
  assert.equal(
    parseAdminRewardApplicationReviewInput({
      applicationId,
      decision: "rejected",
      reviewNote: "  Evidence does not show the completed task.  ",
    }).success,
    true,
  );

  for (const reviewNote of ["", "   ", "x".repeat(501)]) {
    assert.deepEqual(
      parseAdminRewardApplicationReviewInput({
        applicationId,
        decision: "rejected",
        reviewNote,
      }),
      { success: false, customCode: "validation" },
    );
  }
});

test("rejects malformed ids, decisions, and client-controlled reviewer fields", () => {
  for (const input of [
    { applicationId: "not-a-uuid", decision: "approved", reviewNote: "" },
    { applicationId, decision: "pending", reviewNote: "" },
    {
      applicationId,
      decision: "approved",
      reviewNote: "",
      reviewerUserId: "forged-reviewer",
    },
  ]) {
    assert.deepEqual(parseAdminRewardApplicationReviewInput(input), {
      success: false,
      customCode: "validation",
    });
  }
});

test("maps review outcomes to stable admin action codes", () => {
  assert.deepEqual(
    mapAdminRewardApplicationReviewResult({
      status: "approved",
      applicationId,
      creditAmount: 10,
    }),
    {
      success: true,
      data: { applicationId, status: "approved", creditAmount: 10 },
    },
  );
  assert.deepEqual(
    mapAdminRewardApplicationReviewResult({
      status: "rejected",
      applicationId,
    }),
    {
      success: true,
      data: { applicationId, status: "rejected" },
    },
  );

  const expectedCodes = {
    application_not_found: "not_found",
    application_not_pending: "already_processed",
    already_claimed: "already_claimed",
    invalid_application: "invalid_application",
    invalid_decision: "validation",
    review_note_required: "validation",
    review_note_too_long: "validation",
  } as const;

  for (const [errorCode, customCode] of Object.entries(expectedCodes)) {
    const mapped = mapAdminRewardApplicationReviewResult({
      status: "error",
      errorCode,
    } as any);
    assert.equal(mapped.success, false);
    if (!mapped.success) assert.equal(mapped.customCode, customCode);
  }
});
