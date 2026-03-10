"use server";

import { actionResponse, type ActionResult } from "@/lib/action-response";
import { getSession, isAdmin } from "@/lib/auth/server";
import { getDb } from "@/lib/db";
import {
  cacheDb as cacheDbSchema,
  orders as ordersSchema,
  subscriptions as subscriptionsSchema,
  user as userSchema,
} from "@/lib/db/schema";
import {
  acquireAdminSystemEmailJobLock,
  advanceAdminSystemEmailJobProgress,
  buildAdminSystemEmailIdempotencyKey,
  buildAdminSystemEmailJob,
  canResumeAdminSystemEmailJob,
  getAdminSystemEmailBatchUserIds,
  isActivePaidSubscriptionStatus,
  maskAdminSystemEmailPreview,
  normalizeAdminSystemEmailSingleUserQuery,
  parseAdminSystemEmailJob,
  serializeAdminSystemEmailJob,
  splitAdminSystemEmailBodyIntoParagraphs,
  type AdminSystemEmailJob,
} from "@/lib/admin/system-emails";
import resend from "@/lib/resend";
import { AdminSystemBroadcastEmail } from "@/emails/admin-system-broadcast";
import {
  and,
  eq,
  gt,
  inArray,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";

const ADMIN_SYSTEM_EMAIL_NAMESPACE = "admin_system_email";
const JOB_EXPIRES_IN_HOURS = 48;
const DEFAULT_BATCH_SIZE = 30;
const MAX_BATCH_SIZE = 50;
const LOCK_DURATION_MS = 60_000;

const previewSchema = z
  .object({
    scope: z.enum([
      "all_users",
      "all_paid_users",
      "active_paid_users",
      "single_user",
    ]),
    singleUserQuery: z.string().optional().nullable(),
    subject: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(10000),
  })
  .superRefine((input, ctx) => {
    if (input.scope === "single_user" && !normalizeAdminSystemEmailSingleUserQuery(input.singleUserQuery)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Single user query is required.",
        path: ["singleUserQuery"],
      });
    }
  });

const sendSchema = z.object({
  jobId: z.string().trim().min(1),
  batchSize: z.coerce.number().int().min(1).max(MAX_BATCH_SIZE).optional(),
});

type RecipientRecord = {
  id: string;
  email: string;
};

export type PreviewResult = {
  jobId: string;
  totalRecipients: number;
  sampleRecipients: string[];
  scope: string;
};

export type SendResult = {
  jobId: string;
  status: AdminSystemEmailJob["status"];
  totalRecipients: number;
  successCount: number;
  failureCount: number;
  processedCount: number;
  remainingCount: number;
  nextCursor: number;
};

type DbClient = ReturnType<typeof getDb>;
type DbTransactionCallback = Parameters<DbClient["transaction"]>[0];
type DbTransaction = Parameters<DbTransactionCallback>[0];

function buildRecipientEligibilityConditions() {
  return [
    eq(userSchema.isAnonymous, false),
    or(isNull(userSchema.banned), eq(userSchema.banned, false)),
    sql`${userSchema.email} <> ''`,
  ];
}

async function resolveRecipients({
  scope,
  singleUserQuery,
}: {
  scope: z.infer<typeof previewSchema>["scope"];
  singleUserQuery: string | null;
}): Promise<RecipientRecord[]> {
  const db = getDb();
  const baseConditions = buildRecipientEligibilityConditions();

  if (scope === "all_users") {
    return db
      .select({
        id: userSchema.id,
        email: userSchema.email,
      })
      .from(userSchema)
      .where(and(...baseConditions));
  }

  if (scope === "single_user") {
    const normalizedQuery = normalizeAdminSystemEmailSingleUserQuery(singleUserQuery);
    if (!normalizedQuery) {
      return [];
    }

    const rows = await db
      .select({
        id: userSchema.id,
        email: userSchema.email,
      })
      .from(userSchema)
      .where(
        and(
          ...baseConditions,
          or(eq(userSchema.id, normalizedQuery), eq(userSchema.email, normalizedQuery)),
        ),
      )
      .limit(1);

    return rows;
  }

  if (scope === "all_paid_users") {
    const rows = await db
      .select({
        id: userSchema.id,
        email: userSchema.email,
      })
      .from(ordersSchema)
      .innerJoin(userSchema, eq(ordersSchema.userId, userSchema.id))
      .where(
        and(
          ...baseConditions,
          inArray(ordersSchema.status, ["succeeded", "active"]),
        ),
      );

    return dedupeRecipients(rows);
  }

  const now = new Date();
  const rows = await db
    .select({
      id: userSchema.id,
      email: userSchema.email,
      status: subscriptionsSchema.status,
      endedAt: subscriptionsSchema.endedAt,
    })
    .from(subscriptionsSchema)
    .innerJoin(userSchema, eq(subscriptionsSchema.userId, userSchema.id))
    .where(
      and(
        ...baseConditions,
        inArray(subscriptionsSchema.status, ["active", "trialing"]),
        or(
          isNull(subscriptionsSchema.endedAt),
          gt(subscriptionsSchema.endedAt, now),
        ),
      ),
    );

  return dedupeRecipients(
    rows.filter((row) => isActivePaidSubscriptionStatus(row.status)).map((row) => ({
      id: row.id,
      email: row.email,
    })),
  );
}

