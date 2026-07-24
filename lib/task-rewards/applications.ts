import {
  buildOnceClaimKey,
  manualReviewTasks,
  taskRewardsConfig,
  type ManualReviewTaskKey,
} from "@/config/task-rewards";
import type { RewardApplicationStore } from "@/lib/task-rewards/application-store";

const manualReviewTaskKeys = new Set<ManualReviewTaskKey>([
  "github_star",
  "huggingface_like",
  "share_twitter",
  "share_facebook",
  "share_tiktok",
  "share_instagram",
]);

export type SubmitRewardApplicationErrorCode =
  | "invalid_task"
  | "task_disabled"
  | "evidence_required"
  | "evidence_not_owned"
  | "submission_text_required"
  | "submission_text_too_long"
  | "already_claimed"
  | "pending_application_exists";

export type SubmitRewardApplicationResult =
  | {
      status: "submitted";
      applicationId: string;
      creditAmount: number;
    }
  | {
      status: "error";
      errorCode: SubmitRewardApplicationErrorCode;
    };

export interface SubmitManualRewardApplicationParams {
  store: RewardApplicationStore;
  userId: string;
  taskKey: unknown;
  evidenceKey: unknown;
  submissionText: unknown;
  now?: Date;
}

export type ReviewRewardApplicationErrorCode =
  | "invalid_decision"
  | "review_note_required"
  | "review_note_too_long"
  | "application_not_found"
  | "invalid_application"
  | "application_not_pending"
  | "already_claimed";

export type ReviewRewardApplicationResult =
  | {
      status: "approved";
      applicationId: string;
      creditAmount: number;
    }
  | {
      status: "rejected";
      applicationId: string;
    }
  | {
      status: "error";
      errorCode: ReviewRewardApplicationErrorCode;
    };

export interface ReviewRewardApplicationParams {
  store: RewardApplicationStore;
  applicationId: string;
  reviewerUserId: string;
  decision: unknown;
  reviewNote: unknown;
  now?: Date;
}

export function isManualReviewTaskKey(
  taskKey: unknown,
): taskKey is ManualReviewTaskKey {
  return (
    typeof taskKey === "string" &&
    manualReviewTaskKeys.has(taskKey as ManualReviewTaskKey)
  );
}

export async function submitManualRewardApplication({
  store,
  userId,
  taskKey,
  evidenceKey,
  submissionText,
  now = new Date(),
}: SubmitManualRewardApplicationParams): Promise<SubmitRewardApplicationResult> {
  if (!isManualReviewTaskKey(taskKey)) {
    return { status: "error", errorCode: "invalid_task" };
  }

  const definition = manualReviewTasks[taskKey];
  if (!taskRewardsConfig.enabled || !definition.enabled) {
    return { status: "error", errorCode: "task_disabled" };
  }

  const normalizedEvidenceKey =
    typeof evidenceKey === "string" ? evidenceKey.trim() : "";
  if (!normalizedEvidenceKey) {
    return { status: "error", errorCode: "evidence_required" };
  }

  const normalizedSubmissionText =
    typeof submissionText === "string" ? submissionText.trim() : "";
  if (!normalizedSubmissionText) {
    return { status: "error", errorCode: "submission_text_required" };
  }
  if (normalizedSubmissionText.length > 500) {
    return { status: "error", errorCode: "submission_text_too_long" };
  }

  const claimKey = buildOnceClaimKey(taskKey);
  const sealedEvidenceKey = await store.prepareEvidence(
    userId,
    taskKey,
    normalizedEvidenceKey,
  );
  if (!sealedEvidenceKey) {
    return { status: "error", errorCode: "evidence_not_owned" };
  }

  let result: SubmitRewardApplicationResult;
  try {
    result = await store.withTaskLock(userId, taskKey, async (lockedStore) => {
      if (await lockedStore.hasClaim(userId, claimKey)) {
        return { status: "error", errorCode: "already_claimed" };
      }

      if (await lockedStore.hasApprovedApplication(userId, taskKey)) {
        return { status: "error", errorCode: "already_claimed" };
      }

      if (await lockedStore.hasPendingApplication(userId, taskKey)) {
        return { status: "error", errorCode: "pending_application_exists" };
      }

      const created = await lockedStore.createPendingApplication({
        userId,
        taskKey,
        creditAmount: definition.credits,
        evidenceKey: sealedEvidenceKey,
        submissionText: normalizedSubmissionText,
        now,
      });

      if (created.status === "conflict") {
        return { status: "error", errorCode: created.reason };
      }

      return {
        status: "submitted",
        applicationId: created.application.id,
        creditAmount: definition.credits,
      };
    });
  } catch (error) {
    await Promise.allSettled([
      store.deleteEvidence(normalizedEvidenceKey),
      store.deleteEvidence(sealedEvidenceKey),
    ]);
    throw error;
  }

  await Promise.allSettled(
    result.status === "submitted"
      ? [store.deleteEvidence(normalizedEvidenceKey)]
      : [
          store.deleteEvidence(normalizedEvidenceKey),
          store.deleteEvidence(sealedEvidenceKey),
        ],
  );
  return result;
}

export async function reviewRewardApplication({
  store,
  applicationId,
  reviewerUserId,
  decision,
  reviewNote,
  now = new Date(),
}: ReviewRewardApplicationParams): Promise<ReviewRewardApplicationResult> {
  if (decision !== "approved" && decision !== "rejected") {
    return { status: "error", errorCode: "invalid_decision" };
  }

  const normalizedReviewNote =
    typeof reviewNote === "string" ? reviewNote.trim() : "";
  if (decision === "rejected" && !normalizedReviewNote) {
    return { status: "error", errorCode: "review_note_required" };
  }
  if (normalizedReviewNote.length > 500) {
    return { status: "error", errorCode: "review_note_too_long" };
  }

  return store.withLockedApplication(applicationId, async (lockedStore) => {
    const application = lockedStore.application;
    if (!application) {
      return { status: "error", errorCode: "application_not_found" };
    }
    if (
      application.source !== "user" ||
      !isManualReviewTaskKey(application.taskKey)
    ) {
      return { status: "error", errorCode: "invalid_application" };
    }
    if (application.status !== "pending") {
      return { status: "error", errorCode: "application_not_pending" };
    }

    const completion = {
      reviewNote: normalizedReviewNote || null,
      reviewedByUserId: reviewerUserId,
      reviewedAt: now,
    };

    if (decision === "rejected") {
      await lockedStore.markRejected(completion);
      return {
        status: "rejected",
        applicationId: application.id,
      };
    }

    const creditAmount = application.creditAmount;
    const claimCreated = await lockedStore.createClaim({
      userId: application.userId,
      taskKey: application.taskKey,
      claimKey: buildOnceClaimKey(application.taskKey),
      creditAmount,
      metadata: {
        applicationId: application.id,
        reviewerUserId,
      },
    });

    if (!claimCreated) {
      return { status: "error", errorCode: "already_claimed" };
    }

    await lockedStore.markApproved(completion);
    return {
      status: "approved",
      applicationId: application.id,
      creditAmount,
    };
  });
}
