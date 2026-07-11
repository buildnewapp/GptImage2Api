import assert from "node:assert/strict";
import test from "node:test";

import { normalizeGeoFileCdnUrls } from "@/lib/geo/file-cdn";

function restoreEnvValue(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

test("normalizes GEO file URLs to the configured CDN", () => {
  const originalGeoFileCdn = process.env.GEO_FILE_CDN;
  process.env.GEO_FILE_CDN = "https://r2.sdanceai.com/";

  try {
    assert.equal(
      normalizeGeoFileCdnUrls(
        "https://s3.autogeoflow.com/image/2026/05/31/1780219981713-7byvoo.png",
      ),
      "https://r2.sdanceai.com/image/2026/05/31/1780219981713-7byvoo.png",
    );
    assert.equal(
      normalizeGeoFileCdnUrls(
        "![cover](https://s3.autogeoflow.com/image/2026/05/31/1780219981713-7byvoo.png)",
      ),
      "![cover](https://r2.sdanceai.com/image/2026/05/31/1780219981713-7byvoo.png)",
    );
    assert.equal(
      normalizeGeoFileCdnUrls("https://example.com/image.png"),
      "https://example.com/image.png",
    );
  } finally {
    restoreEnvValue("GEO_FILE_CDN", originalGeoFileCdn);
  }
});

test("applies image width when normalizing a single GEO file URL", () => {
  const originalGeoFileCdn = process.env.GEO_FILE_CDN;
  process.env.GEO_FILE_CDN = "https://r2.sdanceai.com/";

  try {
    assert.equal(
      normalizeGeoFileCdnUrls(
        "https://s3.autogeoflow.com/image/2026/05/31/1780219981713-7byvoo.png?fit=cover",
        500,
      ),
      "https://r2.sdanceai.com/image/2026/05/31/1780219981713-7byvoo.png?fit=cover&w=500",
    );
  } finally {
    restoreEnvValue("GEO_FILE_CDN", originalGeoFileCdn);
  }
});
