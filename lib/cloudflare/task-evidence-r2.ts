import { createR2Client } from "@/lib/cloudflare/r2-client";
import type { TaskEvidenceObjectMetadata } from "@/lib/task-rewards/evidence";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const TASK_EVIDENCE_URL_TTL_SECONDS = 300;
const TASK_EVIDENCE_HEADER_RANGE = "bytes=0-15";

type TaskEvidenceCommandClient = {
  send(command: any): Promise<any>;
};

function getTaskEvidenceBucketName(bucketName?: string): string {
  const resolved = bucketName ?? process.env.R2_TASK_EVIDENCE_BUCKET_NAME;
  if (!resolved) {
    throw new Error("Task evidence storage is not configured");
  }
  return resolved;
}

function encodeCopySource(bucketName: string, key: string): string {
  return `${bucketName}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export async function createTaskEvidencePresignedUploadUrl({
  key,
  contentType,
  contentLength,
  expiresIn = TASK_EVIDENCE_URL_TTL_SECONDS,
  bucketName,
  client = createR2Client(),
}: {
  key: string;
  contentType: string;
  contentLength: number;
  expiresIn?: number;
  bucketName?: string;
  client?: S3Client;
}): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getTaskEvidenceBucketName(bucketName),
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });

  return getSignedUrl(client, command, {
    expiresIn,
    signableHeaders: new Set(["content-length", "content-type"]),
  });
}

export async function createTaskEvidencePresignedDownloadUrl({
  key,
  expiresIn = TASK_EVIDENCE_URL_TTL_SECONDS,
  bucketName,
  client = createR2Client(),
}: {
  key: string;
  expiresIn?: number;
  bucketName?: string;
  client?: S3Client;
}): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getTaskEvidenceBucketName(bucketName),
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn });
}

export async function headTaskEvidenceObject({
  key,
  bucketName,
  client = createR2Client(),
}: {
  key: string;
  bucketName?: string;
  client?: TaskEvidenceCommandClient;
}): Promise<TaskEvidenceObjectMetadata | null> {
  try {
    const result = await client.send(
      new HeadObjectCommand({
        Bucket: getTaskEvidenceBucketName(bucketName),
        Key: key,
      }),
    );
    return {
      contentType: result.ContentType,
      contentLength: result.ContentLength,
      eTag: result.ETag,
    };
  } catch (error) {
    const storageError = error as {
      name?: string;
      $metadata?: { httpStatusCode?: number };
    };
    if (
      storageError.name === "NotFound" ||
      storageError.name === "NoSuchKey" ||
      storageError.$metadata?.httpStatusCode === 404
    ) {
      return null;
    }
    throw error;
  }
}

export async function readTaskEvidenceHeader({
  key,
  bucketName,
  client = createR2Client(),
}: {
  key: string;
  bucketName?: string;
  client?: TaskEvidenceCommandClient;
}): Promise<Uint8Array | null> {
  const result = await client.send(
    new GetObjectCommand({
      Bucket: getTaskEvidenceBucketName(bucketName),
      Key: key,
      Range: TASK_EVIDENCE_HEADER_RANGE,
    }),
  );
  if (!result.Body?.transformToByteArray) {
    return null;
  }
  return result.Body.transformToByteArray();
}

export async function copyTaskEvidenceObject({
  sourceKey,
  destinationKey,
  sourceETag,
  bucketName,
  client = createR2Client(),
}: {
  sourceKey: string;
  destinationKey: string;
  sourceETag: string;
  bucketName?: string;
  client?: TaskEvidenceCommandClient;
}): Promise<void> {
  const bucket = getTaskEvidenceBucketName(bucketName);
  await client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      Key: destinationKey,
      CopySource: encodeCopySource(bucket, sourceKey),
      CopySourceIfMatch: sourceETag,
    }),
  );
}

export async function deleteTaskEvidenceObject({
  key,
  bucketName,
  client = createR2Client(),
}: {
  key: string;
  bucketName?: string;
  client?: TaskEvidenceCommandClient;
}): Promise<void> {
  await client.send(
    new DeleteObjectCommand({
      Bucket: getTaskEvidenceBucketName(bucketName),
      Key: key,
    }),
  );
}

export async function sealTaskEvidenceObject({
  sourceKey,
  destinationKey,
  sourceETag,
  bucketName,
  client = createR2Client(),
}: {
  sourceKey: string;
  destinationKey: string;
  sourceETag: string;
  bucketName?: string;
  client?: TaskEvidenceCommandClient;
}): Promise<void> {
  await copyTaskEvidenceObject({
    sourceKey,
    destinationKey,
    sourceETag,
    bucketName,
    client,
  });
  await deleteTaskEvidenceObject({
    key: sourceKey,
    bucketName,
    client,
  });
}
