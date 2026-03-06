import { serverUploadFile } from "@/lib/cloudflare/r2";
import { getDb } from "@/lib/db";
import { videoGenerations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const DEFAULT_EXTENSION = "bin";
const DEFAULT_CONTENT_TYPE = "application/octet-stream";
const inFlightAutoUploadMap = new Map<
  string,
  Promise<{ resultUrls: string[]; uploading: boolean }>
>();

const EXTENSION_TO_MIME: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  m4v: "video/mp4",
  avi: "video/x-msvideo",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  svg: "image/svg+xml",
  tiff: "image/tiff",
  tif: "image/tiff",
  heic: "image/heic",
  heif: "image/heif",
};

const MIME_TO_EXTENSION: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-msvideo": "avi",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/bmp": "bmp",
  "image/svg+xml": "svg",
  "image/tiff": "tiff",
  "image/heic": "heic",
  "image/heif": "heif",
};

function isAutoUploadEnabled() {
  return process.env.R2_FILE_AUTO_UPLOAD?.toLowerCase() === "true";
}

function getNormalizedPublicUrl() {
  const raw = process.env.R2_PUBLIC_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

function normalizeUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string");
}

function isUnderR2PublicDomain(url: string, normalizedPublicUrl: string) {
  try {
    const resourceUrl = new URL(url);
    const publicUrl = new URL(normalizedPublicUrl);
    if (resourceUrl.host === publicUrl.host) return true;
  } catch {
    // ignore invalid URL and fallback to prefix matching
  }
  return url.startsWith(`${normalizedPublicUrl}/`) || url === normalizedPublicUrl;
}

function formatDateSegment(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function getExtensionFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const lastSegment = pathname.split("/").filter(Boolean).pop();
    if (!lastSegment || !lastSegment.includes(".")) return null;
    const ext = lastSegment.split(".").pop()?.toLowerCase();
    if (!ext) return null;
    return ext.replace(/[^a-z0-9]/g, "") || null;
  } catch {
    return null;
  }
}

function normalizeContentType(contentType: string | null) {
  if (!contentType) return null;
  const [mime] = contentType.split(";");
  return mime?.trim().toLowerCase() || null;
}

function inferExtension(url: string, contentType: string | null) {
  return (
    getExtensionFromUrl(url) ||
    (contentType ? MIME_TO_EXTENSION[contentType] : undefined) ||
    DEFAULT_EXTENSION
  );
}

function inferContentType(ext: string, contentType: string | null) {
  return contentType || EXTENSION_TO_MIME[ext] || DEFAULT_CONTENT_TYPE;
}

async function uploadSingleResourceToR2({
  sourceUrl,
  generationId,
  dateSegment,
  index,
}: {
  sourceUrl: string;
  generationId: string;
  dateSegment: string;
  index: number;
}): Promise<string> {
  const response = await fetch(sourceUrl, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to download resource (${response.status}) from ${sourceUrl}`,
    );
  }

  const rawContentType = normalizeContentType(response.headers.get("content-type"));
  const ext = inferExtension(sourceUrl, rawContentType);
  const contentType = inferContentType(ext, rawContentType);
  const key = `ai/${dateSegment}/${generationId}${index > 0 ? `-${index + 1}` : ""}.${ext}`;

  const arrayBuffer = await response.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);

  const uploadResult = await serverUploadFile({
    data: fileBuffer,
    contentType,
    key,
  });

  return uploadResult.url;
}

export async function ensureVideoResultUrlsUploadedToR2(
  generationId: string,
  rawResultUrls: unknown,
): Promise<{ resultUrls: string[]; uploading: boolean }> {
  const resultUrls = normalizeUrls(rawResultUrls);
  const normalizedPublicUrl = getNormalizedPublicUrl();

  if (!isAutoUploadEnabled() || !normalizedPublicUrl || resultUrls.length === 0) {
    return {
      resultUrls,
      uploading: false,
    };
  }

  if (resultUrls.every((url) => isUnderR2PublicDomain(url, normalizedPublicUrl))) {
    return {
      resultUrls,
      uploading: false,
    };
  }

  const inFlight = inFlightAutoUploadMap.get(generationId);
  if (inFlight) {
    return {
      resultUrls,
      uploading: true,
    };
  }

  const uploadPromise = getDb().transaction(async (tx) => {
    const [lockedRecord] = await tx
      .select({
        id: videoGenerations.id,
        createdAt: videoGenerations.createdAt,
        resultUrls: videoGenerations.resultUrls,
      })
      .from(videoGenerations)
      .where(eq(videoGenerations.id, generationId))
      .for("update", { skipLocked: true });

    if (!lockedRecord) {
      return {
        resultUrls,
        uploading: true,
      };
    }

    const latestUrls = normalizeUrls(lockedRecord.resultUrls);
    if (latestUrls.length === 0) {
      return {
        resultUrls: latestUrls,
        uploading: false,
      };
    }

    if (
      latestUrls.every((url) =>
        isUnderR2PublicDomain(url, normalizedPublicUrl),
      )
    ) {
      return {
        resultUrls: latestUrls,
        uploading: false,
      };
    }

    const dateSegment = formatDateSegment(lockedRecord.createdAt ?? new Date());
    const uploadedUrls: string[] = [];

    for (const [index, url] of latestUrls.entries()) {
      if (isUnderR2PublicDomain(url, normalizedPublicUrl)) {
        uploadedUrls.push(url);
        continue;
      }

      const uploadedUrl = await uploadSingleResourceToR2({
        sourceUrl: url,
        generationId: lockedRecord.id,
        dateSegment,
        index,
      });
      uploadedUrls.push(uploadedUrl);
    }

    await tx
      .update(videoGenerations)
      .set({
        resultUrls: uploadedUrls,
      })
      .where(eq(videoGenerations.id, lockedRecord.id));

    return {
      resultUrls: uploadedUrls,
      uploading: false,
    };
  });

  inFlightAutoUploadMap.set(generationId, uploadPromise);
  try {
    return await uploadPromise;
  } finally {
    if (inFlightAutoUploadMap.get(generationId) === uploadPromise) {
      inFlightAutoUploadMap.delete(generationId);
    }
  }
}
