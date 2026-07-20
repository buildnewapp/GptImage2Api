import type { ManualReviewTaskKey } from "@/config/task-rewards";
import type { TaskRewardClaimRecord } from "@/lib/task-rewards/types";
import { isTaskEvidenceKeyOwnedBy } from "@/lib/task-rewards/evidence";

export type RewardApplicationStatus = "pending" | "approved" | "rejected";

export interface RewardApplicationRecord {
  id: string;
  userId: string;
  taskKey: string;
  source: "system" | "user";
  status: RewardApplicationStatus;
  creditAmount: number;
  evidenceKeys: string[];
  submissionText: string | null;
  reviewNote: string | null;
  reviewedByUserId: string | null;
  submittedAt: Date;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePendingRewardApplicationInput {
  userId: string;
  taskKey: ManualReviewTaskKey;
  creditAmount: number;
  evidenceKey: string;
  submissionText: string;
  now: Date;
}

export type CreatePendingRewardApplicationResult =
  | {
      status: "created";
      application: RewardApplicationRecord;
    }
  | {
      status: "conflict";
      reason: "already_claimed" | "pending_application_exists";
    };

export interface CompleteRewardApplicationInput {
  reviewNote: string | null;
  reviewedByUserId: string;
  reviewedAt: Date;
}

export interface LockedRewardApplicationStore {
  application: RewardApplicationRecord | null;
  createClaim(record: TaskRewardClaimRecord): Promise<boolean>;
  markApproved(input: CompleteRewardApplicationInput): Promise<void>;
  markRejected(input: CompleteRewardApplicationInput): Promise<void>;
}

export interface LockedRewardSubmissionStore {
  verifyAndSealEvidence(
    userId: string,
    taskKey: ManualReviewTaskKey,
    evidenceKey: string,
  ): Promise<string | null>;
  hasClaim(userId: string, claimKey: string): Promise<boolean>;
  hasApprovedApplication(
    userId: string,
    taskKey: ManualReviewTaskKey,
  ): Promise<boolean>;
  hasPendingApplication(
    userId: string,
    taskKey: ManualReviewTaskKey,
  ): Promise<boolean>;
  createPendingApplication(
    input: CreatePendingRewardApplicationInput,
  ): Promise<CreatePendingRewardApplicationResult>;
}

export interface RewardApplicationStore {
  withTaskLock<T>(
    userId: string,
    taskKey: ManualReviewTaskKey,
    operation: (store: LockedRewardSubmissionStore) => Promise<T>,
  ): Promise<T>;
  withLockedApplication<T>(
    applicationId: string,
    operation: (store: LockedRewardApplicationStore) => Promise<T>,
  ): Promise<T>;
}

export interface MemoryRewardApplicationStoreOptions {
  evidenceByUser?: Record<string, string[]>;
  sealedEvidenceByUploadKey?: Record<string, string>;
  applications?: RewardApplicationRecord[];
  claims?: TaskRewardClaimRecord[];
  failClaimCreation?: boolean;
}

function cloneApplication(
  application: RewardApplicationRecord,
): RewardApplicationRecord {
  return {
    ...application,
    evidenceKeys: [...application.evidenceKeys],
  };
}

export class MemoryRewardApplicationStore implements RewardApplicationStore {
  private readonly evidenceByUser: Map<string, Set<string>>;
  private readonly sealedEvidenceByUploadKey: Map<string, string>;
  private readonly failClaimCreation: boolean;
  readonly applications: RewardApplicationRecord[];
  readonly claims: TaskRewardClaimRecord[];

  constructor(options: MemoryRewardApplicationStoreOptions = {}) {
    this.evidenceByUser = new Map(
      Object.entries(options.evidenceByUser ?? {}).map(([userId, keys]) => [
        userId,
        new Set(keys),
      ]),
    );
    this.sealedEvidenceByUploadKey = new Map(
      Object.entries(options.sealedEvidenceByUploadKey ?? {}),
    );
    this.applications = (options.applications ?? []).map(cloneApplication);
    this.claims = (options.claims ?? []).map((claim) => ({
      ...claim,
      metadata: claim.metadata ? { ...claim.metadata } : undefined,
    }));
    this.failClaimCreation = options.failClaimCreation ?? false;
  }

