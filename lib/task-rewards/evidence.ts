import {
  MANUAL_REVIEW_TASK_KEYS,
  type ManualReviewTaskKey,
} from "@/config/task-rewards";
import { z } from "zod";

export const MAX_TASK_EVIDENCE_BYTES = 5 * 1024 * 1024;

export const TASK_EVIDENCE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type TaskEvidenceContentType =
  (typeof TASK_EVIDENCE_CONTENT_TYPES)[number];

export interface TaskEvidenceObjectMetadata {
  contentType?: string;
  contentLength?: number;
  eTag?: string;
}

const taskKeySchema = z.enum(MANUAL_REVIEW_TASK_KEYS);
const contentTypeSchema = z.enum(TASK_EVIDENCE_CONTENT_TYPES);

const contentTypeExtensions: Record<
  TaskEvidenceContentType,
  readonly string[]
> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
};

const canonicalExtensions: Record<TaskEvidenceContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const extensionContentTypes: Record<string, TaskEvidenceContentType> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const safePathSegmentPattern = /^[A-Za-z0-9_-]+$/;

function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot >= 0 ? fileName.slice(lastDot + 1).toLowerCase() : "";
}

function isSafeFileName(fileName: string): boolean {
  return (
    fileName.length > 0 &&
    fileName.length <= 255 &&
    !fileName.includes("/") &&
    !fileName.includes("\\") &&
    !fileName.includes("\0")
  );
}

export const taskEvidenceUploadInputSchema = z
  .object({
    taskKey: taskKeySchema,
    fileName: z.string().trim().min(1).max(255),
    contentType: contentTypeSchema,
    fileSize: z.number().int().positive().max(MAX_TASK_EVIDENCE_BYTES),
  })
  .strict()
  .superRefine((input, context) => {
    if (!isSafeFileName(input.fileName)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fileName"],
        message: "File name must not contain a path.",
      });
      return;
    }

    const extension = getFileExtension(input.fileName);
    if (!contentTypeExtensions[input.contentType].includes(extension)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fileName"],
        message: "File extension does not match its content type.",
      });
    }
  });

export type TaskEvidenceUploadInput = z.infer<
  typeof taskEvidenceUploadInputSchema
>;

export async function prepareTaskEvidenceUpload({
  userId,
  input,
  randomUUID,
  createPresignedUploadUrl,
}: {
  userId: string;
  input: TaskEvidenceUploadInput;
  randomUUID?: () => string;
  createPresignedUploadUrl: (input: {
    key: string;
    contentType: string;
    contentLength: number;
  }) => Promise<string>;
}): Promise<{ key: string; presignedUrl: string }> {
  const validated = taskEvidenceUploadInputSchema.parse(input);
  const key = buildTaskEvidenceKey({
    userId,
    taskKey: validated.taskKey,
    contentType: validated.contentType,
    randomUUID,
  });
  const presignedUrl = await createPresignedUploadUrl({
    key,
    contentType: validated.contentType,
    contentLength: validated.fileSize,
  });

  return { key, presignedUrl };
}

export function buildTaskEvidenceKey({
  userId,
  taskKey,
  contentType,
  randomUUID = () => crypto.randomUUID(),
}: {
  userId: string;
  taskKey: ManualReviewTaskKey;
  contentType: TaskEvidenceContentType;
  randomUUID?: () => string;
}): string {
  if (!safePathSegmentPattern.test(userId)) {
    throw new Error("Authenticated user id is not safe for an object key.");
  }
  if (!taskKeySchema.safeParse(taskKey).success) {
    throw new Error("Manual task key is invalid.");
  }

  const uuid = randomUUID();
  if (!uuidPattern.test(uuid)) {
    throw new Error("Generated evidence id is not a UUID.");
  }

  const extension = canonicalExtensions[contentType];
  if (!extension) {
    throw new Error("Evidence content type is invalid.");
  }

  return `task-evidence/${userId}/${taskKey}/${uuid}.${extension}`;
}

export function buildSealedTaskEvidenceKey({
  userId,
  taskKey,
  contentType,
  randomUUID = () => crypto.randomUUID(),
}: {
  userId: string;
  taskKey: ManualReviewTaskKey;
  contentType: TaskEvidenceContentType;
  randomUUID?: () => string;
}): string {
  const uploadKey = buildTaskEvidenceKey({
    userId,
    taskKey,
    contentType,
    randomUUID,
  });
  return uploadKey.replace("task-evidence/", "task-evidence-sealed/");
}

