import assert from "node:assert/strict";
import test from "node:test";

import {
  acquireAdminSystemEmailJobLock,
  advanceAdminSystemEmailJobProgress,
  buildAdminSystemEmailIdempotencyKey,
  buildAdminSystemEmailJob,
  canResumeAdminSystemEmailJob,
  getAdminSystemEmailBatchUserIds,
  isActivePaidSubscriptionStatus,
  maskAdminSystemEmailPreview,
  normalizeAdminSystemEmailScope,
  normalizeAdminSystemEmailSingleUserQuery,
  parseAdminSystemEmailJob,
  serializeAdminSystemEmailJob,
  splitAdminSystemEmailBodyIntoParagraphs,
} from "@/lib/admin/system-emails";

test("normalizes supported admin system email scopes", () => {
  assert.equal(normalizeAdminSystemEmailScope(" all_users "), "all_users");
  assert.equal(
    normalizeAdminSystemEmailScope("active_paid_users"),
    "active_paid_users",
  );
  assert.equal(normalizeAdminSystemEmailScope("missing"), null);
});

test("masks preview emails without exposing full recipient addresses", () => {
  assert.equal(
    maskAdminSystemEmailPreview("alice@example.com"),
    "a***e@example.com",
  );
  assert.equal(maskAdminSystemEmailPreview("ab@example.com"), "a***@example.com");
});

test("treats only active and trialing subscriptions as active paid", () => {
  assert.equal(isActivePaidSubscriptionStatus("active"), true);
  assert.equal(isActivePaidSubscriptionStatus("trialing"), true);
  assert.equal(isActivePaidSubscriptionStatus("canceled"), false);
  assert.equal(isActivePaidSubscriptionStatus("past_due"), false);
});

test("builds stable idempotency keys for the same job and user", () => {
  const first = buildAdminSystemEmailIdempotencyKey("job-1", "user-1");
  const second = buildAdminSystemEmailIdempotencyKey("job-1", "user-1");

  assert.equal(first, "admin-system-email:job-1:user-1");
  assert.equal(first, second);
});

test("creates a job and advances progress after a batch", () => {
  const createdAt = new Date("2026-03-10T00:00:00.000Z");
  const job = buildAdminSystemEmailJob({
    jobId: "job-1",
    createdByUserId: "admin-1",
    scope: "all_users",
    singleUserQuery: null,
    subject: "Maintenance notice",
    body: "Line 1\n\nLine 2",
    recipientUserIds: ["u1", "u2", "u3"],
    now: createdAt,
    expiresInHours: 24,
  });

  const updated = advanceAdminSystemEmailJobProgress(job, {
    processedCount: 2,
    successCount: 1,
    failureCount: 1,
    now: new Date("2026-03-10T00:01:00.000Z"),
  });

  assert.equal(job.cursor, 0);
  assert.equal(updated.cursor, 2);
  assert.equal(updated.successCount, 1);
  assert.equal(updated.failureCount, 1);
  assert.equal(updated.status, "running");
  assert.equal(updated.lastHeartbeatAt?.toISOString(), "2026-03-10T00:01:00.000Z");
});

test("marks a job as completed when all recipients are processed", () => {
  const job = buildAdminSystemEmailJob({
    jobId: "job-2",
    createdByUserId: "admin-1",
    scope: "single_user",
    singleUserQuery: "user@example.com",
    subject: "Single notice",
    body: "Hello",
    recipientUserIds: ["u1"],
    now: new Date("2026-03-10T00:00:00.000Z"),
    expiresInHours: 24,
  });

  const updated = advanceAdminSystemEmailJobProgress(job, {
    processedCount: 1,
    successCount: 1,
    failureCount: 0,
    now: new Date("2026-03-10T00:00:30.000Z"),
  });

  assert.equal(updated.cursor, 1);
  assert.equal(updated.status, "completed");
  assert.equal(updated.consumedAt?.toISOString(), "2026-03-10T00:00:30.000Z");
});

test("returns the next batch from the current cursor", () => {
  const job = buildAdminSystemEmailJob({
    jobId: "job-3",
    createdByUserId: "admin-1",
    scope: "all_paid_users",
    singleUserQuery: null,
    subject: "Notice",
    body: "Hello",
    recipientUserIds: ["u1", "u2", "u3", "u4"],
    now: new Date("2026-03-10T00:00:00.000Z"),
    expiresInHours: 24,
  });

  const progressed = advanceAdminSystemEmailJobProgress(job, {
    processedCount: 1,
    successCount: 1,
    failureCount: 0,
    now: new Date("2026-03-10T00:00:10.000Z"),
  });

  assert.deepEqual(getAdminSystemEmailBatchUserIds(progressed, 2), ["u2", "u3"]);
});

