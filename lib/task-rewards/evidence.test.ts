import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_TASK_EVIDENCE_BYTES,
  buildSealedTaskEvidenceKey,
  buildTaskEvidenceKey,
  isSealedTaskEvidenceKeyOwnedBy,
  isTaskEvidenceKeyOwnedBy,
  prepareTaskEvidenceUpload,
  taskEvidenceUploadInputSchema,
  validateTaskEvidenceObject,
  verifyAndSealTaskEvidence,
} from "@/lib/task-rewards/evidence";
import { REDIS_RATE_LIMIT_CONFIGS } from "@/lib/upstash/redis-rate-limit-configs";

const uuid = "123e4567-e89b-42d3-a456-426614174000";

test("accepts only supported image names, content types, and sizes", () => {
  for (const input of [
    {
      taskKey: "github_star",
      fileName: "proof.jpg",
      contentType: "image/jpeg",
      fileSize: MAX_TASK_EVIDENCE_BYTES,
    },
    {
      taskKey: "share_twitter",
      fileName: "proof.PNG",
      contentType: "image/png",
      fileSize: 1,
    },
    {
      taskKey: "share_instagram",
      fileName: "proof.webp",
      contentType: "image/webp",
      fileSize: 1024,
    },
  ]) {
    assert.equal(taskEvidenceUploadInputSchema.safeParse(input).success, true);
  }
});

test("rejects SVG, GIF, forged mime-extension pairs, and oversized files", () => {
  for (const input of [
    {
      taskKey: "github_star",
      fileName: "proof.svg",
      contentType: "image/svg+xml",
      fileSize: 100,
    },
    {
      taskKey: "github_star",
      fileName: "proof.gif",
      contentType: "image/gif",
      fileSize: 100,
    },
    {
      taskKey: "github_star",
      fileName: "proof.png",
      contentType: "image/jpeg",
      fileSize: 100,
    },
    {
      taskKey: "github_star",
      fileName: "proof.jpg",
      contentType: "image/jpeg",
      fileSize: MAX_TASK_EVIDENCE_BYTES + 1,
    },
  ]) {
    assert.equal(taskEvidenceUploadInputSchema.safeParse(input).success, false);
  }
});

test("rejects arbitrary paths, traversal names, unknown tasks, and extra authority fields", () => {
  for (const input of [
    {
      taskKey: "github_star",
      fileName: "folder/proof.png",
      contentType: "image/png",
      fileSize: 100,
    },
    {
      taskKey: "github_star",
      fileName: "..\\proof.png",
      contentType: "image/png",
      fileSize: 100,
    },
    {
      taskKey: "forged_task",
      fileName: "proof.png",
      contentType: "image/png",
      fileSize: 100,
    },
    {
      taskKey: "github_star",
      fileName: "proof.png",
      contentType: "image/png",
      fileSize: 100,
      path: "admin",
      creditAmount: 9999,
      userId: "other-user",
      url: "https://attacker.example/evidence.png",
    },
  ]) {
    assert.equal(taskEvidenceUploadInputSchema.safeParse(input).success, false);
  }
});

test("builds server-owned keys with the authenticated user and validated task", () => {
  assert.equal(
    buildTaskEvidenceKey({
      userId: "user-1",
      taskKey: "github_star",
      contentType: "image/jpeg",
      randomUUID: () => uuid,
    }),
    `task-evidence/user-1/github_star/${uuid}.jpg`,
  );
});

test("prepares a size-bound presigned PUT without exposing a public object URL", async () => {
  const presignInputs: Array<{
    key: string;
    contentType: string;
    contentLength: number;
  }> = [];
  const result = await prepareTaskEvidenceUpload({
    userId: "user-1",
    input: {
      taskKey: "github_star",
      fileName: "proof.png",
      contentType: "image/png",
      fileSize: 2048,
    },
    randomUUID: () => uuid,
    createPresignedUploadUrl: async (input) => {
      presignInputs.push(input);
      return "https://r2.example/presigned-put";
    },
  });

  assert.deepEqual(presignInputs, [
    {
      key: `task-evidence/user-1/github_star/${uuid}.png`,
      contentType: "image/png",
      contentLength: 2048,
    },
  ]);
  assert.deepEqual(result, {
    key: `task-evidence/user-1/github_star/${uuid}.png`,
    presignedUrl: "https://r2.example/presigned-put",
  });
  assert.equal("publicObjectUrl" in result, false);
});

test("builds a different server-only key for sealed evidence", () => {
  const finalUuid = "223e4567-e89b-42d3-a456-426614174000";
  const key = buildSealedTaskEvidenceKey({
    userId: "user-1",
    taskKey: "github_star",
    contentType: "image/png",
    randomUUID: () => finalUuid,
  });

  assert.equal(key, `task-evidence-sealed/user-1/github_star/${finalUuid}.png`);
  assert.notEqual(key, `task-evidence/user-1/github_star/${uuid}.png`);
});

test("sealed evidence validation accepts only the exact application owner and manual task", () => {
  const key = `task-evidence-sealed/user-1/github_star/${uuid}.png`;

  assert.equal(
    isSealedTaskEvidenceKeyOwnedBy({
      userId: "user-1",
      taskKey: "github_star",
      key,
    }),
    true,
  );
  assert.equal(
    isSealedTaskEvidenceKeyOwnedBy({
      userId: "user-2",
      taskKey: "github_star",
      key,
    }),
    false,
  );
  assert.equal(
    isSealedTaskEvidenceKeyOwnedBy({
      userId: "user-1",
      taskKey: "share_twitter",
      key,
    }),
    false,
  );
  assert.equal(
    isSealedTaskEvidenceKeyOwnedBy({
      userId: "user-1",
      taskKey: "github_star",
      key: key.replace("task-evidence-sealed", "task-evidence"),
    }),
    false,
  );
});

