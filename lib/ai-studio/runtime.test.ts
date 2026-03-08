import assert from "node:assert/strict";
import test from "node:test";

import {
  applyPricingRowToPayload,
  collectRuntimeModels,
  toBillableCredits,
} from "@/lib/ai-studio/runtime";

test("collects distinct runtime models from public pricing rows", () => {
  const models = collectRuntimeModels([
    {
      modelDescription: "Open AI sora 2, text-to-video, Standard-10.0s",
      interfaceType: "video",
      provider: "OpenAI",
      creditPrice: "30",
      creditUnit: "per video",
      usdPrice: "0.15",
      falPrice: "1.0",
      discountRate: 85,
      discountPrice: false,
      runtimeModel: "sora-2-text-to-video",
    },
    {
      modelDescription: "Open AI sora 2, text-to-video, stable-10.0s",
      interfaceType: "video",
      provider: "OpenAI",
      creditPrice: "35",
      creditUnit: "per video",
      usdPrice: "0.175",
      falPrice: "1.0",
      discountRate: 82.5,
      discountPrice: false,
      runtimeModel: "sora-2-text-to-video-stable",
    },
  ]);

  assert.deepEqual(models, [
    "sora-2-text-to-video",
    "sora-2-text-to-video-stable",
  ]);
});

test("applies the selected pricing row runtime model onto the payload", () => {
  const payload = applyPricingRowToPayload(
    {
      model: "sora-2-text-to-video",
      input: {
        n_frames: "10",
      },
    },
    {
      modelDescription: "Open AI sora 2, text-to-video, stable-10.0s",
      interfaceType: "video",
      provider: "OpenAI",
      creditPrice: "35",
      creditUnit: "per video",
      usdPrice: "0.175",
      falPrice: "1.0",
      discountRate: 82.5,
      discountPrice: false,
      runtimeModel: "sora-2-text-to-video-stable",
    },
  );

  assert.equal(payload.model, "sora-2-text-to-video-stable");
  assert.equal(payload.input?.n_frames, "10");
});

test("applies common duration hints from the pricing description", () => {
  const payload = applyPricingRowToPayload(
    {
      model: "runway-duration-5-generate",
      duration: 5,
      input: {
        n_frames: "10",
      },
    },
    {
      modelDescription: "Open AI sora 2, text-to-video, stable-15.0s",
      interfaceType: "video",
      provider: "OpenAI",
      creditPrice: "40",
      creditUnit: "per video",
      usdPrice: "0.2",
      falPrice: "1.0",
      discountRate: 80,
      discountPrice: false,
      runtimeModel: "sora-2-text-to-video-stable",
    },
  );

  assert.equal(payload.input?.n_frames, "15");
  assert.equal(payload.duration, 15);
});

test("rounds official decimal credit prices into billable whole credits", () => {
  assert.equal(toBillableCredits("35"), 35);
  assert.equal(toBillableCredits("87.5"), 88);
  assert.equal(toBillableCredits("0"), 0);
});