test("acquires a lock when the job is unlocked or expired", () => {
  const unlocked = buildAdminSystemEmailJob({
    jobId: "job-4",
    createdByUserId: "admin-1",
    scope: "all_users",
    singleUserQuery: null,
    subject: "Notice",
    body: "Hello",
    recipientUserIds: ["u1"],
    now: new Date("2026-03-10T00:00:00.000Z"),
    expiresInHours: 24,
  });

  const acquired = acquireAdminSystemEmailJobLock(unlocked, {
    now: new Date("2026-03-10T00:00:10.000Z"),
    lockDurationMs: 60_000,
  });

  assert.equal(acquired.acquired, true);
  assert.equal(
    acquired.job.lockExpiresAt?.toISOString(),
    "2026-03-10T00:01:10.000Z",
  );

  const denied = acquireAdminSystemEmailJobLock(acquired.job, {
    now: new Date("2026-03-10T00:00:20.000Z"),
    lockDurationMs: 60_000,
  });

  assert.equal(denied.acquired, false);
});

test("splits plain text body into non-empty paragraphs", () => {
  assert.deepEqual(
    splitAdminSystemEmailBodyIntoParagraphs(" One \n\nTwo\n\n\n Three "),
    ["One", "Two", "Three"],
  );
});

test("normalizes optional single-user queries", () => {
  assert.equal(normalizeAdminSystemEmailSingleUserQuery("  user@example.com "), "user@example.com");
  assert.equal(normalizeAdminSystemEmailSingleUserQuery("   "), null);
});

test("serializes and parses jobs through cache-friendly json", () => {
  const job = buildAdminSystemEmailJob({
    jobId: "job-5",
    createdByUserId: "admin-1",
    scope: "single_user",
    singleUserQuery: "user@example.com",
    subject: "Hello",
    body: "Body",
    recipientUserIds: ["u1"],
    now: new Date("2026-03-10T00:00:00.000Z"),
    expiresInHours: 24,
  });

  const serialized = serializeAdminSystemEmailJob(job);
  const parsed = parseAdminSystemEmailJob(serialized);

  assert.equal(parsed.jobId, "job-5");
  assert.equal(parsed.expiresAt.toISOString(), "2026-03-11T00:00:00.000Z");
  assert.equal(parsed.subject, "Hello");
});

test("allows resume only for incomplete, unexpired jobs", () => {
  const runningJob = acquireAdminSystemEmailJobLock(
    buildAdminSystemEmailJob({
      jobId: "job-6",
      createdByUserId: "admin-1",
      scope: "all_users",
      singleUserQuery: null,
      subject: "Notice",
      body: "Body",
      recipientUserIds: ["u1", "u2"],
      now: new Date("2026-03-10T00:00:00.000Z"),
      expiresInHours: 24,
    }),
    {
      now: new Date("2026-03-10T00:00:10.000Z"),
      lockDurationMs: 60_000,
    },
  ).job;

  assert.equal(
    canResumeAdminSystemEmailJob(runningJob, new Date("2026-03-10T00:00:20.000Z")),
    true,
  );

  const completed = advanceAdminSystemEmailJobProgress(
    buildAdminSystemEmailJob({
      jobId: "job-7",
      createdByUserId: "admin-1",
      scope: "single_user",
      singleUserQuery: "user@example.com",
      subject: "Done",
      body: "Body",
      recipientUserIds: ["u1"],
      now: new Date("2026-03-10T00:00:00.000Z"),
      expiresInHours: 24,
    }),
    {
      processedCount: 1,
      successCount: 1,
      failureCount: 0,
      now: new Date("2026-03-10T00:00:30.000Z"),
    },
  );

  assert.equal(
    canResumeAdminSystemEmailJob(completed, new Date("2026-03-10T00:00:40.000Z")),
    false,
  );
  assert.equal(
    canResumeAdminSystemEmailJob(
      {
        ...runningJob,
        expiresAt: new Date("2026-03-09T23:59:59.000Z"),
      },
      new Date("2026-03-10T00:00:20.000Z"),
    ),
    false,
  );
});
