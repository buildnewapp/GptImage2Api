import assert from "node:assert/strict";
import test from "node:test";

import { listAiVideoStudioModelOptions } from "@/config/ai-video-studio";

test("uses version labels for mini studio model option display text", () => {
  const options = listAiVideoStudioModelOptions();
  const seedanceFast = options.find(
    (option) => option.value === "seedance-2.0::seedance-2.0-fast-vip",
  );
  const seedanceVip = options.find(
    (option) => option.value === "seedance-2.0::seedance-2.0-vip",
  );
  const wanImage = options.find(
    (option) => option.value === "wan-image::wan-2.7-image",
  );

  assert.equal(seedanceFast?.label, "Seedance 2.0 Fast");
  assert.equal(seedanceVip?.label, "Seedance 2.0");
  assert.equal(wanImage?.label, "Wan 2.7 Image (PRO)");
  assert.equal(wanImage?.levelLimit, "pro");
});
