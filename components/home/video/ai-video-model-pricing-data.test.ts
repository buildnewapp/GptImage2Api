import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAiVideoModelPricingGroups,
  buildAiVideoModelPricingRows,
} from "@/components/home/video/ai-video-model-pricing-data";

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

test("buildAiVideoModelPricingRows keeps AI video studio family order", () => {
  const rows = buildAiVideoModelPricingRows({ locale: "en" });

  assert.equal(rows[0]?.familyKey, "grok-imagine");
  assert.equal(rows[0]?.familyLabel, "Grok Imagine");
  assert.equal(rows[0]?.isSpecial, true);
  assert.equal(rows[0]?.model, "Grok Imagine Text to Video");
  assert.equal(rows[0]?.versionKey, "grok-imagine-text-to-video");
});

test("buildAiVideoModelPricingGroups aggregates rows by family", () => {
  const groups = buildAiVideoModelPricingGroups({ locale: "en" });

  assert.equal(groups[0]?.familyKey, "grok-imagine");
  assert.equal(groups[0]?.familyLabel, "Grok Imagine");
  assert.ok((groups[0]?.modelCount ?? 0) > 1);
  assert.match(groups[0]?.priceSummary ?? "", /credits/);
  assert.ok((groups[0]?.rows.length ?? 0) > 1);
  assert.equal(
    groups[0]?.rows.every((row) => row.familyKey === "grok-imagine"),
    true,
  );
});
