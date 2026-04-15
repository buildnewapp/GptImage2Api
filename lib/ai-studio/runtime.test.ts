import assert from "node:assert/strict";
import test from "node:test";

import {
  applyPricingRowToPayload,
  collectRuntimeModels,
  getDisplayModelLabel,
  guessPricingRow,
  getEstimatedCreditsForPricing,
  resolveSelectedPricing,
  resolvePublicModelId,
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

test("estimates total credits for per-second pricing rows from output duration", () => {
  const credits = getEstimatedCreditsForPricing(
    {
      creditPrice: "16",
      creditUnit: "per second",
    },
    {
      model: "wan/2-7-text-to-video",
      input: {
        duration: "5",
        resolution: "720p",
      },
    },
  );

  assert.equal(credits, 80);
});

test("estimates total credits for per-second pricing rows from uploaded media metadata", () => {
  const credits = getEstimatedCreditsForPricing(
    {
      creditPrice: "6",
      creditUnit: "per second",
    },
    {
      model: "kling-2.6/motion-control",
      input: {
        input_urls: ["https://example.com/subject.png"],
        video_urls: ["https://example.com/motion.mp4"],
        mode: "720p",
      },
      __local_reference_metadata: {
        videoDurationsByUrl: {
          "https://example.com/motion.mp4": 8,
        },
      },
    },
  );

  assert.equal(credits, 48);
});

test("estimates total credits for per-second pricing rows from uploaded audio metadata", () => {
  const credits = getEstimatedCreditsForPricing(
    {
      creditPrice: "8.0",
      creditUnit: "per second",
    },
    {
      model: "kling/ai-avatar-standard",
      input: {
        image_url: "https://example.com/avatar.png",
        audio_url: "https://example.com/voice.mp3",
      },
      __local_reference_metadata: {
        audioDurationsByUrl: {
          "https://example.com/voice.mp3": 12,
        },
      },
    },
  );

  assert.equal(credits, 96);
});

test("guesses pricing rows from structured duration hints instead of url noise", () => {
  const row = guessPricingRow(
    [
      {
        modelDescription: "Open AI sora 2, image-to-video, Standard-15.0s",
        interfaceType: "video",
        provider: "OpenAI",
        creditPrice: "35",
        creditUnit: "per video",
        usdPrice: "0.175",
        falPrice: "1.5",
        discountRate: 88.33,
        discountPrice: false,
        runtimeModel: "sora-2-image-to-video",
      },
      {
        modelDescription: "Open AI sora 2, image-to-video, Standard-10.0s",
        interfaceType: "video",
        provider: "OpenAI",
        creditPrice: "30",
        creditUnit: "per video",
        usdPrice: "0.15",
        falPrice: "1.0",
        discountRate: 85,
        discountPrice: false,
        runtimeModel: "sora-2-image-to-video",
      },
    ],
    {
      model: "sora-2-image-to-video",
      input: {
        n_frames: "10",
        image_urls: [
          "https://example.com/uploads/frame_15_reference.png",
        ],
      },
    },
  );

  assert.equal(row?.creditPrice, "30");
});

test("prefers audio-matching pricing rows when video models expose with-audio variants", () => {
  const row = guessPricingRow(
    [
      {
        modelDescription: "kling 2.6, text-to-video, without audio-5.0s",
        interfaceType: "video",
        provider: "Kling",
        creditPrice: "55.0",
        creditUnit: "per video",
        usdPrice: "",
        falPrice: "",
        discountRate: 0,
        discountPrice: false,
        runtimeModel: "kling-2.6/text-to-video",
      },
      {
        modelDescription: "kling 2.6, text-to-video, with audio-5.0s",
        interfaceType: "video",
        provider: "Kling",
        creditPrice: "110.0",
        creditUnit: "per video",
        usdPrice: "",
        falPrice: "",
        discountRate: 0,
        discountPrice: false,
        runtimeModel: "kling-2.6/text-to-video",
      },
    ],
    {
      model: "kling-2.6/text-to-video",
      input: {
        duration: "5",
        sound: true,
      },
    },
  );

  assert.equal(row?.creditPrice, "110.0");
});

test("resolves seedance 2 dynamic pricing even when no static pricing rows exist", () => {
  const row = resolveSelectedPricing<
    {
      modelDescription: string;
      interfaceType: string;
      provider: string;
      creditPrice: string;
      creditUnit: string;
      usdPrice: string;
      falPrice: string;
      discountRate: number;
      discountPrice: boolean;
      runtimeModel?: string | null;
    }
  >([], {
    modelId: "video:seedance-2-0",
    payload: {
      model: "seedance-2-0",
      resolution: "720p",
      duration: 5,
    },
  });

  assert.equal(row?.creditPrice, "205");
  assert.equal(row?.usdPrice, "");
  assert.equal(
    row?.modelDescription,
    "Seedance 2.0, text/image-to-video, 720p, 5s",
  );
});

test("uses the configured alias when rendering a single model key", () => {
  assert.equal(
    getDisplayModelLabel(
      {
        alias: "sdance-text-to-video",
        modelKeys: ["sora-2-text-to-video"],
      },
      "sora-2-text-to-video",
    ),
    "sdance-text-to-video",
  );
  assert.equal(
    getDisplayModelLabel(
      {
        alias: "sdance-text-to-video",
        modelKeys: ["sora-2-text-to-video"],
      },
      "other-model",
    ),
    "other-model",
  );
});

test("prefers the public detail id over a stale internal selected id", () => {
  assert.equal(
    resolvePublicModelId("video:sora2-text-to-video-standard", {
      id: "video:sdance-text-to-video",
    }),
    "video:sdance-text-to-video",
  );
  assert.equal(
    resolvePublicModelId("video:sdance-text-to-video", null),
    "video:sdance-text-to-video",
  );
});
