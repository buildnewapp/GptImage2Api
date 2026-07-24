import assert from "node:assert/strict";
import test from "node:test";

import { S3Client } from "@aws-sdk/client-s3";
import {
  copyTaskEvidenceObject,
  createTaskEvidencePresignedUploadUrl,
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
    key: "task/2026/07/24/upload/user-1/github_star/proof.png",
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

test("uses the shared R2 bucket for task evidence", async () => {
  const previousBucket = process.env.R2_BUCKET_NAME;
  process.env.R2_BUCKET_NAME = "shared-r2-bucket";

  try {
    const presignedUrl = await createTaskEvidencePresignedUploadUrl({
      key: "task/2026/07/24/upload/user-1/github_star/proof.png",
      contentType: "image/png",
      contentLength: 2048,
      client: createSigningClient(),
    });
    assert.match(presignedUrl, /shared-r2-bucket/);
  } finally {
    if (previousBucket === undefined) {
      delete process.env.R2_BUCKET_NAME;
    } else {
      process.env.R2_BUCKET_NAME = previousBucket;
    }
  }
});

test("copies evidence in the shared bucket with the source ETag condition", async () => {
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

  await copyTaskEvidenceObject({
    sourceKey: "task/2026/07/24/upload/user-1/github_star/upload.png",
    destinationKey: "task/2026/07/24/sealed/user-1/github_star/final.png",
    sourceETag: '"etag-1"',
    bucketName: "private-task-evidence",
    client,
  });

  assert.equal(commands[0]?.name, "CopyObjectCommand");
  assert.deepEqual(commands[0]?.input, {
    Bucket: "private-task-evidence",
    Key: "task/2026/07/24/sealed/user-1/github_star/final.png",
    CopySource:
      "private-task-evidence/task/2026/07/24/upload/user-1/github_star/upload.png",
    CopySourceIfMatch: '"etag-1"',
  });
  assert.equal(commands.length, 1);
});

test("builds a public evidence URL from the configured R2 host", async () => {
  const module = await import("@/lib/cloudflare/task-evidence-r2");
  const buildPublicUrl = (
    module as unknown as {
      createTaskEvidencePublicUrl?: (key: string) => string;
    }
  ).createTaskEvidencePublicUrl;
  const previousPublicUrl = process.env.R2_PUBLIC_URL;
  process.env.R2_PUBLIC_URL = "https://cdn.example.com/";

  try {
    assert.equal(typeof buildPublicUrl, "function");
    if (!buildPublicUrl) return;
    assert.equal(
      buildPublicUrl(
        "task/2026/07/24/sealed/user-1/github_star/final.png",
      ),
      "https://cdn.example.com/task/2026/07/24/sealed/user-1/github_star/final.png",
    );
  } finally {
    if (previousPublicUrl === undefined) {
      delete process.env.R2_PUBLIC_URL;
    } else {
      process.env.R2_PUBLIC_URL = previousPublicUrl;
    }
  }
});
