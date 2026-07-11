const GEO_FILE_SOURCE_ORIGIN = "https://s3.autogeoflow.com";

function applyImageWidthParam(value: string, width: number) {
  try {
    const url = new URL(value);
    url.searchParams.set("w", String(width));
    return url.toString();
  } catch {
    const separator = value.includes("?") ? "&" : "?";
    return `${value}${separator}w=${width}`;
  }
}

export function normalizeGeoFileCdnUrls(
  value: string | null | undefined,
  width: number | null = null,
) {
  const text = value ?? "";
  const fileCdn = process.env.GEO_FILE_CDN?.trim().replace(/\/+$/, "");
  const normalized = fileCdn
    ? text.replaceAll(GEO_FILE_SOURCE_ORIGIN, fileCdn)
    : text;

  if (width && normalized) {
    return applyImageWidthParam(normalized, width);
  }

  return normalized;
}