test("ownership requires the exact user, task, UUID filename, and safe fixed path", () => {
  const key = `task-evidence/user-1/github_star/${uuid}.png`;

  assert.equal(
    isTaskEvidenceKeyOwnedBy({ userId: "user-1", taskKey: "github_star", key }),
    true,
  );
  assert.equal(
    isTaskEvidenceKeyOwnedBy({ userId: "user-2", taskKey: "github_star", key }),
    false,
  );
  assert.equal(
    isTaskEvidenceKeyOwnedBy({
      userId: "user-1",
      taskKey: "share_twitter",
      key,
    }),
    false,
  );

  for (const unsafeKey of [
    "https://cdn.example.com/proof.png",
    "task-evidence/user-1/github_star/../../admin.png",
    "task-evidence/user-1/github_star/not-a-uuid.png",
    `task-evidence/user-1/github_star/${uuid}.svg`,
    `task-evidence/user-1/github_star/${uuid}.gif`,
    `/task-evidence/user-1/github_star/${uuid}.png`,
  ]) {
    assert.equal(
      isTaskEvidenceKeyOwnedBy({
        userId: "user-1",
        taskKey: "github_star",
        key: unsafeKey,
      }),
      false,
    );
  }
});

test("validates real object metadata instead of trusting upload request metadata", () => {
  const key = `task-evidence/user-1/github_star/${uuid}.webp`;
  const base = {
    userId: "user-1",
    taskKey: "github_star" as const,
    key,
  };

  assert.equal(
    validateTaskEvidenceObject({
      ...base,
      object: { contentType: "image/webp", contentLength: 4096 },
    }),
    true,
  );
  assert.equal(validateTaskEvidenceObject({ ...base, object: null }), false);
  assert.equal(
    validateTaskEvidenceObject({
      ...base,
      object: { contentType: "image/png", contentLength: 4096 },
    }),
    false,
  );
  assert.equal(
    validateTaskEvidenceObject({
      ...base,
      object: {
        contentType: "image/webp",
        contentLength: MAX_TASK_EVIDENCE_BYTES + 1,
      },
    }),
    false,
  );
  assert.equal(
    validateTaskEvidenceObject({
      ...base,
      object: { contentType: "image/webp", contentLength: undefined },
    }),
    false,
  );
});

test("rejects evidence whose bytes do not match its declared image type", async () => {
  let copied = false;
  const result = await verifyAndSealTaskEvidence({
    userId: "user-1",
    taskKey: "github_star",
    uploadKey: `task-evidence/user-1/github_star/${uuid}.png`,
    headObject: async () => ({
      contentType: "image/png",
      contentLength: 1024,
      eTag: '"etag-1"',
    }),
    readHeader: async () => new Uint8Array([0x47, 0x49, 0x46, 0x38]),
    copyObject: async () => {
      copied = true;
    },
    deleteObject: async () => {},
  });

  assert.equal(result, null);
  assert.equal(copied, false);
});

test("seals verified magic bytes with an ETag-conditional copy and returns only the final key", async () => {
  const finalUuid = "223e4567-e89b-42d3-a456-426614174000";
  const uploadKey = `task-evidence/user-1/github_star/${uuid}.jpg`;
  const copies: Array<{
    sourceKey: string;
    destinationKey: string;
    sourceETag: string;
  }> = [];
  const deleted: string[] = [];

  const result = await verifyAndSealTaskEvidence({
    userId: "user-1",
    taskKey: "github_star",
    uploadKey,
    randomUUID: () => finalUuid,
    headObject: async () => ({
      contentType: "image/jpeg",
      contentLength: 2048,
      eTag: '"etag-1"',
    }),
    readHeader: async () => new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
    copyObject: async (input) => {
      copies.push(input);
    },
    deleteObject: async (key) => {
      deleted.push(key);
    },
  });

  const sealedKey = `task-evidence-sealed/user-1/github_star/${finalUuid}.jpg`;
  assert.equal(result, sealedKey);
  assert.notEqual(result, uploadKey);
  assert.deepEqual(copies, [
    {
      sourceKey: uploadKey,
      destinationKey: sealedKey,
      sourceETag: '"etag-1"',
    },
  ]);
  assert.deepEqual(deleted, [uploadKey]);
});

test("treats an ETag-conditional copy failure as invalid evidence", async () => {
  const uploadKey = `task-evidence/user-1/github_star/${uuid}.jpg`;
  let deleted = false;
  const result = await verifyAndSealTaskEvidence({
    userId: "user-1",
    taskKey: "github_star",
    uploadKey,
    headObject: async () => ({
      contentType: "image/jpeg",
      contentLength: 2048,
      eTag: '"stale-etag"',
    }),
    readHeader: async () => new Uint8Array([0xff, 0xd8, 0xff]),
    copyObject: async () => {
      throw new Error("precondition failed");
    },
    deleteObject: async () => {
      deleted = true;
    },
  });

  assert.equal(result, null);
  assert.equal(deleted, false);
});

test("task evidence uploads are limited per authenticated user", () => {
  assert.deepEqual(REDIS_RATE_LIMIT_CONFIGS.taskEvidenceUpload, {
    prefix: `${REDIS_RATE_LIMIT_CONFIGS.taskEvidenceUpload.prefix}`,
    maxRequests: 20,
    window: "1 d",
  });
  assert.match(
    REDIS_RATE_LIMIT_CONFIGS.taskEvidenceUpload.prefix,
    /task-evidence-upload$/,
  );
});
