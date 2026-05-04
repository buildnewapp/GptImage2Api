type BuildAdminImageUploadObjectKeyInput = {
  fileName: string;
  now?: Date;
  randomId?: () => string;
};

const ADMIN_IMAGE_UPLOAD_ROOT = "blogs";

function getFileExtension(fileName: string) {
  const cleaned = fileName.trim();
  const lastDotIndex = cleaned.lastIndexOf(".");

  if (lastDotIndex <= 0 || lastDotIndex === cleaned.length - 1) {
    return "";
  }

  return cleaned.slice(lastDotIndex + 1).toLowerCase();
}

function getSafeFileBaseName(fileName: string) {
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

  return normalized || "image";
}

function formatDateSegment(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}${month}${day}`;
}

function createRandomId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().slice(0, 8);
  }

  return Math.random().toString(36).slice(2, 10);
}

export function buildAdminImageUploadObjectKey({
  fileName,
  now = new Date(),
  randomId = createRandomId,
}: BuildAdminImageUploadObjectKeyInput) {
  const extension = getFileExtension(fileName);
  const safeBaseName = getSafeFileBaseName(fileName);
  const finalFileName = `${safeBaseName}-${randomId()}${extension ? `.${extension}` : ""}`;

  return `${ADMIN_IMAGE_UPLOAD_ROOT}/${formatDateSegment(now)}/${finalFileName}`;
}

export function isAdminUploadImageContentType(contentType: string) {
  return contentType.startsWith("image/");
}