function parseTaskEvidenceKey(
  key: string,
  namespace: "task-evidence" | "task-evidence-sealed" = "task-evidence",
): {
  userId: string;
  taskKey: ManualReviewTaskKey;
  contentType: TaskEvidenceContentType;
} | null {
  const parts = key.split("/");
  if (parts.length !== 4 || parts[0] !== namespace) {
    return null;
  }

  const [, userId, rawTaskKey, fileName] = parts;
  if (!safePathSegmentPattern.test(userId)) {
    return null;
  }
  const parsedTaskKey = taskKeySchema.safeParse(rawTaskKey);
  if (!parsedTaskKey.success) {
    return null;
  }

  const fileMatch = fileName.match(
    /^([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.(jpg|png|webp)$/i,
  );
  if (!fileMatch) {
    return null;
  }

  return {
    userId,
    taskKey: parsedTaskKey.data,
    contentType: extensionContentTypes[fileMatch[2].toLowerCase()],
  };
}

export function isTaskEvidenceKeyOwnedBy({
  userId,
  taskKey,
  key,
}: {
  userId: string;
  taskKey: ManualReviewTaskKey;
  key: string;
}): boolean {
  const parsed = parseTaskEvidenceKey(key);
  return parsed?.userId === userId && parsed.taskKey === taskKey;
}

export function isSealedTaskEvidenceKeyOwnedBy({
  userId,
  taskKey,
  key,
}: {
  userId: string;
  taskKey: ManualReviewTaskKey;
  key: string;
}): boolean {
  const parsed = parseTaskEvidenceKey(key, "task-evidence-sealed");
  return parsed?.userId === userId && parsed.taskKey === taskKey;
}

export function validateTaskEvidenceObject({
  userId,
  taskKey,
  key,
  object,
}: {
  userId: string;
  taskKey: ManualReviewTaskKey;
  key: string;
  object: TaskEvidenceObjectMetadata | null;
}): boolean {
  const parsed = parseTaskEvidenceKey(key);
  if (
    !parsed ||
    parsed.userId !== userId ||
    parsed.taskKey !== taskKey ||
    !object
  ) {
    return false;
  }

  return (
    object.contentType === parsed.contentType &&
    Number.isInteger(object.contentLength) &&
    (object.contentLength ?? 0) > 0 &&
    (object.contentLength ?? 0) <= MAX_TASK_EVIDENCE_BYTES
  );
}

function hasMatchingImageMagic(
  contentType: TaskEvidenceContentType,
  bytes: Uint8Array,
): boolean {
  if (contentType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (contentType === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return signature.every((byte, index) => bytes[index] === byte);
  }
  return (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

export async function verifyAndSealTaskEvidence({
  userId,
  taskKey,
  uploadKey,
  headObject,
  readHeader,
  copyObject,
  deleteObject,
  randomUUID,
}: {
  userId: string;
  taskKey: ManualReviewTaskKey;
  uploadKey: string;
  headObject: (key: string) => Promise<TaskEvidenceObjectMetadata | null>;
  readHeader: (key: string) => Promise<Uint8Array | null>;
  copyObject: (input: {
    sourceKey: string;
    destinationKey: string;
    sourceETag: string;
  }) => Promise<void>;
  deleteObject: (key: string) => Promise<void>;
  randomUUID?: () => string;
}): Promise<string | null> {
  const parsed = parseTaskEvidenceKey(uploadKey);
  if (!parsed || parsed.userId !== userId || parsed.taskKey !== taskKey) {
    return null;
  }

  try {
    const object = await headObject(uploadKey);
    if (
      !validateTaskEvidenceObject({
        userId,
        taskKey,
        key: uploadKey,
        object,
      }) ||
      !object?.eTag
    ) {
      return null;
    }

    const header = await readHeader(uploadKey);
    if (!header || !hasMatchingImageMagic(parsed.contentType, header)) {
      return null;
    }

    const destinationKey = buildSealedTaskEvidenceKey({
      userId,
      taskKey,
      contentType: parsed.contentType,
      randomUUID,
    });
    await copyObject({
      sourceKey: uploadKey,
      destinationKey,
      sourceETag: object.eTag,
    });
    await deleteObject(uploadKey);
    return destinationKey;
  } catch {
    return null;
  }
}
