import { type PromptGalleryItem } from "@/lib/prompt-gallery-shared";

export function resolveMediaUrl(src: string) {
  if (!src) {
    return "";
  }

  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }

  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || "";
  return `${cdnUrl}${src}`;
}

export function inferResultMediaType(src: string): "image" | "video" {
  const normalized = src.split("?")[0].toLowerCase();

  if (
    normalized.endsWith(".png") ||
    normalized.endsWith(".jpg") ||
    normalized.endsWith(".jpeg") ||
    normalized.endsWith(".webp") ||
    normalized.endsWith(".gif") ||
    normalized.endsWith(".avif")
  ) {
    return "image";
  }

  return "video";
}

export function getPromptPreviewMedia(item: PromptGalleryItem) {
  if (item.coverUrl) {
    return {
      src: item.coverUrl,
      type: "image" as const,
    };
  }

  if (item.results.length > 0) {
    const src = item.results[0];
    return {
      src,
      type: inferResultMediaType(src),
    };
  }

  return null;
}
