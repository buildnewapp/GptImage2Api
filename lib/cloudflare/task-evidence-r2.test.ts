import assert from "node:assert/strict";
import test from "node:test";

import { S3Client } from "@aws-sdk/client-s3";
import {
  createTaskEvidencePresignedDownloadUrl,
  createTaskEvidencePresignedUploadUrl,
  sealTaskEvidenceObject,
} from "@/lib/cloudflare/task-evidence-r2";

function createSigningClient() {
  return new S3Client({
    region: "auto",
    endpoint: "https://account-id.r2.cloudflarestorage.com",
    credentials: {
      accessKeyId: "test-access-key",
      secretAccessKey: "test-secret-key",
    },
  });
}

test("presigns a private size-bound upload for about five minutes", async () => {
  const presignedUrl = await createTaskEvidencePresignedUploadUrl({
    key: "task-evidence/user-1/github_star/proof.png",
    contentType: "image/png",
    contentLength: 2048,
    bucketName: "private-task-evidence",
    client: createSigningClient(),
  });
  const url = new URL(presignedUrl);
  const signedHeaders = url.searchParams.get("X-Amz-SignedHeaders") ?? "";

  assert.equal(url.searchParams.get("X-Amz-Expires"), "300");
  assert.match(signedHeaders, /content-length/);
  assert.match(signedHeaders, /content-type/);
  assert.equal(url.href.includes("public"), false);
});

test("never falls back to the public bucket for task evidence", async () => {
  const previousPrivateBucket = process.env.R2_TASK_EVIDENCE_BUCKET_NAME;
  const previousPublicBucket = process.env.R2_BUCKET_NAME;
  delete process.env.R2_TASK_EVIDENCE_BUCKET_NAME;
  process.env.R2_BUCKET_NAME = "public-bucket-must-not-be-used";

  try {
    await assert.rejects(
      createTaskEvidencePresignedUploadUrl({
        key: "task-evidence/user-1/github_star/proof.png",
        contentType: "image/png",
        contentLength: 2048,
        client: createSigningClient(),
      }),
      /Task evidence storage is not configured/,
    );
  } finally {
    if (previousPrivateBucket === undefined) {
      delete process.env.R2_TASK_EVIDENCE_BUCKET_NAME;
    } else {
      process.env.R2_TASK_EVIDENCE_BUCKET_NAME = previousPrivateBucket;
    }
    if (previousPublicBucket === undefined) {
      delete process.env.R2_BUCKET_NAME;
    } else {
      process.env.R2_BUCKET_NAME = previousPublicBucket;
    }
  }
});

test("seals evidence in the private bucket with the source ETag condition before deleting temp", async () => {
  const commands: Array<{ name: string; input: Record<string, unknown> }> = [];
  const client = {
    async send(command: {
      constructor: { name: string };
      input: Record<string, unknown>;
    }) {
      commands.push({ name: command.constructor.name, input: command.input });
      return {};
    },
  };

  await sealTaskEvidenceObject({
    sourceKey: "task-evidence/user-1/github_star/upload.png",
    destinationKey: "task-evidence-sealed/user-1/github_star/final.png",
    sourceETag: '"etag-1"',
    bucketName: "private-task-evidence",
    client,
  });

  assert.equal(commands[0]?.name, "CopyObjectCommand");
  assert.deepEqual(commands[0]?.input, {
    Bucket: "private-task-evidence",
    Key: "task-evidence-sealed/user-1/github_star/final.png",
    CopySource:
      "private-task-evidence/task-evidence/user-1/github_star/upload.png",
    CopySourceIfMatch: '"etag-1"',
  });
  assert.equal(commands[1]?.name, "DeleteObjectCommand");
  assert.deepEqual(commands[1]?.input, {
    Bucket: "private-task-evidence",
    Key: "task-evidence/user-1/github_star/upload.png",
  });
});

test("creates a dedicated private signed GET for later authorized previews", async () => {
  const url = await createTaskEvidencePresignedDownloadUrl({
    key: "task-evidence-sealed/user-1/github_star/final.png",
    bucketName: "private-task-evidence",
    client: createSigningClient(),
  });

  assert.equal(new URL(url).searchParams.get("X-Amz-Expires"), "300");
});
