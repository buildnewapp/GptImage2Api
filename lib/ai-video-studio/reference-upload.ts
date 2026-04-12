export type ReferenceUploadKind = "image" | "video" | "audio";

type BuildReferenceUploadObjectKeyInput = {
  kind: ReferenceUploadKind;
  fileName: string;
  now?: Date;
  randomId?: () => string;
};

const REFERENCE_UPLOAD_PATHS: Record<ReferenceUploadKind, string> = {
  image: "reference-images",
  video: "reference-videos",
  audio: "reference-audios",
};

function getFileExtension(fileName: string) {
  const cleaned = fileName.trim();
  const lastDotIndex = cleaned.lastIndexOf(".");

  if (lastDotIndex <= 0 || lastDotIndex === cleaned.length - 1) {
    return "";
  }

  return cleaned.slice(lastDotIndex + 1).toLowerCase();
}

function getFileBaseName(fileName: string) {
  const cleaned = fileName.trim();
  const extension = getFileExtension(cleaned);
  const baseName = extension
    ? cleaned.slice(0, -(extension.length + 1))
    : cleaned;

  const normalized = baseName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "file";
}

function formatDateSegment(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}${month}${day}`;
}

function createRandomId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().slice(0, 8);
  }

  return Math.random().toString(36).slice(2, 10);
}

export function isReferenceUploadKind(value: string): value is ReferenceUploadKind {
  return value === "image" || value === "video" || value === "audio";
}

export function buildReferenceUploadObjectKey({
  kind,
  fileName,
  now = new Date(),
  randomId = createRandomId,
}: BuildReferenceUploadObjectKeyInput) {
  const extension = getFileExtension(fileName);
  const safeBaseName = getFileBaseName(fileName);
  const finalFileName = `${safeBaseName}-${randomId()}${extension ? `.${extension}` : ""}`;

  return `${REFERENCE_UPLOAD_PATHS[kind]}/${formatDateSegment(now)}/${finalFileName}`;
}

export async function uploadReferenceFile(input: {
  kind: ReferenceUploadKind;
  file: File;
  endpoint?: string;
}) {
  const body = new FormData();
  body.set("kind", input.kind);
  body.set("file", input.file);

  const response = await fetch(
    input.endpoint ?? "/api/ai-studio/reference-upload",
    {
      method: "POST",
      body,
    },
  );

  const json = await response.json() as {
    success?: boolean;
    data?: {
      key?: string;
      publicObjectUrl?: string;
    };
    error?: string;
  };

  if (!response.ok || !json.success || !json.data?.publicObjectUrl) {
    throw new Error(json.error || "Failed to upload reference file.");
  }

  return json.data.publicObjectUrl;
}
