import assert from "node:assert/strict";
import test from "node:test";

import {
  mapManualTaskApplicationResult,
  parseManualTaskApplicationInput,
} from "@/lib/task-rewards/application-action";

test("manual application action input accepts only the fixed task, evidence, and trimmed text", () => {
  const parsed = parseManualTaskApplicationInput({
    taskKey: "github_star",
    evidenceKey: "  task-evidence/user-1/github.png  ",
    submissionText: "  I starred the repository.  ",
  });

  assert.deepEqual(parsed, {
    success: true,
    data: {
      taskKey: "github_star",
      evidenceKey: "task-evidence/user-1/github.png",
      submissionText: "I starred the repository.",
    },
  });
});

test("manual application action input rejects client-controlled reward fields", () => {
  for (const forbiddenField of ["userId", "creditAmount", "status"]) {
    const parsed = parseManualTaskApplicationInput({
      taskKey: "github_star",
      evidenceKey: "task-evidence/user-1/github.png",
      submissionText: "I starred the repository.",
      [forbiddenField]: forbiddenField === "creditAmount" ? 999 : "forged",
    });

    assert.deepEqual(parsed, {
      success: false,
      customCode: "validation",
    });
  }
});

test("manual application action input rejects unknown tasks, blank evidence, and invalid text lengths", () => {
  const invalidInputs = [
    {
      taskKey: "forged_task",
      evidenceKey: "task-evidence/user-1/github.png",
      submissionText: "Done.",
    },
    {
      taskKey: "github_star",
      evidenceKey: "   ",
      submissionText: "Done.",
    },
    {
      taskKey: "github_star",
      evidenceKey: "task-evidence/user-1/github.png",
      submissionText: "   ",
    },
    {
      taskKey: "github_star",
      evidenceKey: "task-evidence/user-1/github.png",
      submissionText: "x".repeat(501),
    },
  ];

  for (const input of invalidInputs) {
    assert.deepEqual(parseManualTaskApplicationInput(input), {
      success: false,
      customCode: "validation",
    });
  }
});

test("manual application domain outcomes map to stable action custom codes", () => {
  assert.deepEqual(
    mapManualTaskApplicationResult(
      {
        status: "submitted",
        applicationId: "application-1",
        creditAmount: 10,
      },
      "github_star",
    ),
    {
      success: true,
      data: {
        applicationId: "application-1",
        taskKey: "github_star",
        creditAmount: 10,
      },
    },
  );

  const expectedCodes = {
    task_disabled: "task_disabled",
    already_claimed: "already_claimed",
    pending_application_exists: "pending_application_exists",
    evidence_required: "invalid_evidence",
    evidence_not_owned: "invalid_evidence",
    invalid_task: "validation",
    submission_text_required: "validation",
    submission_text_too_long: "validation",
  } as const;

  for (const [errorCode, customCode] of Object.entries(expectedCodes)) {
    const mapped = mapManualTaskApplicationResult(
      { status: "error", errorCode } as any,
      "github_star",
    );
    assert.equal(mapped.success, false);
    if (!mapped.success) assert.equal(mapped.customCode, customCode);
  }
});
