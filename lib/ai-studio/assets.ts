import { fetchExternalUrlToR2 } from "@/lib/cloudflare/r2-fetch-upload";
import { generateR2Key } from "@/lib/cloudflare/r2-utils";

const TRUTHY_ENV_VALUES = new Set(["1", "true", "yes", "on"]);

export function getAiStudioAssetDirectory(category: string) {
  switch (category) {
    case "video":
      return "video";
    case "image":
      return "image";
    case "music":
      return "audio";
    default:
      return "file";
  }
}

export function isAiStudioR2AutoUploadEnabled() {
  const raw = process.env.R2_FILE_AUTO_UPLOAD?.trim().toLowerCase();
  return raw ? TRUTHY_ENV_VALUES.has(raw) : false;
}

function normalizePublicUrl(url: string | null | undefined) {
  return url ? url.replace(/\/+$/, "") : null;
}

export function isAiStudioR2PublicUrl(url: string, r2PublicUrl: string | null | undefined) {
  const normalizedPublicUrl = normalizePublicUrl(r2PublicUrl);
  if (!normalizedPublicUrl) {
    return false;
  }

  return url === normalizedPublicUrl || url.startsWith(`${normalizedPublicUrl}/`);
}

export function hasNonR2AiStudioMediaUrls(
  mediaUrls: string[],
  r2PublicUrl: string | null | undefined = process.env.R2_PUBLIC_URL,
) {
  return mediaUrls.some((url) => !isAiStudioR2PublicUrl(url, r2PublicUrl));
}

function getUploadFileName(url: string, directory: string) {
  try {
    const parsed = new URL(url);
    const candidate = parsed.pathname.split("/").pop();
    return candidate && candidate.length > 0 ? candidate : `${directory}-asset`;
  } catch {
    return `${directory}-asset`;
  }
}

function getDatedPath(directory: string, now: Date) {
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${directory}/${year}/${month}/${day}`;
}

export async function persistAiStudioMediaUrls(input: {
  category: string;
  mediaUrls: string[];
  autoUploadEnabled?: boolean;
  r2PublicUrl?: string | null;
  now?: Date;
  uploadExternalUrl?: typeof fetchExternalUrlToR2;
}) {
  const autoUploadEnabled =
    input.autoUploadEnabled ?? isAiStudioR2AutoUploadEnabled();
  if (!autoUploadEnabled || input.mediaUrls.length === 0) {
    return input.mediaUrls;
  }

  const uploadExternalUrl = input.uploadExternalUrl ?? fetchExternalUrlToR2;
  const r2PublicUrl = input.r2PublicUrl ?? process.env.R2_PUBLIC_URL;
  const directory = getAiStudioAssetDirectory(input.category);
  const now = input.now ?? new Date();
  const datedPath = getDatedPath(directory, now);

  const persistedUrls = await Promise.all(
    input.mediaUrls.map(async (url) => {
      if (isAiStudioR2PublicUrl(url, r2PublicUrl)) {
        return url;
      }

      const key = generateR2Key({
        fileName: getUploadFileName(url, directory),
        path: datedPath,
      });
      try {
        const uploaded = await uploadExternalUrl(url, key);
        return uploaded.url;
      } catch (error) {
        console.warn("AI Studio media upload to R2 failed, fallback to source URL", {
          url,
          key,
          error,
        });
        return url;
      }
    }),
  );

  return persistedUrls;
}
