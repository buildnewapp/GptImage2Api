import assert from "node:assert/strict";
import test from "node:test";

import { buildAiVideoModelPricingRows } from "@/components/home/template2/ai-video-model-pricing-data";

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
      row.model === "Sora 2" &&
      row.type === "Text to Video" &&
      row.spec === "Standard-10.0s"
  );

  assert.ok(seedanceDynamic);
  assert.equal(seedanceDynamic.creditPrice, "19 credits/s");
  assert.equal(seedanceDynamic.billingNote, "Output seconds × 19");

  assert.ok(soraStatic);
  assert.equal(soraStatic.creditPrice, "10 credits");
  assert.equal(soraStatic.billingNote, "Fixed price by spec");
});