function dedupeRecipients(rows: RecipientRecord[]): RecipientRecord[] {
  const seen = new Set<string>();
  const deduped: RecipientRecord[] = [];

  for (const row of rows) {
    if (seen.has(row.id)) {
      continue;
    }

    seen.add(row.id);
    deduped.push(row);
  }

  return deduped;
}

async function upsertJob(
  tx: DbTransaction,
  job: AdminSystemEmailJob,
): Promise<void> {
  await tx
    .insert(cacheDbSchema)
    .values({
      namespace: ADMIN_SYSTEM_EMAIL_NAMESPACE,
      cacheKey: job.jobId,
      valueJsonb: serializeAdminSystemEmailJob(job),
      expiresAt: job.expiresAt,
      consumedAt: job.consumedAt,
    })
    .onConflictDoUpdate({
      target: [cacheDbSchema.namespace, cacheDbSchema.cacheKey],
      set: {
        valueJsonb: serializeAdminSystemEmailJob(job),
        expiresAt: job.expiresAt,
        consumedAt: job.consumedAt,
        updatedAt: new Date(),
      },
    });
}

async function getJobForUpdate(
  tx: DbTransaction,
  jobId: string,
): Promise<AdminSystemEmailJob | null> {
  const rows = await tx
    .select({
      valueJsonb: cacheDbSchema.valueJsonb,
      expiresAt: cacheDbSchema.expiresAt,
      consumedAt: cacheDbSchema.consumedAt,
    })
    .from(cacheDbSchema)
    .where(
      and(
        eq(cacheDbSchema.namespace, ADMIN_SYSTEM_EMAIL_NAMESPACE),
        eq(cacheDbSchema.cacheKey, jobId),
      ),
    )
    .limit(1)
    .for("update");

  const row = rows[0];
  if (!row) {
    return null;
  }

  const job = parseAdminSystemEmailJob(row.valueJsonb as Record<string, unknown>);
  return {
    ...job,
    expiresAt: row.expiresAt,
    consumedAt: row.consumedAt,
  };
}

async function getRecipientsByIds(userIds: string[]): Promise<Map<string, RecipientRecord>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const db = getDb();
  const baseConditions = buildRecipientEligibilityConditions();
  const rows = await db
    .select({
      id: userSchema.id,
      email: userSchema.email,
    })
    .from(userSchema)
    .where(and(inArray(userSchema.id, userIds), ...baseConditions));

  return new Map(rows.map((row) => [row.id, row]));
}

function toSendSummary(job: AdminSystemEmailJob): SendResult {
  return {
    jobId: job.jobId,
    status: job.status,
    totalRecipients: job.recipientUserIds.length,
    successCount: job.successCount,
    failureCount: job.failureCount,
    processedCount: job.cursor,
    remainingCount: Math.max(0, job.recipientUserIds.length - job.cursor),
    nextCursor: job.cursor,
  };
}

async function persistProgress(job: AdminSystemEmailJob): Promise<AdminSystemEmailJob> {
  await getDb().transaction(async (tx) => {
    await upsertJob(tx, job);
  });

  return job;
}

export async function previewAdminSystemEmail(
  input: z.input<typeof previewSchema>,
): Promise<ActionResult<PreviewResult>> {
  if (!(await isAdmin())) {
    return actionResponse.forbidden("Admin privileges required.");
  }

  const session = await getSession();
  const adminUserId = session?.user.id;
  if (!adminUserId) {
    return actionResponse.unauthorized();
  }

  try {
    const parsed = previewSchema.parse(input);
    const singleUserQuery = normalizeAdminSystemEmailSingleUserQuery(parsed.singleUserQuery);
    const recipients = await resolveRecipients({
      scope: parsed.scope,
      singleUserQuery,
    });

    if (recipients.length === 0) {
      return actionResponse.notFound("No eligible recipients found.");
    }

    const job = buildAdminSystemEmailJob({
      jobId: crypto.randomUUID(),
      createdByUserId: adminUserId,
      scope: parsed.scope,
      singleUserQuery,
      subject: parsed.subject,
      body: parsed.body,
      recipientUserIds: recipients.map((recipient) => recipient.id),
      now: new Date(),
      expiresInHours: JOB_EXPIRES_IN_HOURS,
    });

    await getDb().transaction(async (tx) => {
      await upsertJob(tx, job);
    });

    return actionResponse.success({
      jobId: job.jobId,
      totalRecipients: recipients.length,
      sampleRecipients: recipients
        .slice(0, 3)
        .map((recipient) => maskAdminSystemEmailPreview(recipient.email)),
      scope: parsed.scope,
    });
  } catch (error) {
    console.error("Failed to preview admin system email", error);
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message ?? "Invalid payload."
        : "Failed to preview admin system email.";
    return actionResponse.error(message);
  }
}

