export const ADMIN_SYSTEM_EMAIL_SCOPES = [
  "all_users",
  "all_paid_users",
  "active_paid_users",
  "single_user",
] as const;

export type AdminSystemEmailScope =
  (typeof ADMIN_SYSTEM_EMAIL_SCOPES)[number];

export type AdminSystemEmailJobStatus =
  | "draft"
  | "running"
  | "completed"
  | "failed";

export interface AdminSystemEmailJob {
  jobId: string;
  createdByUserId: string;
  status: AdminSystemEmailJobStatus;
  scope: AdminSystemEmailScope;
  singleUserQuery: string | null;
  subject: string;
  body: string;
  recipientUserIds: string[];
  cursor: number;
  successCount: number;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  consumedAt: Date | null;
  lockExpiresAt: Date | null;
  lastHeartbeatAt: Date | null;
  lastError: string | null;
}

export function normalizeAdminSystemEmailScope(
  value: string,
): AdminSystemEmailScope | null {
  const normalized = value.trim() as AdminSystemEmailScope;
  return ADMIN_SYSTEM_EMAIL_SCOPES.includes(normalized) ? normalized : null;
}

export function normalizeAdminSystemEmailSingleUserQuery(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

export function maskAdminSystemEmailPreview(email: string): string {
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf("@");
  if (atIndex <= 0) {
    return "***";
  }

  const localPart = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);
  const first = localPart[0] ?? "";
  const last = localPart.length > 2 ? localPart[localPart.length - 1] : "";

  return `${first}***${last}@${domain}`;
}

export function isActivePaidSubscriptionStatus(status: string): boolean {
  return status === "active" || status === "trialing";
}

export function buildAdminSystemEmailIdempotencyKey(
  jobId: string,
  userId: string,
): string {
  return `admin-system-email:${jobId}:${userId}`;
}

export function splitAdminSystemEmailBodyIntoParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function buildAdminSystemEmailJob({
  jobId,
  createdByUserId,
  scope,
  singleUserQuery,
  subject,
  body,
  recipientUserIds,
  now,
  expiresInHours,
}: {
  jobId: string;
  createdByUserId: string;
  scope: AdminSystemEmailScope;
  singleUserQuery: string | null;
  subject: string;
  body: string;
  recipientUserIds: string[];
  now: Date;
  expiresInHours: number;
}): AdminSystemEmailJob {
  return {
    jobId,
    createdByUserId,
    status: "draft",
    scope,
    singleUserQuery,
    subject,
    body,
    recipientUserIds: [...recipientUserIds],
    cursor: 0,
    successCount: 0,
    failureCount: 0,
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + expiresInHours * 60 * 60 * 1000),
    consumedAt: null,
    lockExpiresAt: null,
    lastHeartbeatAt: null,
    lastError: null,
  };
}

export function serializeAdminSystemEmailJob(
  job: AdminSystemEmailJob,
): Record<string, unknown> {
  return {
    ...job,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    expiresAt: job.expiresAt.toISOString(),
    consumedAt: job.consumedAt?.toISOString() ?? null,
    lockExpiresAt: job.lockExpiresAt?.toISOString() ?? null,
    lastHeartbeatAt: job.lastHeartbeatAt?.toISOString() ?? null,
  };
}

export function parseAdminSystemEmailJob(
  value: Record<string, unknown>,
): AdminSystemEmailJob {
  return {
    jobId: String(value.jobId),
    createdByUserId: String(value.createdByUserId),
    status: value.status as AdminSystemEmailJobStatus,
    scope: value.scope as AdminSystemEmailScope,
    singleUserQuery:
      typeof value.singleUserQuery === "string" ? value.singleUserQuery : null,
    subject: String(value.subject),
    body: String(value.body),
    recipientUserIds: Array.isArray(value.recipientUserIds)
      ? value.recipientUserIds.map((item) => String(item))
      : [],
    cursor: Number(value.cursor ?? 0),
    successCount: Number(value.successCount ?? 0),
    failureCount: Number(value.failureCount ?? 0),
    createdAt: new Date(String(value.createdAt)),
    updatedAt: new Date(String(value.updatedAt)),
    expiresAt: new Date(String(value.expiresAt)),
    consumedAt: value.consumedAt ? new Date(String(value.consumedAt)) : null,
    lockExpiresAt: value.lockExpiresAt
      ? new Date(String(value.lockExpiresAt))
      : null,
    lastHeartbeatAt: value.lastHeartbeatAt
      ? new Date(String(value.lastHeartbeatAt))
      : null,
    lastError: typeof value.lastError === "string" ? value.lastError : null,
  };
}

export function advanceAdminSystemEmailJobProgress(
  job: AdminSystemEmailJob,
  {
    processedCount,
    successCount,
    failureCount,
    now,
    lastError = null,
  }: {
    processedCount: number;
    successCount: number;
    failureCount: number;
    now: Date;
    lastError?: string | null;
  },
): AdminSystemEmailJob {
  const nextCursor = Math.min(job.cursor + processedCount, job.recipientUserIds.length);
  const isCompleted = nextCursor >= job.recipientUserIds.length;

  return {
    ...job,
    cursor: nextCursor,
    successCount: job.successCount + successCount,
    failureCount: job.failureCount + failureCount,
    updatedAt: now,
    lastHeartbeatAt: now,
    status: isCompleted ? "completed" : "running",
    consumedAt: isCompleted ? now : job.consumedAt,
    lockExpiresAt: null,
    lastError,
  };
}

export function getAdminSystemEmailBatchUserIds(
  job: AdminSystemEmailJob,
  batchSize: number,
): string[] {
  return job.recipientUserIds.slice(job.cursor, job.cursor + batchSize);
}

export function canResumeAdminSystemEmailJob(
  job: AdminSystemEmailJob,
  now: Date,
): boolean {
  if (job.status === "completed" || job.consumedAt) {
    return false;
  }

  return job.expiresAt.getTime() > now.getTime();
}

export function acquireAdminSystemEmailJobLock(
  job: AdminSystemEmailJob,
  {
    now,
    lockDurationMs,
  }: {
    now: Date;
    lockDurationMs: number;
  },
): { acquired: boolean; job: AdminSystemEmailJob } {
  const nowMs = now.getTime();
  const lockMs = job.lockExpiresAt ? job.lockExpiresAt.getTime() : 0;
  if (lockMs > nowMs) {
    return { acquired: false, job };
  }

  return {
    acquired: true,
    job: {
      ...job,
      status: job.status === "draft" ? "running" : job.status,
      updatedAt: now,
      lastHeartbeatAt: now,
      lockExpiresAt: new Date(nowMs + lockDurationMs),
    },
  };
}
