import assert from "node:assert/strict";
import test from "node:test";

import { listAiVideoStudioModelOptions } from "@/config/ai-video-studio";

test("uses version labels for mini studio model option display text", () => {
  const options = listAiVideoStudioModelOptions();
  const seedanceFast = options.find(
    (option) => option.value === "seedance-2.0::seedance-2.0-fast",
  );
  const seedanceVip = options.find(
    (option) => option.value === "seedance-2.0::seedance-2.0-vip",
  );

  assert.equal(seedanceFast?.label, "Seedance 2.0 fast");
  assert.equal(seedanceVip?.label, "Seedance 2.0 VIP");
});
