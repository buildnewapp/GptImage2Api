import assert from "node:assert/strict";
import test from "node:test";

import { buildOnceClaimKey, manualReviewTasks } from "@/config/task-rewards";
import {
  createMemoryRewardApplicationStore,
  type RewardApplicationRecord,
} from "@/lib/task-rewards/application-store";
import {
  reviewRewardApplication,
  submitManualRewardApplication,
} from "@/lib/task-rewards/applications";

const userId = "user-1";
const reviewerUserId = "reviewer-1";
const evidenceKey =
  "task-evidence/user-1/github_star/123e4567-e89b-42d3-a456-426614174000.png";
const sealedEvidenceKey =
  "task-evidence-sealed/user-1/github_star/223e4567-e89b-42d3-a456-426614174000.png";
const now = new Date("2026-07-20T08:00:00.000Z");

async function withEnabledGithubTask<T>(run: () => Promise<T>): Promise<T> {
  const previous = manualReviewTasks.github_star.enabled;
  manualReviewTasks.github_star.enabled = true;
  try {
    return await run();
  } finally {
    manualReviewTasks.github_star.enabled = previous;
  }
}

function createStore(
  options: Parameters<typeof createMemoryRewardApplicationStore>[0] = {},
) {
  return createMemoryRewardApplicationStore({
    evidenceByUser: { [userId]: [evidenceKey] },
    sealedEvidenceByUploadKey: { [evidenceKey]: sealedEvidenceKey },
    ...options,
  });
}

