import assert from "node:assert/strict";
import test from "node:test";

import {
  estimatePricingRow,
  extractTaskId,
  normalizeTaskState,
  resolveStatusEndpoint,
} from "@/lib/ai-studio/execute";

test("maps official doc urls to the expected status endpoints", () => {
  assert.equal(
    resolveStatusEndpoint({
      id: "image:nano-banana",
      category: "image",
      title: "Google - Nano Banana 2",
      docUrl: "https://docs.kie.ai/market/google/nanobanana2.md",
      provider: "Google",
      endpoint: "/api/v1/jobs/createTask",
      method: "POST",
      modelKeys: ["google/nano-banana-2"],
      requestSchema: null,
      examplePayload: {},
      pricingRows: [],
    }),
    "/api/v1/jobs/recordInfo",
  );

  assert.equal(
    resolveStatusEndpoint({
      id: "music:generate-music",
      category: "music",
      title: "Generate Music",
      docUrl: "https://docs.kie.ai/suno-api/generate-music.md",
      provider: "Suno",
      endpoint: "/api/v1/generate",
      method: "POST",
      modelKeys: ["V5"],
      requestSchema: null,
      examplePayload: {},
      pricingRows: [],
    }),
    "/api/v1/generate/record-info",
  );
});

test("extracts nested task identifiers from mixed response payloads", () => {
  assert.equal(extractTaskId({ data: { taskId: "task_123" } }), "task_123");
  assert.equal(extractTaskId({ result: { recordId: "record_456" } }), "record_456");
  assert.equal(extractTaskId({ message: "ok" }), null);
});

test("normalizes provider states into the ai studio polling states", () => {
  assert.equal(normalizeTaskState({ data: { state: "waiting" } }), "queued");
  assert.equal(normalizeTaskState({ data: { state: "generating" } }), "running");
  assert.equal(normalizeTaskState({ data: { state: "success" } }), "succeeded");
  assert.equal(normalizeTaskState({ data: { successFlag: 3 } }), "failed");
});

test("estimates the best pricing row from the active payload", () => {
  const row = estimatePricingRow(
    [
      {
        modelDescription: "Google nano banana 2, 1K",
        interfaceType: "image",
        provider: "Google",
        creditPrice: "8",
        creditUnit: "per image",
        usdPrice: "0.04",
        falPrice: "0.08",
        discountRate: 50,
        anchor: "https://kie.ai/nano-banana-2",
        discountPrice: false,
      },
      {
        modelDescription: "Google nano banana 2, 4K",
        interfaceType: "image",
        provider: "Google",
        creditPrice: "18",
        creditUnit: "per image",
        usdPrice: "0.09",
        falPrice: "0.16",
        discountRate: 43.75,
        anchor: "https://kie.ai/nano-banana-2",
        discountPrice: false,
      },
    ],
    {
      model: "google/nano-banana-2",
      input: {
        prompt: "A cinematic portrait",
        resolution: "4K",
      },
    },
  );

  assert.equal(row?.creditPrice, "18");
});

test("prefers the exact anchor model when multiple pricing rows share similar tokens", () => {
  const row = estimatePricingRow(
    [
      {
        modelDescription: "Open AI sora 2, text-to-video, stable-10.0s",
        interfaceType: "video",
        provider: "OpenAI",
        creditPrice: "35",
        creditUnit: "per video",
        usdPrice: "0.175",
        falPrice: "1.0",
        discountRate: 82.5,
        anchor: "https://kie.ai/sora-2?model=sora-2-text-to-video-stable",
        discountPrice: false,
      },
      {
        modelDescription: "Open AI sora 2, text-to-video, Standard-10.0s",
        interfaceType: "video",
        provider: "OpenAI",
        creditPrice: "30",
        creditUnit: "per video",
        usdPrice: "0.15",
        falPrice: "1.0",
        discountRate: 85,
        anchor: "https://kie.ai/sora-2?model=sora-2-text-to-video",
        discountPrice: false,
      },
    ],
    {
      model: "sora-2-text-to-video",
      input: {
        n_frames: "10",
      },
    },
  );

  assert.equal(row?.creditPrice, "30");
});
