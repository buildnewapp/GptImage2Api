const RENDERABLE_ASSET_EXTENSIONS = new Set([
  "aac",
  "aif",
  "aiff",
  "apng",
  "avif",
  "avi",
  "bmp",
  "flac",
  "gif",
  "heic",
  "heif",
  "ico",
  "jpeg",
  "jpg",
  "m4a",
  "m4v",
  "mkv",
  "mov",
  "mp3",
  "mp4",
  "mpeg",
  "mpg",
  "oga",
  "ogg",
  "ogv",
  "opus",
  "png",
  "svg",
  "tif",
  "tiff",
  "wav",
  "webm",
  "webp",
]);

export function isRenderableAssetUrl(value: string) {
  if (!/^https?:\/\//i.test(value)) {
    return false;
  }

  try {
    const url = new URL(value);
    const extension = url.pathname.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];

    return typeof extension === "string" &&
      RENDERABLE_ASSET_EXTENSIONS.has(extension);
  } catch {
    return false;
  }
}