function pendingApplication(
  overrides: Partial<RewardApplicationRecord> = {},
): RewardApplicationRecord {
  return {
    id: "application-1",
    userId,
    taskKey: "github_star",
    source: "user",
    status: "pending",
    creditAmount: 10,
    evidenceKeys: [evidenceKey],
    submissionText: "I starred the repository.",
    reviewNote: null,
    reviewedByUserId: null,
    submittedAt: now,
    reviewedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

test("disabled manual tasks cannot accept applications", async () => {
  const store = createStore();

  const result = await submitManualRewardApplication({
    store,
    userId,
    taskKey: "github_star",
    evidenceKey,
    submissionText: "I starred the repository.",
    now,
  });

  assert.deepEqual(result, {
    status: "error",
    errorCode: "task_disabled",
  });
  assert.equal(store.applications.length, 0);
});

test("only fixed server-side manual tasks can accept applications", async () => {
  const store = createStore();

  const result = await submitManualRewardApplication({
    store,
    userId,
    taskKey: "forged_task",
    evidenceKey,
    submissionText: "Please award me.",
    now,
  });

  assert.deepEqual(result, {
    status: "error",
    errorCode: "invalid_task",
  });
});

test("a screenshot is required and must belong to the submitting user", async () => {
  await withEnabledGithubTask(async () => {
    const store = createStore();

    const missing = await submitManualRewardApplication({
      store,
      userId,
      taskKey: "github_star",
      evidenceKey: "   ",
      submissionText: "I starred the repository.",
      now,
    });
    const notOwned = await submitManualRewardApplication({
      store,
      userId,
      taskKey: "github_star",
      evidenceKey: "task-evidence/other-user/github.png",
      submissionText: "I starred the repository.",
      now,
    });

    assert.deepEqual(missing, {
      status: "error",
      errorCode: "evidence_required",
    });
    assert.deepEqual(notOwned, {
      status: "error",
      errorCode: "evidence_not_owned",
    });
    assert.equal(store.applications.length, 0);
  });
});

test("submission text is trimmed and must contain between 1 and 500 characters", async () => {
  await withEnabledGithubTask(async () => {
    const blankStore = createStore();
    const blank = await submitManualRewardApplication({
      store: blankStore,
      userId,
      taskKey: "github_star",
      evidenceKey,
      submissionText: "   ",
      now,
    });

    const longStore = createStore();
    const tooLong = await submitManualRewardApplication({
      store: longStore,
      userId,
      taskKey: "github_star",
      evidenceKey,
      submissionText: "x".repeat(501),
      now,
    });

    const validStore = createStore();
    const valid = await submitManualRewardApplication({
      store: validStore,
      userId,
      taskKey: "github_star",
      evidenceKey,
      submissionText: "  I starred the repository.  ",
      now,
    });

    assert.equal(blank.status, "error");
    assert.equal(blank.errorCode, "submission_text_required");
    assert.equal(tooLong.status, "error");
    assert.equal(tooLong.errorCode, "submission_text_too_long");
    assert.equal(valid.status, "submitted");
    assert.deepEqual(validStore.applications[0]?.evidenceKeys, [
      sealedEvidenceKey,
    ]);
    assert.equal(
      validStore.applications[0]?.submissionText,
      "I starred the repository.",
    );
  });
});

test("an already claimed task cannot be submitted", async () => {
  await withEnabledGithubTask(async () => {
    const store = createStore({
      claims: [
        {
          userId,
          taskKey: "github_star",
          claimKey: buildOnceClaimKey("github_star"),
          creditAmount: 10,
        },
      ],
    });

    const result = await submitManualRewardApplication({
      store,
      userId,
      taskKey: "github_star",
      evidenceKey,
      submissionText: "I starred the repository.",
      now,
    });

    assert.deepEqual(result, {
      status: "error",
      errorCode: "already_claimed",
    });
    assert.equal(store.applications.length, 0);
  });
});

test("a second pending application for the same task is rejected", async () => {
  await withEnabledGithubTask(async () => {
    const store = createStore({ applications: [pendingApplication()] });

    const result = await submitManualRewardApplication({
      store,
      userId,
      taskKey: "github_star",
      evidenceKey,
      submissionText: "A duplicate submission.",
      now,
    });

    assert.deepEqual(result, {
      status: "error",
      errorCode: "pending_application_exists",
    });
    assert.equal(store.applications.length, 1);
  });
});

test("submission checks claims and applications only while the user task lock is held", async () => {
  await withEnabledGithubTask(async () => {
    const memoryStore = createStore();
    const events: string[] = [];
    let taskLockHeld = false;
    const lockedMethods = {
      verifyAndSealEvidence: async (
        lockedUserId: string,
        taskKey: "github_star",
        key: string,
      ) => {
        assert.equal(taskLockHeld, true);
        events.push("seal_evidence");
        return memoryStore.verifyAndSealEvidence(lockedUserId, taskKey, key);
      },
      hasClaim: async (lockedUserId: string, claimKey: string) => {
        assert.equal(taskLockHeld, true);
        events.push("has_claim");
        return memoryStore.hasClaim(lockedUserId, claimKey);
      },
      hasApprovedApplication: async () => {
        assert.equal(taskLockHeld, true);
        events.push("has_approved");
        return false;
      },
      hasPendingApplication: async (
        lockedUserId: string,
        taskKey: "github_star",
      ) => {
        assert.equal(taskLockHeld, true);
        events.push("has_pending");
        return memoryStore.hasPendingApplication(lockedUserId, taskKey);
      },
      createPendingApplication: async (input: any) => {
        assert.equal(taskLockHeld, true);
        events.push("insert_pending");
        return memoryStore.createPendingApplication(input);
      },
    };
    const store = {
      async withTaskLock(
        _lockedUserId: string,
        _taskKey: "github_star",
        operation: (methods: typeof lockedMethods) => Promise<unknown>,
      ) {
        events.push("lock");
        taskLockHeld = true;
        try {
          return await operation(lockedMethods);
        } finally {
          taskLockHeld = false;
          events.push("unlock");
        }
      },
      hasClaim: lockedMethods.hasClaim,
      hasPendingApplication: lockedMethods.hasPendingApplication,
      createPendingApplication: lockedMethods.createPendingApplication,
      withLockedApplication:
        memoryStore.withLockedApplication.bind(memoryStore),
    };

    const result = await submitManualRewardApplication({
      store: store as any,
      userId,
      taskKey: "github_star",
      evidenceKey,
      submissionText: "I starred the repository.",
      now,
    });

    assert.equal(result.status, "submitted");
    assert.deepEqual(events, [
      "lock",
      "has_claim",
      "has_approved",
      "has_pending",
      "seal_evidence",
      "insert_pending",
      "unlock",
    ]);
  });
});

test("a rejected application can be submitted again", async () => {
  await withEnabledGithubTask(async () => {
    const store = createStore({
      applications: [
        pendingApplication({
          status: "rejected",
          reviewNote: "Screenshot was unreadable.",
          reviewedByUserId: reviewerUserId,
          reviewedAt: now,
        }),
      ],
    });

    const result = await submitManualRewardApplication({
      store,
      userId,
      taskKey: "github_star",
      evidenceKey,
      submissionText: "Here is a clearer screenshot.",
      now: new Date("2026-07-21T08:00:00.000Z"),
    });

    assert.equal(result.status, "submitted");
    assert.equal(result.creditAmount, 10);
    assert.equal(store.applications.length, 2);
    assert.equal(store.applications[1]?.status, "pending");
  });
});

test("approval creates the once-only claim before marking the application approved", async () => {
  const store = createStore({ applications: [pendingApplication()] });
  const reviewedAt = new Date("2026-07-21T08:00:00.000Z");

  const result = await reviewRewardApplication({
    store,
    applicationId: "application-1",
    reviewerUserId,
    decision: "approved",
    reviewNote: " Looks good. ",
    now: reviewedAt,
  });

  assert.deepEqual(result, {
    status: "approved",
    applicationId: "application-1",
    creditAmount: 10,
  });
  assert.equal(store.claims.length, 1);
  assert.deepEqual(store.claims[0], {
    userId,
    taskKey: "github_star",
    claimKey: "github_star:once",
    creditAmount: 10,
    metadata: {
      applicationId: "application-1",
      reviewerUserId,
    },
  });
  assert.equal(store.applications[0]?.status, "approved");
  assert.equal(store.applications[0]?.reviewNote, "Looks good.");
  assert.equal(store.applications[0]?.reviewedByUserId, reviewerUserId);
  assert.deepEqual(store.applications[0]?.reviewedAt, reviewedAt);
});

test("approval awards the credit amount captured by the application", async () => {
  const store = createStore({
    applications: [pendingApplication({ creditAmount: 17 })],
  });

  const result = await reviewRewardApplication({
    store,
    applicationId: "application-1",
    reviewerUserId,
    decision: "approved",
    reviewNote: "Looks good.",
    now,
  });

  assert.equal(result.status, "approved");
  if (result.status !== "approved") {
    assert.fail("expected the application to be approved");
  }
  assert.equal(result.creditAmount, 17);
  assert.equal(store.claims[0]?.creditAmount, 17);
});

test("rejection requires a note and never creates credits", async () => {
  const missingNoteStore = createStore({
    applications: [pendingApplication()],
  });
  const missingNote = await reviewRewardApplication({
    store: missingNoteStore,
    applicationId: "application-1",
    reviewerUserId,
    decision: "rejected",
    reviewNote: "   ",
    now,
  });

  assert.deepEqual(missingNote, {
    status: "error",
    errorCode: "review_note_required",
  });
  assert.equal(missingNoteStore.applications[0]?.status, "pending");

  const store = createStore({ applications: [pendingApplication()] });
  const result = await reviewRewardApplication({
    store,
    applicationId: "application-1",
    reviewerUserId,
    decision: "rejected",
    reviewNote: " Screenshot does not show the completed task. ",
    now,
  });

  assert.deepEqual(result, {
    status: "rejected",
    applicationId: "application-1",
  });
  assert.equal(store.claims.length, 0);
  assert.equal(store.applications[0]?.status, "rejected");
  assert.equal(
    store.applications[0]?.reviewNote,
    "Screenshot does not show the completed task.",
  );
});

test("an application cannot be processed twice", async () => {
  const store = createStore({ applications: [pendingApplication()] });

  const first = await reviewRewardApplication({
    store,
    applicationId: "application-1",
    reviewerUserId,
    decision: "rejected",
    reviewNote: "Screenshot is invalid.",
    now,
  });
  const second = await reviewRewardApplication({
    store,
    applicationId: "application-1",
    reviewerUserId,
    decision: "rejected",
    reviewNote: "Trying again.",
    now,
  });

  assert.equal(first.status, "rejected");
  assert.deepEqual(second, {
    status: "error",
    errorCode: "application_not_pending",
  });
});

test("a claim conflict leaves the application pending", async () => {
  const store = createStore({
    applications: [pendingApplication()],
    failClaimCreation: true,
  });

  const result = await reviewRewardApplication({
    store,
    applicationId: "application-1",
    reviewerUserId,
    decision: "approved",
    reviewNote: "Looks good.",
    now,
  });

  assert.deepEqual(result, {
    status: "error",
    errorCode: "already_claimed",
  });
  assert.equal(store.claims.length, 0);
  assert.equal(store.applications[0]?.status, "pending");
  assert.equal(store.applications[0]?.reviewedAt, null);
});
