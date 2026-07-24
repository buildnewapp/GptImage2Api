import { getDb } from "@/lib/db";
import {
  rewardApplications as rewardApplicationsSchema,
  taskRewardClaims as taskRewardClaimsSchema,
} from "@/lib/db/schema";
import type {
  CompleteRewardApplicationInput,
  CreatePendingRewardApplicationInput,
  CreatePendingRewardApplicationResult,
  LockedRewardApplicationStore,
  LockedRewardSubmissionStore,
  RewardApplicationRecord,
  RewardApplicationStore,
} from "@/lib/task-rewards/application-store";
import {
  buildOnceClaimKey,
  type ManualReviewTaskKey,
} from "@/config/task-rewards";
import { createDrizzleTaskRewardStore } from "@/lib/task-rewards/drizzle-store";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { verifyAndSealTaskEvidence } from "@/lib/task-rewards/evidence";
import {
  copyTaskEvidenceObject,
  deleteTaskEvidenceObject,
  headTaskEvidenceObject,
  readTaskEvidenceHeader,
} from "@/lib/cloudflare/task-evidence-r2";

type DbClient = ReturnType<typeof getDb>;
type DbTransactionCallback = Parameters<DbClient["transaction"]>[0];
type DbTransaction = Parameters<DbTransactionCallback>[0];
type RewardApplicationRow = typeof rewardApplicationsSchema.$inferSelect;

export const TASK_REWARD_ADVISORY_LOCK_NAMESPACE = 20260720;

export interface CreateDrizzleRewardApplicationStoreOptions {
  db?: DbClient;
  prepareEvidenceObject?: (input: {
    userId: string;
    taskKey: ManualReviewTaskKey;
    uploadKey: string;
  }) => Promise<string | null>;
  deleteEvidenceObject?: (key: string) => Promise<void>;
}

async function prepareEvidenceObjectWithR2({
  userId,
  taskKey,
  uploadKey,
}: {
  userId: string;
  taskKey: ManualReviewTaskKey;
  uploadKey: string;
}): Promise<string | null> {
  return verifyAndSealTaskEvidence({
    userId,
    taskKey,
    uploadKey,
    headObject: (key) => headTaskEvidenceObject({ key }),
    readHeader: (key) => readTaskEvidenceHeader({ key }),
    copyObject: (input) => copyTaskEvidenceObject(input),
  });
}

