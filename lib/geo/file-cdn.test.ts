import assert from "node:assert/strict";
import test from "node:test";

import { normalizeGeoFileCdnUrls } from "@/lib/geo/file-cdn";

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
    process.env.GEO_FILE_CDN = originalGeoFileCdn;
  }
});
