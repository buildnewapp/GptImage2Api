import assert from "node:assert/strict";
import test from "node:test";

import { buildAiVideoModelPricingRows } from "@/components/home/video/ai-video-model-pricing-data";

test("buildAiVideoModelPricingRows includes dynamic AI video pricing rows", () => {
  const rows = buildAiVideoModelPricingRows({ locale: "en" });

  const seedanceDynamic = rows.find(
    (row) =>
      row.model === "Seedance 2.0" &&
      row.type === "Text/Image to Video" &&
      row.spec === "480p"
  );
  const seedanceVip1080p = rows.find(
    (row) =>
      row.model === "Seedance 2.0" &&
      row.type === "Text/Image to Video" &&
      row.spec === "1080p"
  );
  const seedanceFast1080p = rows.find(
    (row) =>
      row.model === "Seedance 2.0 Fast" &&
      row.type === "Text/Image to Video" &&
      row.spec === "1080p"
  );

  assert.ok(seedanceDynamic);
  assert.equal(seedanceDynamic.creditPrice, "19 credits/s");
  assert.equal(seedanceDynamic.billingNote, "Output seconds × 19");

  assert.ok(seedanceVip1080p);
  assert.equal(seedanceVip1080p.creditPrice, "102 credits/s");
  assert.equal(seedanceVip1080p.billingNote, "Output seconds × 102");
  assert.equal(seedanceFast1080p, undefined);

  const soraText = rows.find(
    (row) =>
      row.model === "Sora 2 Text to Video" &&
      row.creditPrice === "20 credits/s",
  );
  assert.ok(
    soraText,
    "runtime-priced Sora models should be rendered in the pricing table",
  );
});
