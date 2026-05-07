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
  const gptTextToImage = options.find(
    (option) => option.value === "gpt-image-2::gpt-image-2-text-to-image",
  );

  assert.equal(seedanceFast?.familyLabel, "Seedance 2.0");
  assert.equal(seedanceFast?.label, "Seedance 2.0 Fast");
  assert.equal(seedanceVip?.label, "Seedance 2.0");
  assert.equal(gptTextToImage?.familyLabel, "GPT Image 2");
  assert.equal(gptTextToImage?.label, "Text to Image");
});