export async function sendOrResumeAdminSystemEmail(
  input: z.input<typeof sendSchema>,
): Promise<ActionResult<SendResult>> {
  if (!(await isAdmin())) {
    return actionResponse.forbidden("Admin privileges required.");
  }

  const session = await getSession();
  const adminUserId = session?.user.id;
  if (!adminUserId) {
    return actionResponse.unauthorized();
  }

  if (!resend) {
    return actionResponse.error("Resend env is not set");
  }

  const senderEmail = process.env.ADMIN_EMAIL;
  if (!senderEmail) {
    return actionResponse.error("Sender email is not configured.");
  }

  const senderName = process.env.ADMIN_NAME ?? "Admin";
  const from = `${senderName} <${senderEmail}>`;

  try {
    const parsed = sendSchema.parse(input);
    const batchSize = parsed.batchSize ?? DEFAULT_BATCH_SIZE;

    const lockedJob = await getDb().transaction(async (tx) => {
      const currentJob = await getJobForUpdate(tx, parsed.jobId);
      if (!currentJob) {
        return null;
      }

      if (currentJob.createdByUserId !== adminUserId) {
        throw new Error("This job belongs to a different admin.");
      }

      if (!canResumeAdminSystemEmailJob(currentJob, new Date())) {
        return currentJob;
      }

      const lockAttempt = acquireAdminSystemEmailJobLock(currentJob, {
        now: new Date(),
        lockDurationMs: LOCK_DURATION_MS,
      });

      if (!lockAttempt.acquired) {
        throw new Error("This email job is already running.");
      }

      await upsertJob(tx, lockAttempt.job);
      return lockAttempt.job;
    });

    if (!lockedJob) {
      return actionResponse.notFound("Email job not found.");
    }

    if (!canResumeAdminSystemEmailJob(lockedJob, new Date())) {
      return actionResponse.success(toSendSummary(lockedJob));
    }

    let currentJob = lockedJob;
    const batchUserIds = getAdminSystemEmailBatchUserIds(currentJob, batchSize);
    const recipientsById = await getRecipientsByIds(batchUserIds);
    const paragraphs = splitAdminSystemEmailBodyIntoParagraphs(currentJob.body);

    if (batchUserIds.length === 0) {
      const completedJob =
        currentJob.cursor >= currentJob.recipientUserIds.length
          ? {
              ...currentJob,
              status: "completed" as const,
              consumedAt: new Date(),
              lockExpiresAt: null,
              updatedAt: new Date(),
            }
          : currentJob;
      await persistProgress(completedJob);
      return actionResponse.success(toSendSummary(completedJob));
    }

    for (const userId of batchUserIds) {
      const recipient = recipientsById.get(userId);
      let nextJob: AdminSystemEmailJob;
      const now = new Date();

      if (!recipient) {
        nextJob = advanceAdminSystemEmailJobProgress(currentJob, {
          processedCount: 1,
          successCount: 0,
          failureCount: 1,
          now,
          lastError: "Recipient no longer exists.",
        });
      } else {
        try {
          const result = await resend.emails.send(
            {
              from,
              to: recipient.email,
              subject: currentJob.subject,
              react: AdminSystemBroadcastEmail({
                subject: currentJob.subject,
                paragraphs,
              }),
            },
            {
              idempotencyKey: buildAdminSystemEmailIdempotencyKey(
                currentJob.jobId,
                recipient.id,
              ),
            },
          );

          if (result.error) {
            nextJob = advanceAdminSystemEmailJobProgress(currentJob, {
              processedCount: 1,
              successCount: 0,
              failureCount: 1,
              now,
              lastError: result.error.message,
            });
          } else {
            nextJob = advanceAdminSystemEmailJobProgress(currentJob, {
              processedCount: 1,
              successCount: 1,
              failureCount: 0,
              now,
              lastError: null,
            });
          }
        } catch (error) {
          nextJob = advanceAdminSystemEmailJobProgress(currentJob, {
            processedCount: 1,
            successCount: 0,
            failureCount: 1,
            now,
            lastError: error instanceof Error ? error.message : "Unknown email send error.",
          });
        }
      }

      if (nextJob.status !== "completed") {
        nextJob = {
          ...nextJob,
          status: "running",
          lockExpiresAt: new Date(now.getTime() + LOCK_DURATION_MS),
        };
      }

      currentJob = await persistProgress(nextJob);
    }

    if (currentJob.status !== "completed") {
      currentJob = await persistProgress({
        ...currentJob,
        lockExpiresAt: null,
        updatedAt: new Date(),
      });
    }

    return actionResponse.success(toSendSummary(currentJob));
  } catch (error) {
    console.error("Failed to send or resume admin system email", error);
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message ?? "Invalid payload."
        : error instanceof Error
          ? error.message
          : "Failed to send admin system email.";
    return actionResponse.error(message);
  }
}