function toRewardApplicationRecord(
  row: RewardApplicationRow,
): RewardApplicationRecord {
  return {
    id: row.id,
    userId: row.userId,
    taskKey: row.taskKey,
    source: row.source,
    status: row.status,
    creditAmount: row.creditAmount,
    evidenceKeys: row.evidenceUrls,
    submissionText: row.submissionText,
    reviewNote: row.reviewNote,
    reviewedByUserId: row.reviewedByUserId,
    submittedAt: row.submittedAt,
    reviewedAt: row.reviewedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getLatestManualApplicationsForUser(
  db: DbClient,
  userId: string,
  taskKeys: ManualReviewTaskKey[],
): Promise<Map<ManualReviewTaskKey, RewardApplicationRecord>> {
  if (taskKeys.length === 0) return new Map();

  const rows = await buildLatestManualApplicationsForUserQuery(
    db,
    userId,
    taskKeys,
  );

  return new Map(
    rows.map((row) => [
      row.taskKey as ManualReviewTaskKey,
      toRewardApplicationRecord(row),
    ]),
  );
}

export function buildLatestManualApplicationsForUserQuery(
  db: DbClient,
  userId: string,
  taskKeys: ManualReviewTaskKey[],
) {
  return db
    .selectDistinctOn([rewardApplicationsSchema.taskKey])
    .from(rewardApplicationsSchema)
    .where(
      and(
        eq(rewardApplicationsSchema.userId, userId),
        eq(rewardApplicationsSchema.source, "user"),
        inArray(rewardApplicationsSchema.taskKey, taskKeys),
      ),
    )
    .orderBy(
      rewardApplicationsSchema.taskKey,
      desc(rewardApplicationsSchema.submittedAt),
      desc(rewardApplicationsSchema.createdAt),
      desc(rewardApplicationsSchema.id),
    );
}

async function acquireUserTaskLock(
  tx: DbTransaction,
  userId: string,
  taskKey: string,
): Promise<void> {
  await tx.execute(
    sql`select pg_advisory_xact_lock(${TASK_REWARD_ADVISORY_LOCK_NAMESPACE}, hashtext(${`${userId}:${taskKey}`}))`,
  );
}

async function hasClaim(
  tx: DbTransaction,
  userId: string,
  claimKey: string,
): Promise<boolean> {
  const rows = await tx
    .select({ id: taskRewardClaimsSchema.id })
    .from(taskRewardClaimsSchema)
    .where(
      and(
        eq(taskRewardClaimsSchema.userId, userId),
        eq(taskRewardClaimsSchema.claimKey, claimKey),
      ),
    )
    .limit(1);

  return rows.length > 0;
}

async function hasApplicationStatus(
  tx: DbTransaction,
  userId: string,
  taskKey: ManualReviewTaskKey,
  status: "pending" | "approved",
): Promise<boolean> {
  const rows = await tx
    .select({ id: rewardApplicationsSchema.id })
    .from(rewardApplicationsSchema)
    .where(
      and(
        eq(rewardApplicationsSchema.userId, userId),
        eq(rewardApplicationsSchema.taskKey, taskKey),
        eq(rewardApplicationsSchema.status, status),
      ),
    )
    .limit(1);

  return rows.length > 0;
}

export function createDrizzleRewardApplicationStore({
  db = getDb(),
  prepareEvidenceObject = prepareEvidenceObjectWithR2,
  deleteEvidenceObject = (key) => deleteTaskEvidenceObject({ key }),
}: CreateDrizzleRewardApplicationStoreOptions = {}): RewardApplicationStore {
  return {
    prepareEvidence: (userId, taskKey, evidenceKey) =>
      prepareEvidenceObject({
        userId,
        taskKey,
        uploadKey: evidenceKey,
      }),
    deleteEvidence: deleteEvidenceObject,
    async withTaskLock<T>(
      userId: string,
      taskKey: ManualReviewTaskKey,
      operation: (store: LockedRewardSubmissionStore) => Promise<T>,
    ): Promise<T> {
      return db.transaction(async (tx) => {
        await acquireUserTaskLock(tx, userId, taskKey);

        return operation({
          hasClaim: (lockedUserId, claimKey) =>
            hasClaim(tx, lockedUserId, claimKey),
          hasApprovedApplication: (lockedUserId, lockedTaskKey) =>
            hasApplicationStatus(tx, lockedUserId, lockedTaskKey, "approved"),
          hasPendingApplication: (lockedUserId, lockedTaskKey) =>
            hasApplicationStatus(tx, lockedUserId, lockedTaskKey, "pending"),
          async createPendingApplication(
            input: CreatePendingRewardApplicationInput,
          ): Promise<CreatePendingRewardApplicationResult> {
            const rows = await tx
              .insert(rewardApplicationsSchema)
              .values({
                userId: input.userId,
                taskKey: input.taskKey,
                source: "user",
                status: "pending",
                creditAmount: input.creditAmount,
                evidenceUrls: [input.evidenceKey],
                submissionText: input.submissionText,
                submittedAt: input.now,
                createdAt: input.now,
                updatedAt: input.now,
              })
              .onConflictDoNothing()
              .returning();

            const created = rows[0];
            if (created) {
              return {
                status: "created",
                application: toRewardApplicationRecord(created),
              };
            }

            if (
              (await hasClaim(
                tx,
                input.userId,
                buildOnceClaimKey(input.taskKey),
              )) ||
              (await hasApplicationStatus(
                tx,
                input.userId,
                input.taskKey,
                "approved",
              ))
            ) {
              return { status: "conflict", reason: "already_claimed" };
            }

            if (
              await hasApplicationStatus(
                tx,
                input.userId,
                input.taskKey,
                "pending",
              )
            ) {
              return {
                status: "conflict",
                reason: "pending_application_exists",
              };
            }

            throw new Error("Unable to classify reward application conflict");
          },
        });
      });
    },

    async withLockedApplication<T>(
      applicationId: string,
      operation: (store: LockedRewardApplicationStore) => Promise<T>,
    ): Promise<T> {
      const identityRows = await db
        .select({
          userId: rewardApplicationsSchema.userId,
          taskKey: rewardApplicationsSchema.taskKey,
        })
        .from(rewardApplicationsSchema)
        .where(eq(rewardApplicationsSchema.id, applicationId))
        .limit(1);
      const identity = identityRows[0];

      if (!identity) {
        return operation({
          application: null,
          createClaim: async () => {
            throw new Error("Reward application does not exist");
          },
          markApproved: async () => {
            throw new Error("Reward application does not exist");
          },
          markRejected: async () => {
            throw new Error("Reward application does not exist");
          },
        });
      }

      return db.transaction(async (tx) => {
        await acquireUserTaskLock(tx, identity.userId, identity.taskKey);
        const rows = await tx
          .select()
          .from(rewardApplicationsSchema)
          .where(eq(rewardApplicationsSchema.id, applicationId))
          .limit(1)
          .for("update");
        const row = rows[0];
        const application = row ? toRewardApplicationRecord(row) : null;

        async function markApplication(
          status: "approved" | "rejected",
          input: CompleteRewardApplicationInput,
        ): Promise<void> {
          const updated = await tx
            .update(rewardApplicationsSchema)
            .set({
              status,
              reviewNote: input.reviewNote,
              reviewedByUserId: input.reviewedByUserId,
              reviewedAt: input.reviewedAt,
              updatedAt: input.reviewedAt,
            })
            .where(
              and(
                eq(rewardApplicationsSchema.id, applicationId),
                eq(rewardApplicationsSchema.status, "pending"),
              ),
            )
            .returning({ id: rewardApplicationsSchema.id });

          if (!updated[0]) {
            throw new Error("Reward application is not pending");
          }
        }

        const taskRewardStore = createDrizzleTaskRewardStore(tx);
        return operation({
          application,
          createClaim: (record) => taskRewardStore.createClaim(record),
          markApproved: (input) => markApplication("approved", input),
          markRejected: (input) => markApplication("rejected", input),
        });
      });
    },
  };
}
