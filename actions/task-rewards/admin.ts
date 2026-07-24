"use server";

import {
  MANUAL_REVIEW_TASK_KEYS,
  type ManualReviewTaskKey,
} from "@/config/task-rewards";
import { actionResponse, type ActionResult } from "@/lib/action-response";
import { getSession, isAdmin } from "@/lib/auth/server";
import { createTaskEvidencePublicUrl } from "@/lib/cloudflare/task-evidence-r2";
import { getDb } from "@/lib/db";
import {
  rewardApplications as rewardApplicationsSchema,
  user as userSchema,
} from "@/lib/db/schema";
import { getErrorMessage } from "@/lib/error-utils";
import {
  mapAdminRewardApplicationReviewResult,
  parseAdminRewardApplicationReviewInput,
  type AdminRewardApplicationReviewData,
} from "@/lib/task-rewards/admin-action";
import {
  normalizeTaskRewardAdminListQuery,
  toTaskRewardAdminListOffset,
  type TaskRewardAdminListQueryInput,
} from "@/lib/task-rewards/admin-lists";
import { reviewRewardApplication } from "@/lib/task-rewards/applications";
import { createDrizzleRewardApplicationStore } from "@/lib/task-rewards/drizzle-application-store";
import { isSealedTaskEvidenceKeyOwnedBy } from "@/lib/task-rewards/evidence";
import { and, count, desc, eq, ilike, inArray, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";

const submittingUserSchema = alias(userSchema, "reward_application_user");
const reviewingUserSchema = alias(userSchema, "reward_application_reviewer");

export interface AdminRewardApplicationRow {
  id: string;
  userId: string;
  userEmail: string;
  taskKey: ManualReviewTaskKey;
  status: "pending" | "approved" | "rejected";
  creditAmount: number;
  submissionText: string | null;
  reviewNote: string | null;
  reviewedByUserId: string | null;
  reviewerEmail: string | null;
  submittedAt: string;
  reviewedAt: string | null;
}

export interface AdminRewardApplicationListData {
  rows: AdminRewardApplicationRow[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
}

export interface AdminRewardApplicationEvidenceData {
  applicationId: string;
  presignedUrl: string;
}

type AdminAccess =
  | { granted: true; userId: string }
  | { granted: false; result: ActionResult<never> };

async function requireAdminSession(): Promise<AdminAccess> {
  const session = await getSession();
  if (!session?.user) {
    return {
      granted: false,
      result: actionResponse.unauthorized("User not authenticated."),
    };
  }

  if (!(await isAdmin())) {
    return {
      granted: false,
      result: actionResponse.forbidden("Admin privileges required."),
    };
  }

  return { granted: true, userId: session.user.id };
}

export async function getAdminRewardApplications(
  input: TaskRewardAdminListQueryInput = {},
): Promise<ActionResult<AdminRewardApplicationListData>> {
  const access = await requireAdminSession();
  if (!access.granted) return access.result;

  const query = normalizeTaskRewardAdminListQuery(input);
  const conditions: SQL[] = [
    eq(rewardApplicationsSchema.source, "user"),
    eq(rewardApplicationsSchema.status, query.status),
    inArray(rewardApplicationsSchema.taskKey, MANUAL_REVIEW_TASK_KEYS),
  ];

  if (query.taskKey) {
    conditions.push(eq(rewardApplicationsSchema.taskKey, query.taskKey));
  }
  if (query.query) {
    conditions.push(ilike(submittingUserSchema.email, `%${query.query}%`));
  }

  const whereClause = and(...conditions);
  const db = getDb();

  try {
    const [rows, countRows] = await Promise.all([
      db
        .select({
          id: rewardApplicationsSchema.id,
          userId: rewardApplicationsSchema.userId,
          userEmail: submittingUserSchema.email,
          taskKey: rewardApplicationsSchema.taskKey,
          status: rewardApplicationsSchema.status,
          creditAmount: rewardApplicationsSchema.creditAmount,
          submissionText: rewardApplicationsSchema.submissionText,
          reviewNote: rewardApplicationsSchema.reviewNote,
          reviewedByUserId: rewardApplicationsSchema.reviewedByUserId,
          reviewerEmail: reviewingUserSchema.email,
          submittedAt: rewardApplicationsSchema.submittedAt,
          reviewedAt: rewardApplicationsSchema.reviewedAt,
        })
        .from(rewardApplicationsSchema)
        .innerJoin(
          submittingUserSchema,
          eq(rewardApplicationsSchema.userId, submittingUserSchema.id),
        )
        .leftJoin(
          reviewingUserSchema,
          eq(rewardApplicationsSchema.reviewedByUserId, reviewingUserSchema.id),
        )
        .where(whereClause)
        .orderBy(
          desc(rewardApplicationsSchema.submittedAt),
          desc(rewardApplicationsSchema.createdAt),
        )
        .offset(toTaskRewardAdminListOffset(query.pageIndex, query.pageSize))
        .limit(query.pageSize),
      db
        .select({ value: count() })
        .from(rewardApplicationsSchema)
        .innerJoin(
          submittingUserSchema,
          eq(rewardApplicationsSchema.userId, submittingUserSchema.id),
        )
        .where(whereClause),
    ]);

    return actionResponse.success({
      rows: rows.map((row) => ({
        ...row,
        userEmail: row.userEmail ?? "-",
        taskKey: row.taskKey as ManualReviewTaskKey,
        submittedAt: row.submittedAt.toISOString(),
        reviewedAt: row.reviewedAt?.toISOString() ?? null,
      })),
      totalCount: countRows[0]?.value ?? 0,
      pageIndex: query.pageIndex,
      pageSize: query.pageSize,
    });
  } catch (error) {
    console.error("Error loading reward applications for admin review", error);
    return actionResponse.error(getErrorMessage(error), "list_failed");
  }
}

const evidencePreviewInputSchema = z
  .object({ applicationId: z.string().uuid() })
  .strict();

export async function getAdminRewardApplicationEvidence(
  input: unknown,
): Promise<ActionResult<AdminRewardApplicationEvidenceData>> {
  const access = await requireAdminSession();
  if (!access.granted) return access.result;

  const parsed = evidencePreviewInputSchema.safeParse(input);
  if (!parsed.success) {
    return actionResponse.badRequest(
      "Invalid reward application.",
      "validation",
    );
  }

  try {
    const rows = await getDb()
      .select({
        id: rewardApplicationsSchema.id,
        userId: rewardApplicationsSchema.userId,
        taskKey: rewardApplicationsSchema.taskKey,
        evidenceUrls: rewardApplicationsSchema.evidenceUrls,
      })
      .from(rewardApplicationsSchema)
      .where(
        and(
          eq(rewardApplicationsSchema.id, parsed.data.applicationId),
          eq(rewardApplicationsSchema.source, "user"),
          inArray(rewardApplicationsSchema.taskKey, MANUAL_REVIEW_TASK_KEYS),
        ),
      )
      .limit(1);

    const application = rows[0];
    if (!application) {
      return actionResponse.notFound(
        "Reward application not found.",
        "not_found",
      );
    }

    const taskKey = application.taskKey as ManualReviewTaskKey;
    const evidenceKey = application.evidenceUrls[0];
    if (
      !evidenceKey ||
      !isSealedTaskEvidenceKeyOwnedBy({
        userId: application.userId,
        taskKey,
        key: evidenceKey,
      })
    ) {
      return actionResponse.notFound(
        "Evidence is unavailable for this application.",
        "evidence_unavailable",
      );
    }

    const presignedUrl = createTaskEvidencePublicUrl(evidenceKey);
    return actionResponse.success({
      applicationId: application.id,
      presignedUrl,
    });
  } catch (error) {
    console.error("Error creating reward evidence preview", error);
    return actionResponse.error(getErrorMessage(error), "evidence_unavailable");
  }
}

export async function reviewRewardApplicationAction(
  input: unknown,
): Promise<ActionResult<AdminRewardApplicationReviewData>> {
  const access = await requireAdminSession();
  if (!access.granted) return access.result;

  const parsed = parseAdminRewardApplicationReviewInput(input);
  if (!parsed.success) {
    return actionResponse.badRequest(
      "Invalid review request.",
      parsed.customCode,
    );
  }

  try {
    const result = await reviewRewardApplication({
      store: createDrizzleRewardApplicationStore(),
      applicationId: parsed.data.applicationId,
      reviewerUserId: access.userId,
      decision: parsed.data.decision,
      reviewNote: parsed.data.reviewNote,
    });
    return mapAdminRewardApplicationReviewResult(result);
  } catch (error) {
    console.error("Error reviewing reward application", error);
    return actionResponse.error(getErrorMessage(error), "review_failed");
  }
}