  async verifyAndSealEvidence(
    userId: string,
    taskKey: ManualReviewTaskKey,
    evidenceKey: string,
  ): Promise<string | null> {
    const ownsUpload =
      isTaskEvidenceKeyOwnedBy({ userId, taskKey, key: evidenceKey }) &&
      (this.evidenceByUser.get(userId)?.has(evidenceKey) ?? false);
    if (!ownsUpload) return null;
    return this.sealedEvidenceByUploadKey.get(evidenceKey) ?? null;
  }

  async hasClaim(userId: string, claimKey: string): Promise<boolean> {
    return this.claims.some(
      (claim) => claim.userId === userId && claim.claimKey === claimKey,
    );
  }

  async hasPendingApplication(
    userId: string,
    taskKey: ManualReviewTaskKey,
  ): Promise<boolean> {
    return this.applications.some(
      (application) =>
        application.userId === userId &&
        application.taskKey === taskKey &&
        application.status === "pending",
    );
  }

  async hasApprovedApplication(
    userId: string,
    taskKey: ManualReviewTaskKey,
  ): Promise<boolean> {
    return this.applications.some(
      (application) =>
        application.userId === userId &&
        application.taskKey === taskKey &&
        application.status === "approved",
    );
  }

  async createPendingApplication(
    input: CreatePendingRewardApplicationInput,
  ): Promise<CreatePendingRewardApplicationResult> {
    if (
      (await this.hasClaim(input.userId, `${input.taskKey}:once`)) ||
      (await this.hasApprovedApplication(input.userId, input.taskKey))
    ) {
      return { status: "conflict", reason: "already_claimed" };
    }
    if (await this.hasPendingApplication(input.userId, input.taskKey)) {
      return {
        status: "conflict",
        reason: "pending_application_exists",
      };
    }

    const application: RewardApplicationRecord = {
      id: `application-${this.applications.length + 1}`,
      userId: input.userId,
      taskKey: input.taskKey,
      source: "user",
      status: "pending",
      creditAmount: input.creditAmount,
      evidenceKeys: [input.evidenceKey],
      submissionText: input.submissionText,
      reviewNote: null,
      reviewedByUserId: null,
      submittedAt: input.now,
      reviewedAt: null,
      createdAt: input.now,
      updatedAt: input.now,
    };

    this.applications.push(application);
    return { status: "created", application };
  }

  async withTaskLock<T>(
    _userId: string,
    _taskKey: ManualReviewTaskKey,
    operation: (store: LockedRewardSubmissionStore) => Promise<T>,
  ): Promise<T> {
    return operation({
      verifyAndSealEvidence: (userId, taskKey, evidenceKey) =>
        this.verifyAndSealEvidence(userId, taskKey, evidenceKey),
      hasClaim: (userId, claimKey) => this.hasClaim(userId, claimKey),
      hasApprovedApplication: (userId, taskKey) =>
        this.hasApprovedApplication(userId, taskKey),
      hasPendingApplication: (userId, taskKey) =>
        this.hasPendingApplication(userId, taskKey),
      createPendingApplication: (input) => this.createPendingApplication(input),
    });
  }

  async withLockedApplication<T>(
    applicationId: string,
    operation: (store: LockedRewardApplicationStore) => Promise<T>,
  ): Promise<T> {
    const application =
      this.applications.find((entry) => entry.id === applicationId) ?? null;

    return operation({
      application,
      createClaim: async (record) => {
        if (
          this.failClaimCreation ||
          (await this.hasClaim(record.userId, record.claimKey))
        ) {
          return false;
        }
        this.claims.push({
          ...record,
          metadata: record.metadata ? { ...record.metadata } : undefined,
        });
        return true;
      },
      markApproved: async (input) => {
        if (!application || application.status !== "pending") {
          throw new Error("Reward application is not pending");
        }
        Object.assign(application, {
          status: "approved" as const,
          reviewNote: input.reviewNote,
          reviewedByUserId: input.reviewedByUserId,
          reviewedAt: input.reviewedAt,
          updatedAt: input.reviewedAt,
        });
      },
      markRejected: async (input) => {
        if (!application || application.status !== "pending") {
          throw new Error("Reward application is not pending");
        }
        Object.assign(application, {
          status: "rejected" as const,
          reviewNote: input.reviewNote,
          reviewedByUserId: input.reviewedByUserId,
          reviewedAt: input.reviewedAt,
          updatedAt: input.reviewedAt,
        });
      },
    });
  }
}

export function createMemoryRewardApplicationStore(
  options: MemoryRewardApplicationStoreOptions = {},
): MemoryRewardApplicationStore {
  return new MemoryRewardApplicationStore(options);
}
