import assert from "node:assert/strict";
import test from "node:test";

import { buildAiVideoModelPricingRows } from "@/components/home/video/ai-video-model-pricing-data";

test("buildAiVideoModelPricingRows includes dynamic and static AI video pricing rows", () => {
  const rows = buildAiVideoModelPricingRows({ locale: "en" });

  const seedanceDynamic = rows.find(
    (row) =>
      row.model === "Seedance 2.0" &&
      row.type === "Text/Image to Video" &&
      row.spec === "480p"
  );
  const soraStatic = rows.find(
    (row) =>
      row.model === "Sora 2 Text to Video" &&
      row.type === "10s" &&
      row.spec === "with audio, no watermark"
  );
  const soraImageStatic = rows.find(
    (row) =>
      row.model === "Sora 2 Image to Video" &&
      row.type === "10s" &&
      row.spec === "with audio, no watermark"
  );
  const wanStaticRate = rows.find(
    (row) =>
      row.model === "Wan 2.7 Text to Video" &&
      row.type === "720p" &&
      row.spec === "-"
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

  assert.ok(soraStatic);
  assert.equal(soraStatic.creditPrice, "3 credits");
  assert.equal(soraStatic.billingNote, "Fixed price by spec");

  assert.ok(soraImageStatic);
  assert.equal(soraImageStatic.creditPrice, "3 credits");
  assert.equal(soraImageStatic.billingNote, "Fixed price by spec");

  assert.ok(wanStaticRate);
  assert.equal(wanStaticRate.creditPrice, "16 credits/s");
  assert.equal(wanStaticRate.billingNote, "Output seconds × 16");
});
