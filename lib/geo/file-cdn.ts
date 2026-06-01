const GEO_FILE_SOURCE_ORIGIN = "https://s3.autogeoflow.com";

export function normalizeGeoFileCdnUrls(value: string | null | undefined) {
  const text = value ?? "";
  const fileCdn = process.env.GEO_FILE_CDN?.trim().replace(/\/+$/, "");

  if (!fileCdn) {
    return text;
  }

  return text.replaceAll(GEO_FILE_SOURCE_ORIGIN, fileCdn);
}
